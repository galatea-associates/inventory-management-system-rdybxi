package com.ims.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import reactor.core.publisher.Mono;
import lombok.extern.slf4j.Slf4j;

/**
 * Main application class for the API Gateway component of the Inventory Management System.
 * Serves as the entry point for all external requests to the backend services, providing
 * routing, authentication, rate limiting, and other cross-cutting concerns.
 * 
 * This gateway implements the following capabilities:
 * - Request routing to appropriate backend services
 * - Authentication and authorization
 * - Rate limiting to protect backend services
 * - Request/response logging
 * - Correlation ID management for distributed tracing
 * - Error handling
 * 
 * As the first layer of defense in the system's security architecture, the API Gateway
 * ensures that all requests are properly authenticated, authorized, and rate-limited
 * before they reach the backend services. It also provides a central point for monitoring
 * and managing API traffic to support the system's high-throughput requirements.
 */
@SpringBootApplication
@Slf4j
public class ApiGatewayApplication {

    /**
     * Main entry point for the API Gateway application.
     * 
     * @param args Command line arguments passed to the application
     */
    public static void main(String[] args) {
        log.info("Starting Inventory Management System API Gateway");
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
    
    /**
     * Creates a key resolver that uses the authenticated user principal for rate limiting.
     * If the user is authenticated, their username is used as the rate limiting key.
     * If the user is not authenticated, falls back to using their IP address.
     * 
     * @return Key resolver that extracts user principal for rate limiting
     */
    @Bean
    public KeyResolver principalKeyResolver() {
        return exchange -> exchange.getPrincipal()
                .map(principal -> {
                    String username = principal.getName();
                    log.debug("Using principal for rate limiting: {}", username);
                    return Mono.just(username);
                })
                .defaultIfEmpty(getIpAddressKey(exchange));
    }
    
    /**
     * Creates a key resolver that uses the client IP address for rate limiting.
     * This is used for unauthenticated requests or as a fallback when user principal is not available.
     * 
     * @return Key resolver that extracts client IP address for rate limiting
     */
    @Bean
    public KeyResolver ipAddressKeyResolver() {
        return this::getIpAddressKey;
    }
    
    /**
     * Helper method to get the client IP address from the exchange.
     * Tries to extract the IP from X-Forwarded-For header first, then falls back to the remote address.
     * 
     * @param exchange The server web exchange
     * @return A Mono containing the client IP address
     */
    private Mono<String> getIpAddressKey(org.springframework.web.server.ServerWebExchange exchange) {
        String clientIp = "unknown";
        
        // Try to get the IP from X-Forwarded-For header first
        String forwarded = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isEmpty()) {
            clientIp = forwarded.split(",")[0].trim();
        } 
        // If X-Forwarded-For is not available, use the remote address
        else if (exchange.getRequest().getRemoteAddress() != null && 
                 exchange.getRequest().getRemoteAddress().getAddress() != null) {
            clientIp = exchange.getRequest().getRemoteAddress().getAddress().getHostAddress();
        }
        
        if ("unknown".equals(clientIp)) {
            log.warn("Unable to determine client IP address for rate limiting");
        } else {
            log.debug("Using IP address for rate limiting: {}", clientIp);
        }
        
        return Mono.just(clientIp);
    }
}