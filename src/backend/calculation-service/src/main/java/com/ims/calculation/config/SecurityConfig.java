package com.ims.calculation.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
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
 * Configuration class for security settings in the Calculation Service.
 * Configures JWT-based authentication, role-based authorization, CORS, and other security features.
 */
@Configuration
@EnableWebSecurity
@Slf4j
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {"/actuator/health", "/actuator/info", "/actuator/prometheus"};

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
        log.info("Initializing Security Configuration for Calculation Service");
    }

    /**
     * Configures the security filter chain for the application
     *
     * @param http HttpSecurity to configure
     * @return Configured security filter chain
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                .requestMatchers("/api/v1/rules/**").hasRole("CALCULATION_ADMIN")
                .requestMatchers("/api/v1/positions/**").hasRole("CALCULATION_USER")
                .requestMatchers("/api/v1/inventory/**").hasRole("CALCULATION_USER")
                .requestMatchers("/api/v1/limits/**").hasRole("CALCULATION_USER")
                .anyRequest().authenticated()
            )
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

        // Create validators for JWT tokens
        JwtTimestampValidator timestampValidator = new JwtTimestampValidator();
        JwtIssuerValidator issuerValidator = new JwtIssuerValidator(jwtIssuerUri);
        JwtClaimValidator<List<String>> audienceValidator = new JwtClaimValidator<>("aud", 
                aud -> aud != null && aud.contains(jwtAudience));

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
     * @return Configured JWT authentication converter
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        
        // Configure to extract authorities from 'roles' claim
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("roles");
        authoritiesConverter.setAuthorityPrefix("ROLE_");
        
        converter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
        return converter;
    }
}