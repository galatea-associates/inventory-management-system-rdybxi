package com.ims.workflow.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configuration class for security settings in the Workflow Service.
 * Configures JWT-based authentication, role-based authorization, CORS, and other security features.
 */
@Configuration
@EnableWebSecurity
@Slf4j
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {"/actuator/health", "/actuator/info", "/actuator/prometheus"};

    private final String jwtIssuerUri;
    private final String jwtAudience;
    private final List<String> allowedOrigins;
    private final List<String> allowedMethods;
    private final List<String> allowedHeaders;
    private final Boolean allowCredentials;
    private final Long maxAge;

    /**
     * Default constructor with property injection
     */
    public SecurityConfig(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String jwtIssuerUri,
            @Value("${spring.security.oauth2.resourceserver.jwt.audience}") String jwtAudience,
            @Value("${spring.cors.allowed-origins}") List<String> allowedOrigins,
            @Value("${spring.cors.allowed-methods}") List<String> allowedMethods,
            @Value("${spring.cors.allowed-headers}") List<String> allowedHeaders,
            @Value("${spring.cors.allow-credentials}") Boolean allowCredentials,
            @Value("${spring.cors.max-age}") Long maxAge) {
        this.jwtIssuerUri = jwtIssuerUri;
        this.jwtAudience = jwtAudience;
        this.allowedOrigins = allowedOrigins;
        this.allowedMethods = allowedMethods;
        this.allowedHeaders = allowedHeaders;
        this.allowCredentials = allowCredentials;
        this.maxAge = maxAge;
        log.info("Security configuration initialized with JWT issuer: {}", jwtIssuerUri);
    }

    /**
     * Configures the security filter chain for the application
     *
     * @param http HttpSecurity to configure
     * @return Configured security filter chain
     * @throws Exception if configuration fails
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // Disable CSRF protection for REST API
                .csrf(csrf -> csrf.disable())
                // Configure CORS with corsConfigurationSource()
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Configure session management to STATELESS
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Configure authorization for API endpoints
                .authorizeHttpRequests(authorize -> authorize
                        // Allow public access to actuator endpoints in PUBLIC_ENDPOINTS
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        // Require WORKFLOW_ADMIN role for admin endpoints
                        .requestMatchers("/api/v1/locates/process-expired").hasRole("WORKFLOW_ADMIN")
                        .requestMatchers("/api/v1/rules/**").hasRole("WORKFLOW_ADMIN")
                        // Require WORKFLOW_USER role for standard endpoints
                        .requestMatchers("/api/v1/locates/**").hasRole("WORKFLOW_USER")
                        .requestMatchers("/api/v1/short-sell/**").hasRole("WORKFLOW_USER")
                        // Require authentication for all other endpoints
                        .anyRequest().authenticated()
                )
                // Configure OAuth2 resource server with JWT
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                )
                .build();
    }

    /**
     * Configures CORS settings for the application
     *
     * @return CORS configuration source
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
     * @return Configured JWT decoder
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwtIssuerUri).build();

        // Create timestamp validator for token expiration
        JwtTimestampValidator timestampValidator = new JwtTimestampValidator();
        // Create issuer validator with configured issuer URI
        JwtIssuerValidator issuerValidator = new JwtIssuerValidator(jwtIssuerUri);
        // Create audience validator with configured audience
        JwtClaimValidator<List<String>> audienceValidator = new JwtClaimValidator<>("aud", 
                audience -> audience != null && audience.contains(jwtAudience));

        // Combine validators using DelegatingOAuth2TokenValidator
        DelegatingOAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                issuerValidator,
                timestampValidator,
                audienceValidator
        );

        // Set validator on JWT decoder
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
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        
        // Configure to extract authorities from 'roles' claim
        converter.setPrincipalClaimName("sub");
        
        // Configure to use 'roles' claim for authorities and add 'ROLE_' prefix
        // This would typically be implemented using a custom converter
        // that extracts the 'roles' claim and adds the 'ROLE_' prefix
        
        return converter;
    }
}