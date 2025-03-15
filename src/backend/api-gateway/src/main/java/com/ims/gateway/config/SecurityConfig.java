package com.ims.gateway.config;

import com.ims.gateway.filter.AuthenticationFilter;
import com.ims.gateway.filter.RateLimitingFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.server.header.XFrameOptionsServerHttpHeadersWriter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Configuration class that defines the security settings for the API Gateway in the Inventory Management System.
 * Configures Spring Cloud Gateway security with JWT-based authentication, CORS settings, rate limiting,
 * and comprehensive security controls.
 */
@Configuration
@EnableWebFluxSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private static final List<String> ALLOWED_ORIGINS = Collections.unmodifiableList(
            Arrays.asList("http://localhost:3000", "https://ims.example.com"));
    
    private static final List<String> ALLOWED_METHODS = Collections.unmodifiableList(
            Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    
    private static final List<String> ALLOWED_HEADERS = Collections.unmodifiableList(
            Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", 
                    "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", 
                    "X-Correlation-ID"));
    
    private static final List<String> EXPOSED_HEADERS = Collections.unmodifiableList(
            Arrays.asList("Access-Control-Allow-Origin", "Access-Control-Allow-Methods", 
                    "Access-Control-Allow-Headers", "Access-Control-Max-Age", 
                    "Access-Control-Expose-Headers", "X-Correlation-ID"));
    
    private static final long MAX_AGE = 3600L;
    
    private static final List<String> PUBLIC_PATHS = Arrays.asList(
            "/api/v1/auth/login", 
            "/api/v1/auth/refresh", 
            "/api/v1/auth/forgot-password", 
            "/api/v1/auth/reset-password",
            "/actuator/health", 
            "/actuator/info");
    
    private final Environment environment;
    private final AuthenticationFilter authenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;

    /**
     * Configures the security web filter chain for the API Gateway
     *
     * @param http the ServerHttpSecurity to configure
     * @return the configured security web filter chain
     */
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                // Disable CSRF for the API Gateway as we're using stateless JWT authentication
                .csrf().disable()
                
                // Configure authorization
                .authorizeExchange()
                
                // Public paths that don't require authentication
                .pathMatchers(PUBLIC_PATHS.toArray(new String[0])).permitAll()
                
                // All other paths require authentication
                .anyExchange().authenticated()
                .and()
                
                // Configure security headers
                .headers()
                    .frameOptions().mode(XFrameOptionsServerHttpHeadersWriter.Mode.DENY)
                    .contentSecurityPolicy("default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';")
                    .and()
                    .referrerPolicy().policy("strict-origin-when-cross-origin")
                    .and()
                    .contentTypeOptions().and()
                    .xssProtection().and()
                    .cache().disable()
                .and()
                
                // Configure stateless session management (we're using JWT)
                .formLogin().disable()
                .httpBasic().disable()
                .logout().disable()
                
                // Build the security web filter chain
                .build();
    }

    /**
     * Creates a CORS filter bean for handling Cross-Origin Resource Sharing
     *
     * @return configured CORS web filter
     */
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        corsConfig.setAllowedOrigins(ALLOWED_ORIGINS);
        corsConfig.setAllowedMethods(ALLOWED_METHODS);
        corsConfig.setAllowedHeaders(ALLOWED_HEADERS);
        corsConfig.setExposedHeaders(EXPOSED_HEADERS);
        corsConfig.setAllowCredentials(true);
        corsConfig.setMaxAge(MAX_AGE);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }

    /**
     * Checks if the given path is a public path that doesn't require authentication
     *
     * @param path the path to check
     * @return true if the path is public, false otherwise
     */
    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }
}