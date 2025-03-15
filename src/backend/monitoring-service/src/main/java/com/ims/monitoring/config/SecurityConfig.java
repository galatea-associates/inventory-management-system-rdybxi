package com.ims.monitoring.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.List;

/**
 * Configuration class for security settings in the Monitoring Service.
 * Configures JWT-based authentication, role-based authorization, CORS, and other security features.
 */
@Configuration
@EnableWebSecurity
@Slf4j
public class SecurityConfig {

    /**
     * Array of public endpoints that do not require authentication
     */
    private static final String[] PUBLIC_ENDPOINTS = {
        "/actuator/health", 
        "/actuator/info", 
        "/actuator/prometheus", 
        "/api/v1/health/liveness", 
        "/api/v1/health/readiness", 
        "/api/v1/health/status", 
        "/api/v1/metrics/prometheus"
    };

    /**
     * The issuer URI for JWT tokens
     */
    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String jwtIssuerUri;

    /**
     * The expected audience for JWT tokens
     */
    @Value("${spring.security.oauth2.resourceserver.jwt.audience}")
    private String jwtAudience;

    /**
     * List of allowed origins for CORS
     */
    @Value("${spring.cors.allowed-origins}")
    private List<String> allowedOrigins;

    /**
     * List of allowed HTTP methods for CORS
     */
    @Value("${spring.cors.allowed-methods}")
    private List<String> allowedMethods;

    /**
     * List of allowed headers for CORS
     */
    @Value("${spring.cors.allowed-headers}")
    private List<String> allowedHeaders;

    /**
     * Flag to allow credentials for CORS
     */
    @Value("${spring.cors.allow-credentials}")
    private Boolean allowCredentials;

    /**
     * Max age for CORS preflight requests
     */
    @Value("${spring.cors.max-age}")
    private Long maxAge;

    /**
     * Constructor for SecurityConfig
     */
    public SecurityConfig() {
        log.info("Initializing security configuration for Monitoring Service");
    }

    /**
     * Configures the security filter chain for the application
     *
     * @param http the HttpSecurity to configure
     * @return the configured SecurityFilterChain
     * @throws Exception if an error occurs during configuration
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF protection for REST API
            .csrf().disable()
            // Configure CORS
            .cors().configurationSource(corsConfigurationSource()).and()
            // Configure session management to STATELESS
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS).and()
            // Configure authorization for API endpoints
            .authorizeHttpRequests(authorize -> authorize
                // Allow public access to actuator endpoints and basic health/metrics endpoints
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                // Require MONITORING_ADMIN role for threshold management endpoints
                .requestMatchers("/api/v1/metrics/thresholds/**").hasRole("MONITORING_ADMIN")
                // Require MONITORING_ADMIN role for custom metrics endpoints
                .requestMatchers("/api/v1/metrics/custom").hasRole("MONITORING_ADMIN")
                // Require MONITORING_USER role for other metrics endpoints
                .requestMatchers("/api/v1/metrics/**").hasRole("MONITORING_USER")
                // Require MONITORING_USER role for other health endpoints
                .requestMatchers("/api/v1/health/**").hasRole("MONITORING_USER")
                // All other requests must be authenticated
                .anyRequest().authenticated()
            )
            // Configure OAuth2 resource server with JWT
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );

        return http.build();
    }

    /**
     * Configures CORS settings for the application
     *
     * @return the CORS configuration source
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(allowedMethods);
        configuration.setAllowedHeaders(allowedHeaders);
        configuration.setAllowCredentials(allowCredentials);
        configuration.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Configures JWT decoder with appropriate validation
     *
     * @return the configured JWT decoder
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        // Create the JWT decoder using the issuer URI
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withIssuerLocation(jwtIssuerUri).build();

        // Create validators
        JwtTimestampValidator timestampValidator = new JwtTimestampValidator();
        JwtIssuerValidator issuerValidator = new JwtIssuerValidator(jwtIssuerUri);
        JwtClaimValidator<String> audienceValidator = new JwtClaimValidator<>("aud", aud -> aud != null && aud.equals(jwtAudience));

        // Combine validators
        DelegatingOAuth2TokenValidator<?> validator = new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefault(),
            timestampValidator,
            issuerValidator,
            audienceValidator
        );

        jwtDecoder.setJwtValidator(validator);
        return jwtDecoder;
    }

    /**
     * Configures JWT authentication converter to extract roles from JWT claims
     *
     * @return the configured JWT authentication converter
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        
        // Configure to extract authorities from 'roles' claim
        converter.setPrincipalClaimName("sub");
        
        // Configure authority prefix 'ROLE_'
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("roles");
        authoritiesConverter.setAuthorityPrefix("ROLE_");
        
        converter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
        
        return converter;
    }
}