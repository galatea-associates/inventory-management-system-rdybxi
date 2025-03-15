package com.ims.gateway.filter;

import com.ims.common.util.CorrelationIdUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Arrays;
import java.util.List;

/**
 * Gateway filter responsible for authenticating requests to the API Gateway by validating JWT tokens.
 * Extracts tokens from the Authorization header, verifies their validity, and enriches the request
 * with user information for downstream services.
 * 
 * This filter implements the Authentication Framework described in Technical Specifications/6.4.1/Authentication Framework
 * and handles token validation as described in Technical Specifications/6.4.1/Token Handling.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String USER_ID_HEADER = "X-User-ID";
    private static final String USERNAME_HEADER = "X-Username";
    private static final String ROLES_HEADER = "X-User-Roles";
    private static final List<String> PUBLIC_PATHS = Arrays.asList(
            "/api/v1/auth/login", 
            "/api/v1/auth/refresh", 
            "/actuator/health", 
            "/actuator/info"
    );

    private final Key signingKey;

    /**
     * Constructor that initializes the filter with the JWT signing key
     */
    public AuthenticationFilter() {
        // In a real-world scenario, this would be loaded from a secure configuration source
        // such as environment variables, Vault, or other secret management systems
        String jwtSecret = System.getenv("JWT_SECRET");
        if (jwtSecret == null || jwtSecret.isEmpty()) {
            jwtSecret = "default-secret-key-for-development-only-must-be-changed-in-production";
            log.warn("Using default JWT secret. This should only occur in development environments.");
        }
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Filters incoming requests to authenticate users via JWT tokens
     *
     * @param exchange the server web exchange
     * @param chain the filter chain
     * @return a Mono<Void> representing the completion of the filter chain
     */
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = CorrelationIdUtil.getCorrelationId();
        String path = exchange.getRequest().getURI().getPath();
        
        log.debug("[{}] Processing request for path: {}", correlationId, path);
        
        // Skip authentication for public paths
        if (isPublicPath(path)) {
            log.debug("[{}] Public path detected, skipping authentication: {}", correlationId, path);
            return chain.filter(exchange);
        }
        
        // Extract the Authorization header
        String authHeader = exchange.getRequest().getHeaders().getFirst(AUTHORIZATION_HEADER);
        
        // Check if the Authorization header is missing or invalid
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            log.warn("[{}] Missing or invalid Authorization header for path: {}", correlationId, path);
            return createUnauthorizedResponse(exchange, "Missing or invalid Authorization header");
        }
        
        // Extract the token
        String token = extractToken(authHeader);
        
        try {
            // Validate the token
            Claims claims = validateToken(token);
            
            // Extract user information from the token
            String userId = claims.getSubject();
            String username = claims.get("username", String.class);
            String roles = claims.get("roles", String.class);
            
            log.debug("[{}] Token validated successfully for user: {}", correlationId, username);
            
            // Create a new request with the user information added as headers
            ServerHttpRequest request = exchange.getRequest().mutate()
                    .header(USER_ID_HEADER, userId)
                    .header(USERNAME_HEADER, username)
                    .header(ROLES_HEADER, roles)
                    .build();
            
            // Create a new exchange with the modified request
            ServerWebExchange modifiedExchange = exchange.mutate()
                    .request(request)
                    .build();
            
            // Continue the filter chain with the modified exchange
            return chain.filter(modifiedExchange);
            
        } catch (JwtException e) {
            log.warn("[{}] Invalid JWT token: {}", correlationId, e.getMessage());
            return createUnauthorizedResponse(exchange, "Invalid JWT token: " + e.getMessage());
        } catch (Exception e) {
            log.error("[{}] Error processing authentication: {}", correlationId, e.getMessage(), e);
            return createUnauthorizedResponse(exchange, "Authentication error");
        }
    }

    /**
     * Returns the order of this filter in the filter chain
     *
     * @return the order value (lower values have higher priority)
     */
    @Override
    public int getOrder() {
        // Ensure this filter runs after correlation ID filter but before other filters
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    /**
     * Checks if the given path is a public path that doesn't require authentication
     *
     * @param path the request path
     * @return true if the path is public, false otherwise
     */
    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    /**
     * Extracts the JWT token from the Authorization header
     *
     * @param authorizationHeader the Authorization header value
     * @return the extracted JWT token
     */
    private String extractToken(String authorizationHeader) {
        if (authorizationHeader != null && authorizationHeader.startsWith(BEARER_PREFIX)) {
            return authorizationHeader.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    /**
     * Validates the JWT token and returns the claims if valid
     *
     * @param token the JWT token to validate
     * @return the JWT claims if the token is valid
     * @throws JwtException if the token is invalid
     */
    private Claims validateToken(String token) throws JwtException {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Creates an unauthorized response with an error message
     *
     * @param exchange the server web exchange
     * @param errorMessage the error message
     * @return a Mono<Void> representing the completed response
     */
    private Mono<Void> createUnauthorizedResponse(ServerWebExchange exchange, String errorMessage) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        return exchange.getResponse().writeWith(
                Mono.just(exchange.getResponse()
                        .bufferFactory()
                        .wrap(errorMessage.getBytes()))
        );
    }
}