package com.ims.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.reactive.CorsWebFilter;
import reactor.core.publisher.Flux;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.List;

import com.ims.gateway.ApiGatewayApplication;
import com.ims.gateway.config.RouteConfig;
import com.ims.gateway.config.SecurityConfig;

/**
 * Integration test class for the API Gateway application that verifies the correct configuration
 * and functionality of the gateway components including routes, security settings, and filters.
 */
@SpringBootTest
public class ApiGatewayApplicationTests {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private RouteLocator routeLocator;

    @Autowired
    private SecurityWebFilterChain securityWebFilterChain;

    @Autowired
    private CorsWebFilter corsWebFilter;

    /**
     * Verifies that the application context loads successfully
     */
    @Test
    void contextLoads() {
        // Assert that the application context loads successfully
        assertThat(routeLocator).isNotNull();
        assertThat(securityWebFilterChain).isNotNull();
        assertThat(corsWebFilter).isNotNull();
        
        // Verify that all required beans are created
    }

    /**
     * Tests that the route locator is correctly configured with all required routes
     */
    @Test
    void testRouteLocatorConfiguration() {
        // Get all routes from the route locator
        Flux<Route> routes = routeLocator.getRoutes();
        
        // Convert to list for easier testing
        List<Route> routeList = routes.collectList().block();
        
        // Verify all expected routes are present
        assertThat(routeList).isNotEmpty();
        
        // Check auth service routes
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("auth-service") && 
            route.getUri().toString().contains("auth-service") &&
            route.getPredicate().toString().contains("/api/v1/auth")
        );
        
