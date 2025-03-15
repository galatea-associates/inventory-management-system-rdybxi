package com.ims.auth.config;

import com.ims.auth.service.UserService;
import com.ims.auth.service.TokenService;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.List;

/**
 * Configuration class that defines Spring Security settings for the Authentication Service in the Inventory Management System.
 * Implements comprehensive security controls including authentication providers, password policies, session management,
 * CORS/CSRF protection, and security filter chains.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private static final int BCRYPT_STRENGTH = 12;
    
    private static final String[] PERMITTED_URLS = {
        "/api/auth/login", 
        "/api/auth/refresh", 
        "/api/auth/forgot-password", 
        "/api/auth/reset-password",
        "/actuator/health", 
        "/actuator/info"
    };

    private final UserService userService;
    private final TokenService tokenService;

    /**
     * Creates a password encoder bean for secure password hashing
     *
     * @return BCrypt password encoder with configured strength
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
    }

    /**
     * Creates an authentication provider bean for username/password authentication
     *
     * @return DAO authentication provider configured with user service and password encoder
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Creates an authentication manager bean for processing authentication requests
     *
     * @param config Authentication configuration
     * @return Authentication manager from the configuration
     * @throws Exception if an error occurs
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Creates an authentication success handler bean
     *
     * @return Handler for successful authentication
     */
    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler() {
        return (request, response, authentication) -> {
            // Extract username from authentication
            String username = authentication.getName();
            
            // Update user login status
            userService.handleLoginSuccess(username);
            
            // Generate tokens
            String accessToken = tokenService.generateAccessToken(username, request);
            String refreshToken = tokenService.generateRefreshToken(username, request);
            
            // Return tokens in response
            response.setContentType("application/json");
            response.getWriter().write(String.format(
                "{\"access_token\":\"%s\",\"refresh_token\":\"%s\",\"token_type\":\"Bearer\"}",
                accessToken, refreshToken
            ));
        };
    }

    /**
     * Creates an authentication failure handler bean
     *
     * @return Handler for failed authentication
     */
    @Bean
    public AuthenticationFailureHandler authenticationFailureHandler() {
        return (request, response, exception) -> {
            // Extract username from request
            String username = request.getParameter("username");
            
            // Update failed login attempts
            if (username != null && !username.isBlank()) {
                userService.handleLoginFailure(username);
            }
            
            // Return error response
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(String.format(
                "{\"error\":\"Authentication failed\",\"message\":\"%s\",\"timestamp\":\"%s\"}",
                exception.getMessage(), new java.util.Date().toString()
            ));
        };
    }

    /**
     * Creates a logout success handler bean
     *
     * @return Handler for successful logout
     */
    @Bean
    public LogoutSuccessHandler logoutSuccessHandler() {
        return (request, response, authentication) -> {
            // Extract token from request
            String token = extractTokenFromRequest(request);
            
            // Revoke token
            if (token != null && !token.isBlank()) {
                tokenService.revokeToken(token);
            }
            
            // Return success response
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json");
            response.getWriter().write(String.format(
                "{\"message\":\"Logged out successfully\",\"timestamp\":\"%s\"}",
                new java.util.Date().toString()
            ));
        };
    }

    /**
     * Creates a CORS configuration source bean
     *
     * @return CORS configuration source with allowed origins, methods, and headers
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000", "https://app.inventory-management-system.com"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Configures the security filter chain for HTTP security
     *
     * @param http HTTP security configuration
     * @return Configured security filter chain
     * @throws Exception if an error occurs
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF protection for REST API
            .csrf(AbstractHttpConfigurer::disable)
            
            // Configure CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // Configure session management
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // Configure exception handling
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(new CustomAuthenticationEntryPoint())
                .accessDeniedHandler(new CustomAccessDeniedHandler())
            )
            
            // Configure authorization rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PERMITTED_URLS).permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            
            // Configure form login
            .formLogin(form -> form
                .loginProcessingUrl("/api/auth/login")
                .successHandler(authenticationSuccessHandler())
                .failureHandler(authenticationFailureHandler())
            )
            
            // Configure logout
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler(logoutSuccessHandler())
                .invalidateHttpSession(true)
                .clearAuthentication(true)
            );
            
        return http.build();
    }

    /**
     * Extracts JWT token from request
     *
     * @param request The HTTP request
     * @return The extracted token or null if not found
     */
    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}

/**
 * Custom authentication entry point that handles unauthorized access attempts
 */
@Component
class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {
    
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) 
            throws IOException, ServletException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write(String.format(
            "{\"error\":\"Unauthorized\",\"message\":\"%s\",\"timestamp\":\"%s\"}",
            authException.getMessage(), new java.util.Date().toString()
        ));
    }
}

/**
 * Custom access denied handler that handles forbidden access attempts
 */
@Component
class CustomAccessDeniedHandler implements AccessDeniedHandler {
    
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) 
            throws IOException, ServletException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write(String.format(
            "{\"error\":\"Forbidden\",\"message\":\"%s\",\"timestamp\":\"%s\"}",
            accessDeniedException.getMessage(), new java.util.Date().toString()
        ));
    }
}