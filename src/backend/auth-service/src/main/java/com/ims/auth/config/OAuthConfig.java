package com.ims.auth.config;

import com.ims.auth.service.TokenService;
import com.ims.auth.service.UserService;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.InMemoryOAuth2AuthorizedClientService;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Date;

/**
 * Configuration class that defines OAuth2 settings for the Authentication Service in the Inventory Management System.
 * Implements comprehensive OAuth2 client and resource server configuration to support secure authentication
 * with external identity providers and token-based authorization.
 */
@Configuration
@Slf4j
public class OAuthConfig {
    
    private static final String AUTHORITY_PREFIX = "ROLE_";
    private static final String AUTHORITIES_CLAIM_NAME = "roles";
    
    private final TokenService tokenService;
    private final UserService userService;
    
    private final String issuerUri;
    private final String jwkSetUri;
    private final String clientId;
    private final String clientSecret;
    private final String authorizationUri;
    private final String tokenUri;
    private final String userInfoUri;
    private final String redirectUri;
    private final String jwtSecret;
    
    /**
     * Constructor that initializes the configuration with required dependencies and properties
     */
    public OAuthConfig(
        TokenService tokenService,
        UserService userService,
        @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}") String issuerUri,
        @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri:}") String jwkSetUri,
        @Value("${spring.security.oauth2.client.registration.corporate.client-id}") String clientId,
        @Value("${spring.security.oauth2.client.registration.corporate.client-secret}") String clientSecret,
        @Value("${spring.security.oauth2.client.provider.corporate.authorization-uri}") String authorizationUri,
        @Value("${spring.security.oauth2.client.provider.corporate.token-uri}") String tokenUri,
        @Value("${spring.security.oauth2.client.provider.corporate.user-info-uri}") String userInfoUri,
        @Value("${spring.security.oauth2.client.registration.corporate.redirect-uri}") String redirectUri,
        @Value("${auth.jwt.secret}") String jwtSecret
    ) {
        this.tokenService = tokenService;
        this.userService = userService;
        this.issuerUri = issuerUri;
        this.jwkSetUri = jwkSetUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.authorizationUri = authorizationUri;
        this.tokenUri = tokenUri;
        this.userInfoUri = userInfoUri;
        this.redirectUri = redirectUri;
        this.jwtSecret = jwtSecret;
    }
    
    /**
     * Creates a client registration repository for OAuth2 clients
     *
     * @return Repository containing OAuth2 client registrations
     */
    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        ClientRegistration clientRegistration = ClientRegistration.withRegistrationId("corporate")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .authorizationUri(authorizationUri)
                .tokenUri(tokenUri)
                .userInfoUri(userInfoUri)
                .scope(Arrays.asList("openid", "profile", "email"))
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .clientName("Corporate IDP")
                .build();
        
        return new InMemoryClientRegistrationRepository(clientRegistration);
    }
    
    /**
     * Creates an authorized client service for managing OAuth2 authorized clients
     *
     * @param clientRegistrationRepository The client registration repository
     * @return Service for managing OAuth2 authorized clients
     */
    @Bean
    public OAuth2AuthorizedClientService authorizedClientService(
            ClientRegistrationRepository clientRegistrationRepository) {
        return new InMemoryOAuth2AuthorizedClientService(clientRegistrationRepository);
    }
    
    /**
     * Creates an authorized client repository for storing OAuth2 authorized clients in the HTTP session
     *
     * @param authorizedClientService The authorized client service
     * @return Repository for storing OAuth2 authorized clients
     */
    @Bean
    public OAuth2AuthorizedClientRepository authorizedClientRepository(
            OAuth2AuthorizedClientService authorizedClientService) {
        return new HttpSessionOAuth2AuthorizedClientRepository();
    }
    
    /**
     * Creates a JWT decoder for validating JWT tokens
     *
     * @return Decoder for validating JWT tokens
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        if (jwkSetUri != null && !jwkSetUri.isEmpty()) {
            log.info("Configuring JWT decoder with JWK Set URI: {}", jwkSetUri);
            return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        } else {
            log.info("Configuring custom JWT decoder using TokenService");
            return customJwtDecoder();
        }
    }
    
    /**
     * Creates a JWT authentication converter for extracting authentication details from JWT tokens
     *
     * @return Converter for JWT authentication
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthorityPrefix(AUTHORITY_PREFIX);
        grantedAuthoritiesConverter.setAuthoritiesClaimName(AUTHORITIES_CLAIM_NAME);
        
        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        
        return jwtAuthenticationConverter;
    }
    
    /**
     * Creates a custom JWT decoder that uses the TokenService for validation
     *
     * @return Custom JWT decoder using TokenService
     */
    private JwtDecoder customJwtDecoder() {
        return token -> {
            try {
                // Use TokenService to validate and extract claims
                Claims claims = tokenService.validateJwtToken(token);
                
                if (claims == null) {
                    throw new JwtException("Invalid JWT token");
                }
                
                // Extract standard claims
                Date issuedAt = claims.getIssuedAt();
                Date expiration = claims.getExpiration();
                
                // Convert Claims to Map for Jwt constructor
                Map<String, Object> claimsMap = new HashMap<>();
                for (String key : claims.keySet()) {
                    claimsMap.put(key, claims.get(key));
                }
                
                // Create headers map (simplified)
                Map<String, Object> headers = new HashMap<>();
                headers.put("alg", "HS256"); // Assuming HS256 algorithm
                headers.put("typ", "JWT");
                
                // Build and return the Jwt object
                Jwt.Builder builder = Jwt.withTokenValue(token)
                        .headers(h -> h.putAll(headers))
                        .claims(c -> c.putAll(claimsMap));
                
                if (issuedAt != null) {
                    builder.issuedAt(issuedAt.toInstant());
                }
                
                if (expiration != null) {
                    builder.expiresAt(expiration.toInstant());
                }
                
                return builder.build();
            } catch (JwtException e) {
                throw e;
            } catch (Exception e) {
                throw new JwtException("Error decoding JWT: " + e.getMessage(), e);
            }
        };
    }
}