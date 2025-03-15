package com.ims.websocket.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Configuration class that defines the security settings for the WebSocket Service in the
 * Inventory Management System. This class configures Spring Security with JWT-based
 * authentication, CORS settings, and security controls specific to WebSocket connections.
 * It works in tandem with WebSocketConfig to provide comprehensive security across
 * both HTTP requests and WebSocket connections.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private static final List<String> ALLOWED_ORIGINS = Arrays.asList("http://localhost:3000", "https://ims.example.com");
    private static final List<String> ALLOWED_METHODS = Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS");
    private static final List<String> ALLOWED_HEADERS = Arrays.asList("Authorization", "Content-Type", "X-Requested-With", 
            "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", "X-Correlation-ID");
    private static final List<String> EXPOSED_HEADERS = Arrays.asList("Access-Control-Allow-Origin", "Access-Control-Allow-Methods", 
            "Access-Control-Allow-Headers", "Access-Control-Max-Age", "Access-Control-Expose-Headers", "X-Correlation-ID");
    private static final long MAX_AGE = 3600L;
    private static final String[] PUBLIC_ENDPOINTS = {"/actuator/health", "/actuator/info"};

    private final JwtDecoder jwtDecoder;
    private final WebSocketConfig webSocketConfig;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String jwtIssuerUri;

    @Value("${spring.security.oauth2.resourceserver.jwt.audience}")
    private String jwtAudience;

    /**
     * Constructor that initializes the configuration with required dependencies
     *
     * @param jwtDecoder JWT decoder for validating and processing JWT tokens
     * @param webSocketConfig WebSocket configuration for accessing security interceptors
     */
    public SecurityConfig(JwtDecoder jwtDecoder, WebSocketConfig webSocketConfig) {
        this.jwtDecoder = jwtDecoder;
        this.webSocketConfig = webSocketConfig;
        log.info("Security configuration initialized with JWT issuer: {}", jwtIssuerUri);
    }

    /**
     * Configures the security filter chain for HTTP requests
     *
     * @param http The HttpSecurity to configure
     * @return The configured security filter chain
     * @throws Exception if an error occurs during configuration
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF as we're using stateless JWT authentication
            .csrf(AbstractHttpConfigurer::disable)
            // Configure CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Configure session management to be stateless
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Configure authorization rules
            .authorizeHttpRequests(authorize -> authorize
                // Allow public access to health and info endpoints
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            // Configure OAuth2 resource server with JWT
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder)
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            // Configure exception handling
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                .accessDeniedHandler(new BearerTokenAccessDeniedHandler())
            );

        log.debug("Security filter chain configured with JWT authentication and CORS");
        return http.build();
    }

    /**
     * Creates a CORS configuration source bean for handling Cross-Origin Resource Sharing
     *
     * @return Configured CORS configuration source
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(ALLOWED_ORIGINS);
        configuration.setAllowedMethods(ALLOWED_METHODS);
        configuration.setAllowedHeaders(ALLOWED_HEADERS);
        configuration.setExposedHeaders(EXPOSED_HEADERS);
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(MAX_AGE);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        log.debug("CORS configuration configured with allowed origins: {}", ALLOWED_ORIGINS);
        return source;
    }

    /**
     * Creates a JWT authentication converter bean for extracting authorities from JWT tokens
     *
     * @return Configured JWT authentication converter
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        // Extract authorities from the 'roles' claim in the JWT
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            List<String> roles = jwt.getClaimAsStringList("roles");
            if (roles == null || roles.isEmpty()) {
                return List.of();
            }
            
            // Convert roles to Spring Security GrantedAuthority objects with 'ROLE_' prefix
            return roles.stream()
                    .map(role -> "ROLE_" + role)
                    .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                    .map(authority -> (org.springframework.security.core.GrantedAuthority) authority)
                    .toList();
        });
        
        log.debug("JWT authentication converter configured to extract roles from tokens");
        return converter;
    }
}