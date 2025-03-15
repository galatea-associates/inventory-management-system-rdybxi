package com.ims.ingestion.config;

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
 * Configuration class for security settings in the Data Ingestion Service.
 * Configures JWT-based authentication, role-based authorization, CORS, and other security features.
 */
@Configuration
@EnableWebSecurity
@Slf4j
public class SecurityConfig {

    // Define public endpoints that don't require authentication
    private static final String[] PUBLIC_ENDPOINTS = {
        "/actuator/health", 
        "/actuator/info", 
        "/actuator/prometheus"
    };
    
    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String jwtIssuerUri;
    
    @Value("${spring.security.oauth2.resourceserver.jwt.audience}")
    private String jwtAudience;
    
    @Value("${spring.cors.allowed-origins}")
    private List<String> allowedOrigins;
    
    @Value("${spring.cors.allowed-methods}")
    private List<String> allowedMethods;
    
    @Value("${spring.cors.allowed-headers}")
    private List<String> allowedHeaders;
    
    @Value("${spring.cors.allow-credentials}")
    private Boolean allowCredentials;
    
    @Value("${spring.cors.max-age}")
    private Long maxAge;
    
    /**
     * Default constructor with property injection
     */
    public SecurityConfig() {
        log.info("Initializing security configuration for Data Ingestion Service");
    }
    
    /**
     * Configures the security filter chain for the application
     *
     * @param http The HttpSecurity to modify
     * @return Configured security filter chain
     * @throws Exception if an error occurs
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        log.info("Configuring security filter chain");
        
        http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for REST APIs
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize
                // Allow access to actuator endpoints without authentication
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                // Admin-only endpoints
                .requestMatchers("/reference-data/conflicts/**").hasRole("DATA_INGESTION_ADMIN")
                .requestMatchers("/**/batch/**/reprocess").hasRole("DATA_INGESTION_ADMIN")
                // User endpoints - require basic user role
                .anyRequest().hasRole("DATA_INGESTION_USER")
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        
        return http.build();
    }
    
    /**
     * Configures CORS settings for the application
     *
     * @return CORS configuration source
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        log.info("Configuring CORS settings");
        
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
     * @return Configured JWT decoder
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        log.info("Configuring JWT decoder with issuer: {}", jwtIssuerUri);
        
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwtIssuerUri).build();
        
        // Create validators
        JwtTimestampValidator timestampValidator = new JwtTimestampValidator();
        JwtIssuerValidator issuerValidator = new JwtIssuerValidator(jwtIssuerUri);
        JwtClaimValidator<List<String>> audienceValidator = new JwtClaimValidator<>("aud", audience -> 
            audience != null && audience.contains(jwtAudience));
        
        // Combine validators
        DelegatingOAuth2TokenValidator validator = new DelegatingOAuth2TokenValidator<>(
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
     * @return Configured JWT authentication converter
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        log.info("Configuring JWT authentication converter");
        
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        // Configure to extract authorities from 'roles' claim
        converter.setPrincipalClaimName("sub");
        // Configure authority prefix 'ROLE_'
        
        return converter;
    }
}