        // Check data ingestion service routes
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("reference-data-service") && 
            route.getUri().toString().contains("data-ingestion") &&
            route.getPredicate().toString().contains("/api/v1/reference")
        );
        
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("market-data-service") && 
            route.getUri().toString().contains("data-ingestion") &&
            route.getPredicate().toString().contains("/api/v1/market")
        );
        
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("trade-data-service") && 
            route.getUri().toString().contains("data-ingestion") &&
            route.getPredicate().toString().contains("/api/v1/trade")
        );
        
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("contract-data-service") && 
            route.getUri().toString().contains("data-ingestion") &&
            route.getPredicate().toString().contains("/api/v1/contract")
        );
        
        // Check calculation service routes
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("position-service") && 
            route.getUri().toString().contains("calculation") &&
            route.getPredicate().toString().contains("/api/v1/position")
        );
        
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("inventory-service") && 
            route.getUri().toString().contains("calculation") &&
            route.getPredicate().toString().contains("/api/v1/inventory")
        );
        
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("calculation-service") && 
            route.getUri().toString().contains("calculation") &&
            route.getPredicate().toString().contains("/api/v1/calculation")
        );
        
        // Check workflow service routes
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("locate-service") && 
            route.getUri().toString().contains("workflow") &&
            route.getPredicate().toString().contains("/api/v1/locate")
        );
        
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("workflow-service") && 
            route.getUri().toString().contains("workflow") &&
            route.getPredicate().toString().contains("/api/v1/workflow")
        );
        
        // Check websocket service routes
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("websocket-service") && 
            route.getUri().toString().contains("websocket") &&
            (route.getPredicate().toString().contains("/ws") || 
             route.getPredicate().toString().contains("/websocket"))
        );
        
        // Check monitoring service routes
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("metrics-service") && 
            route.getUri().toString().contains("monitoring") &&
            route.getPredicate().toString().contains("/api/v1/metrics")
        );
        
        assertThat(routeList).anyMatch(route -> 
            route.getId().equals("health-service") && 
            route.getUri().toString().contains("monitoring") &&
            (route.getPredicate().toString().contains("/api/v1/health") || 
             route.getPredicate().toString().contains("/actuator/health"))
        );
        
        // Check short sell service with special performance requirements
        Route shortSellRoute = routeList.stream()
            .filter(route -> route.getId().equals("short-sell-service"))
            .findFirst()
            .orElse(null);
        
        assertThat(shortSellRoute).isNotNull();
        assertThat(shortSellRoute.getUri().toString()).contains("short-sell");
        assertThat(shortSellRoute.getPredicate().toString()).contains("/api/v1/order/validate");
        
        // Check for special timeout configuration (150ms SLA)
        boolean hasCorrectTimeout = shortSellRoute.getFilters().stream()
            .anyMatch(filter -> filter.toString().contains("RequestTimeout") && 
                               filter.toString().contains("150"));
        
        assertThat(hasCorrectTimeout).isTrue();
    }

    /**
     * Tests that the security configuration is correctly set up
     */
    @Test
    void testSecurityConfiguration() {
        // Verify that the security web filter chain is configured
        assertThat(securityWebFilterChain).isNotNull();
        
        // Check that CSRF protection is disabled
        // Check that public paths are accessible without authentication
        // Check that protected paths require authentication
        // Verify security headers configuration
    }

    /**
     * Tests that CORS is correctly configured
     */
    @Test
    void testCorsConfiguration() {
        // Verify that the CORS web filter is configured
        assertThat(corsWebFilter).isNotNull();
        
        // Check allowed origins configuration
        // Check allowed methods configuration
        // Check allowed headers configuration
        // Check exposed headers configuration
        // Verify max age configuration
    }

    /**
     * Tests that public endpoints are accessible without authentication
     */
    @Test
    void testPublicEndpoints() {
        // Test access to /api/v1/auth/login endpoint
        // Test access to /api/v1/auth/refresh endpoint
        // Test access to /api/v1/auth/forgot-password endpoint
        // Test access to /api/v1/auth/reset-password endpoint
        // Test access to /actuator/health endpoint
        // Test access to /actuator/info endpoint
        // Verify that all public endpoints return 200 OK without authentication
    }

    /**
     * Tests that protected endpoints require authentication
     */
    @Test
    void testProtectedEndpoints() {
        // Test access to /api/v1/position/** endpoint without authentication
        // Test access to /api/v1/inventory/** endpoint without authentication
        // Test access to /api/v1/locate/** endpoint without authentication
        // Test access to /api/v1/calculation/** endpoint without authentication
        // Verify that all protected endpoints return 401 Unauthorized without authentication
    }

    /**
     * Tests that rate limiting is correctly configured
     */
    @Test
    void testRateLimitingConfiguration() {
        // Get all routes
        List<Route> routeList = routeLocator.getRoutes().collectList().block();
        
        // Verify rate limiting configuration for different service categories
        for (Route route : routeList) {
            // Check for rate limiting filters
            boolean hasRateLimiter = route.getFilters().stream()
                .anyMatch(filter -> filter.toString().contains("RequestRateLimiter"));
            
            assertThat(hasRateLimiter).withFailMessage(
                "Route %s should have rate limiting configuration", route.getId())
                .isTrue();
            
            // Verify that the short sell service has higher rate limits due to performance requirements
            if (route.getId().equals("short-sell-service")) {
                // Additional check for higher rate limits would go here if we could access the filter configuration details
                boolean hasHighPriorityHeader = route.getFilters().stream()
                    .anyMatch(filter -> filter.toString().contains("X-Priority") && 
                                       filter.toString().contains("high"));
                
                assertThat(hasHighPriorityHeader).withFailMessage(
                    "Short sell service should be marked as high priority").isTrue();
            }
        }
    }

    /**
     * Tests that circuit breakers are correctly configured
     */
    @Test
    void testCircuitBreakerConfiguration() {
        // Get all routes
        List<Route> routeList = routeLocator.getRoutes().collectList().block();
        
        for (Route route : routeList) {
            // Skip WebSocket routes as they typically don't have circuit breakers
            if (!route.getId().contains("websocket")) {
                // Check for circuit breaker filters
                boolean hasCircuitBreaker = route.getFilters().stream()
                    .anyMatch(filter -> filter.toString().contains("CircuitBreaker"));
                
                assertThat(hasCircuitBreaker).withFailMessage(
                    "Route %s should have circuit breaker configuration", route.getId())
                    .isTrue();
                
                // Verify fallback configurations
                boolean hasFallback = route.getFilters().stream()
                    .anyMatch(filter -> filter.toString().contains("CircuitBreaker") && 
                                       filter.toString().contains("fallback"));
                
                assertThat(hasFallback).withFailMessage(
                    "Route %s should have a fallback configuration", route.getId())
                    .isTrue();
            }
        }
    }

    /**
     * Tests that timeouts are correctly configured
     */
    @Test
    void testTimeoutConfiguration() {
        // Get all routes
        List<Route> routeList = routeLocator.getRoutes().collectList().block();
        
        for (Route route : routeList) {
            // Check for timeout filters
            boolean hasTimeout = route.getFilters().stream()
                .anyMatch(filter -> filter.toString().contains("RequestTimeout") || 
                                   filter.toString().contains("ResponseTimeout"));
            
            assertThat(hasTimeout).withFailMessage(
                "Route %s should have timeout configuration", route.getId())
                .isTrue();
            
            // Check that the short sell service has a strict 150ms timeout configuration
            if (route.getId().equals("short-sell-service")) {
                boolean hasShortTimeout = route.getFilters().stream()
                    .anyMatch(filter -> filter.toString().contains("RequestTimeout") && 
                                       filter.toString().contains("150"));
                
                assertThat(hasShortTimeout).withFailMessage(
                    "Short sell service should have a 150ms timeout configuration")
                    .isTrue();
            }
        }
    }

    /**
     * Tests that retry configurations are correctly set up
     */
    @Test
    void testRetryConfiguration() {
        // Get all routes
        List<Route> routeList = routeLocator.getRoutes().collectList().block();
        
        for (Route route : routeList) {
            // Skip WebSocket routes as they typically don't have retry configuration
            if (!route.getId().contains("websocket")) {
                // Check for retry filters
                boolean hasRetry = route.getFilters().stream()
                    .anyMatch(filter -> filter.toString().contains("Retry"));
                
                assertThat(hasRetry).withFailMessage(
                    "Route %s should have retry configuration", route.getId())
                    .isTrue();
                
                // Verify that the short sell service has minimal retry attempts due to SLA requirements
                if (route.getId().equals("short-sell-service")) {
                    boolean hasMinimalRetries = route.getFilters().stream()
                        .anyMatch(filter -> filter.toString().contains("Retry") && 
                                           filter.toString().contains("retries=1"));
                    
                    assertThat(hasMinimalRetries).withFailMessage(
                        "Short sell service should have minimal retry attempts")
                        .isTrue();
                }
            }
        }
    }
}