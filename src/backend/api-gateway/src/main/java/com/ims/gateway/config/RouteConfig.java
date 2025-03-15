package com.ims.gateway.config;

import com.ims.gateway.filter.AuthenticationFilter;
import com.ims.gateway.filter.RateLimitingFilter;
import com.ims.gateway.filter.LoggingFilter;
import com.ims.gateway.filter.CorrelationIdFilter;
import com.ims.gateway.handler.ErrorHandler;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.cloud.gateway.filter.factory.RetryGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.RequestRateLimiterGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.CircuitBreakerGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.RequestSizeGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.RewritePathGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.AddRequestHeaderGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.AddResponseHeaderGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.SetPathGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.StripPrefixGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.RequestHeaderToRequestUriGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.SaveSessionGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.SecureHeadersGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.RedirectToGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.beans.factory.annotation.Value;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;

/**
 * Configuration class for defining API Gateway routes to various backend microservices
 * in the Inventory Management System. Configures path-based routing, load balancing,
 * circuit breakers, rate limiting, and other cross-cutting concerns for each service endpoint.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class RouteConfig {

    private final Environment environment;
    private final KeyResolver principalKeyResolver;
    private final KeyResolver ipAddressKeyResolver;
    private final AuthenticationFilter authenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final LoggingFilter loggingFilter;
    private final CorrelationIdFilter correlationIdFilter;
    
    // Service URLs
    @Value("${service.auth.url}")
    private String authServiceUrl;
    
    @Value("${service.data-ingestion.url}")
    private String dataIngestionServiceUrl;
    
    @Value("${service.calculation.url}")
    private String calculationServiceUrl;
    
    @Value("${service.workflow.url}")
    private String workflowServiceUrl;
    
    @Value("${service.websocket.url}")
    private String websocketServiceUrl;
    
    @Value("${service.monitoring.url}")
    private String monitoringServiceUrl;
    
    @Value("${service.short-sell.url}")
    private String shortSellServiceUrl;
    
    // Service timeouts
    @Value("${service.auth.timeout:5000}")
    private Integer authServiceTimeout;
    
    @Value("${service.data-ingestion.timeout:10000}")
    private Integer dataIngestionServiceTimeout;
    
    @Value("${service.calculation.timeout:10000}")
    private Integer calculationServiceTimeout;
    
    @Value("${service.workflow.timeout:10000}")
    private Integer workflowServiceTimeout;
    
    @Value("${service.websocket.timeout:30000}")
    private Integer websocketServiceTimeout;
    
    @Value("${service.monitoring.timeout:5000}")
    private Integer monitoringServiceTimeout;
    
    @Value("${service.short-sell.timeout:150}")
    private Integer shortSellServiceTimeout;
    
    // Retry attempts
    @Value("${service.auth.retry:3}")
    private Integer authServiceRetryAttempts;
    
    @Value("${service.data-ingestion.retry:3}")
    private Integer dataIngestionServiceRetryAttempts;
    
    @Value("${service.calculation.retry:3}")
    private Integer calculationServiceRetryAttempts;
    
    @Value("${service.workflow.retry:3}")
    private Integer workflowServiceRetryAttempts;
    
    @Value("${service.websocket.retry:0}")
    private Integer websocketServiceRetryAttempts;
    
    @Value("${service.monitoring.retry:3}")
    private Integer monitoringServiceRetryAttempts;
    
    @Value("${service.short-sell.retry:1}")
    private Integer shortSellServiceRetryAttempts;
    
    /**
     * Configures the routes for the API Gateway, mapping external paths to internal microservices.
     * 
     * @param builder RouteLocatorBuilder to create routes
     * @return Configured RouteLocator with all API routes
     */
    @Bean
    public RouteLocator routeLocator(RouteLocatorBuilder builder) {
        log.info("Configuring API Gateway routes");
        
        RouteLocatorBuilder.Builder routes = builder.routes();

        // Configure routes for each service
        routes = configureAuthServiceRoutes(routes);
        routes = configureDataIngestionServiceRoutes(routes);
        routes = configureCalculationServiceRoutes(routes);
        routes = configureWorkflowServiceRoutes(routes);
        routes = configureWebSocketServiceRoutes(routes);
        routes = configureMonitoringServiceRoutes(routes);
        routes = configureShortSellServiceRoutes(routes);
        
        return routes.build();
    }

    /**
     * Configures routes for the authentication service
     */
    private RouteLocatorBuilder.Builder configureAuthServiceRoutes(RouteLocatorBuilder.Builder builder) {
        log.debug("Configuring authentication service routes");
        
        return builder.route("auth-service", r -> r
            .path("/api/v1/auth/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("authCircuitBreaker")
                    .setFallbackUri("forward:/fallback/auth"))
                .retry(c -> c
                    .setRetries(authServiceRetryAttempts)
                    .setMethods(HttpMethod.GET))
                .requestTimeout(Duration.ofMillis(authServiceTimeout))
                .responseTimeout(Duration.ofMillis(authServiceTimeout))
                .addRequestHeader("X-Service", "auth-service")
                .secureHeaders())
            .uri(authServiceUrl));
    }

    /**
     * Configures routes for the data ingestion service
     */
    private RouteLocatorBuilder.Builder configureDataIngestionServiceRoutes(RouteLocatorBuilder.Builder builder) {
        log.debug("Configuring data ingestion service routes");
        
        // Reference Data Routes
        builder.route("reference-data-service", r -> r
            .path("/api/v1/reference/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("referenceDataCircuitBreaker")
                    .setFallbackUri("forward:/fallback/reference"))
                .retry(c -> c
                    .setRetries(dataIngestionServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(dataIngestionServiceTimeout))
                .responseTimeout(Duration.ofMillis(dataIngestionServiceTimeout))
                .addRequestHeader("X-Service", "reference-data-service")
                .secureHeaders())
            .uri(dataIngestionServiceUrl));
        
        // Market Data Routes
        builder.route("market-data-service", r -> r
            .path("/api/v1/market/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("marketDataCircuitBreaker")
                    .setFallbackUri("forward:/fallback/market"))
                .retry(c -> c
                    .setRetries(dataIngestionServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(dataIngestionServiceTimeout))
                .responseTimeout(Duration.ofMillis(dataIngestionServiceTimeout))
                .addRequestHeader("X-Service", "market-data-service")
                .secureHeaders())
            .uri(dataIngestionServiceUrl));
            
        // Trade Data Routes
        builder.route("trade-data-service", r -> r
            .path("/api/v1/trade/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("tradeDataCircuitBreaker")
                    .setFallbackUri("forward:/fallback/trade"))
                .retry(c -> c
                    .setRetries(dataIngestionServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(dataIngestionServiceTimeout))
                .responseTimeout(Duration.ofMillis(dataIngestionServiceTimeout))
                .addRequestHeader("X-Service", "trade-data-service")
                .secureHeaders())
            .uri(dataIngestionServiceUrl));
            
        // Contract Data Routes
        builder.route("contract-data-service", r -> r
            .path("/api/v1/contract/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("contractDataCircuitBreaker")
                    .setFallbackUri("forward:/fallback/contract"))
                .retry(c -> c
                    .setRetries(dataIngestionServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(dataIngestionServiceTimeout))
                .responseTimeout(Duration.ofMillis(dataIngestionServiceTimeout))
                .addRequestHeader("X-Service", "contract-data-service")
                .secureHeaders())
            .uri(dataIngestionServiceUrl));
            
        return builder;
    }

    /**
     * Configures routes for the calculation service
     */
    private RouteLocatorBuilder.Builder configureCalculationServiceRoutes(RouteLocatorBuilder.Builder builder) {
        log.debug("Configuring calculation service routes");
        
        // Position Routes
        builder.route("position-service", r -> r
            .path("/api/v1/position/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("positionServiceCircuitBreaker")
                    .setFallbackUri("forward:/fallback/position"))
                .retry(c -> c
                    .setRetries(calculationServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(calculationServiceTimeout))
                .responseTimeout(Duration.ofMillis(calculationServiceTimeout))
                .addRequestHeader("X-Service", "position-service")
                .secureHeaders()
                .requestSize(10000000L)) // 10MB max request size
            .uri(calculationServiceUrl));
            
        // Inventory Routes
        builder.route("inventory-service", r -> r
            .path("/api/v1/inventory/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("inventoryServiceCircuitBreaker")
                    .setFallbackUri("forward:/fallback/inventory"))
                .retry(c -> c
                    .setRetries(calculationServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(calculationServiceTimeout))
                .responseTimeout(Duration.ofMillis(calculationServiceTimeout))
                .addRequestHeader("X-Service", "inventory-service")
                .secureHeaders()
                .requestSize(10000000L)) // 10MB max request size
            .uri(calculationServiceUrl));
            
        // Calculation Routes
        builder.route("calculation-service", r -> r
            .path("/api/v1/calculation/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("calculationServiceCircuitBreaker")
                    .setFallbackUri("forward:/fallback/calculation"))
                .retry(c -> c
                    .setRetries(calculationServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(calculationServiceTimeout))
                .responseTimeout(Duration.ofMillis(calculationServiceTimeout))
                .addRequestHeader("X-Service", "calculation-service")
                .secureHeaders()
                .requestSize(10000000L)) // 10MB max request size
            .uri(calculationServiceUrl));
            
        return builder;
    }

    /**
     * Configures routes for the workflow service
     */
    private RouteLocatorBuilder.Builder configureWorkflowServiceRoutes(RouteLocatorBuilder.Builder builder) {
        log.debug("Configuring workflow service routes");
        
        // Locate Routes
        builder.route("locate-service", r -> r
            .path("/api/v1/locate/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("locateServiceCircuitBreaker")
                    .setFallbackUri("forward:/fallback/locate"))
                .retry(c -> c
                    .setRetries(workflowServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(workflowServiceTimeout))
                .responseTimeout(Duration.ofMillis(workflowServiceTimeout))
                .addRequestHeader("X-Service", "locate-service")
                .secureHeaders())
            .uri(workflowServiceUrl));
            
        // Workflow Routes
        builder.route("workflow-service", r -> r
            .path("/api/v1/workflow/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("workflowServiceCircuitBreaker")
                    .setFallbackUri("forward:/fallback/workflow"))
                .retry(c -> c
                    .setRetries(workflowServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(workflowServiceTimeout))
                .responseTimeout(Duration.ofMillis(workflowServiceTimeout))
                .addRequestHeader("X-Service", "workflow-service")
                .secureHeaders())
            .uri(workflowServiceUrl));
            
        return builder;
    }

    /**
     * Configures routes for the WebSocket service
     */
    private RouteLocatorBuilder.Builder configureWebSocketServiceRoutes(RouteLocatorBuilder.Builder builder) {
        log.debug("Configuring WebSocket service routes");
        
        return builder.route("websocket-service", r -> r
            .path("/ws/**")
            .or()
            .path("/websocket/**")
            .filters(f -> f
                // Special handling for WebSocket upgrade requests
                .requestTimeout(Duration.ofMillis(websocketServiceTimeout))
                .responseTimeout(Duration.ofMillis(websocketServiceTimeout))
                .addRequestHeader("X-Service", "websocket-service"))
            .uri(websocketServiceUrl));
    }

    /**
     * Configures routes for the monitoring service
     */
    private RouteLocatorBuilder.Builder configureMonitoringServiceRoutes(RouteLocatorBuilder.Builder builder) {
        log.debug("Configuring monitoring service routes");
        
        // Metrics Routes
        builder.route("metrics-service", r -> r
            .path("/api/v1/metrics/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("metricsServiceCircuitBreaker")
                    .setFallbackUri("forward:/fallback/metrics"))
                .retry(c -> c
                    .setRetries(monitoringServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(monitoringServiceTimeout))
                .responseTimeout(Duration.ofMillis(monitoringServiceTimeout))
                .addRequestHeader("X-Service", "metrics-service")
                .secureHeaders())
            .uri(monitoringServiceUrl));
            
        // Health Routes (public)
        builder.route("health-service", r -> r
            .path("/api/v1/health/**")
            .or()
            .path("/actuator/health/**")
            .or()
            .path("/actuator/info/**")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("healthServiceCircuitBreaker")
                    .setFallbackUri("forward:/fallback/health"))
                .retry(c -> c
                    .setRetries(monitoringServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(monitoringServiceTimeout))
                .responseTimeout(Duration.ofMillis(monitoringServiceTimeout))
                .addRequestHeader("X-Service", "health-service")
                .secureHeaders())
            .uri(monitoringServiceUrl));
            
        return builder;
    }

    /**
     * Configures routes for the short sell validation service with strict SLA requirements (150ms)
     */
    private RouteLocatorBuilder.Builder configureShortSellServiceRoutes(RouteLocatorBuilder.Builder builder) {
        log.debug("Configuring short sell service routes with strict SLA requirements");
        
        return builder.route("short-sell-service", r -> r
            .path("/api/v1/order/validate")
            .filters(f -> f
                .circuitBreaker(c -> c
                    .setName("shortSellServiceCircuitBreaker")
                    .setFallbackUri("forward:/fallback/short-sell"))
                .retry(c -> c
                    .setRetries(shortSellServiceRetryAttempts))
                .requestTimeout(Duration.ofMillis(shortSellServiceTimeout))
                .responseTimeout(Duration.ofMillis(shortSellServiceTimeout))
                .addRequestHeader("X-Service", "short-sell-service")
                .addRequestHeader("X-Priority", "high") // Mark as high priority for strict SLA
                .secureHeaders())
            .uri(shortSellServiceUrl));
    }
}