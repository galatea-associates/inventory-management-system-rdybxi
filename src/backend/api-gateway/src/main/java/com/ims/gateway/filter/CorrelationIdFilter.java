package com.ims.gateway.filter;

import com.ims.common.util.CorrelationIdUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Gateway filter responsible for ensuring all requests passing through the API Gateway
 * have a correlation ID for distributed tracing. Extracts existing correlation IDs from
 * request headers or generates new ones, and propagates them to downstream services and
 * response headers.
 * 
 * This filter supports the distributed tracing framework by implementing trace
 * propagation across service boundaries with correlation IDs, enabling end-to-end
 * request tracking for monitoring and troubleshooting.
 */
@Component
@Slf4j
public class CorrelationIdFilter implements GlobalFilter, Ordered {

    /**
     * Filters incoming requests to ensure they have a correlation ID.
     * If a correlation ID is present in the request headers, it is used.
     * Otherwise, a new correlation ID is generated and added to the request.
     * The correlation ID is also set in the current thread context for logging.
     *
     * @param exchange The server web exchange containing the request and response
     * @param chain The filter chain to pass the modified exchange to
     * @return A Mono<Void> representing the asynchronous completion of the filter chain
     */
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String correlationId;
        
        // Check if the request already has a correlation ID header
        if (request.getHeaders().containsKey(CorrelationIdUtil.CORRELATION_ID_HEADER)) {
            correlationId = request.getHeaders().getFirst(CorrelationIdUtil.CORRELATION_ID_HEADER);
            log.debug("Using existing correlation ID: {}", correlationId);
        } else {
            // Generate a new correlation ID if none exists
            correlationId = CorrelationIdUtil.generateCorrelationId();
            log.debug("Generated new correlation ID: {}", correlationId);
        }
        
        // Set the correlation ID in the current thread context
        CorrelationIdUtil.setCorrelationId(correlationId);
        
        // Create a new request with the correlation ID header
        ServerHttpRequest requestWithCorrelationId = request.mutate()
                .header(CorrelationIdUtil.CORRELATION_ID_HEADER, correlationId)
                .build();
        
        // Create a new exchange with the modified request
        ServerWebExchange exchangeWithCorrelationId = exchange.mutate()
                .request(requestWithCorrelationId)
                .build();
        
        // Continue the filter chain with the modified exchange and ensure cleanup
        return chain.filter(exchangeWithCorrelationId)
                .doFinally(signalType -> {
                    // Clean up the correlation ID when the request is complete
                    CorrelationIdUtil.clearCorrelationId();
                    log.debug("Cleared correlation ID after request completion: {}", correlationId);
                });
    }

    /**
     * Returns the order of this filter in the filter chain.
     * This filter should run before all other filters to ensure
     * the correlation ID is available throughout the request processing.
     *
     * @return The order value (HIGHEST_PRECEDENCE ensures it runs first)
     */
    @Override
    public int getOrder() {
        // Use HIGHEST_PRECEDENCE to ensure this filter runs first
        return Ordered.HIGHEST_PRECEDENCE;
    }
}