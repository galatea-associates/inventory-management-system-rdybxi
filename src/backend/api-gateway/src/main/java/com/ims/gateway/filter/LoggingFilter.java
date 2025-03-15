package com.ims.gateway.filter;

import com.ims.common.util.CorrelationIdUtil;
import org.springframework.cloud.gateway.filter.GatewayFilterChain; // org.springframework.cloud.gateway 3.1.0
import org.springframework.cloud.gateway.filter.GlobalFilter; // org.springframework.cloud.gateway 3.1.0
import org.springframework.core.Ordered; // org.springframework.core 5.3.23
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest; // org.springframework.http.server.reactive 5.3.23
import org.springframework.http.server.reactive.ServerHttpResponse; // org.springframework.http.server.reactive 5.3.23
import org.springframework.stereotype.Component; // org.springframework.stereotype 5.3.23
import org.springframework.web.server.ServerWebExchange; // org.springframework.web.server 5.3.23
import reactor.core.publisher.Mono; // reactor.core 3.4.22
import lombok.extern.slf4j.Slf4j; // lombok.extern.slf4j 1.18.26
import java.time.Duration; // java.time 17
import java.time.Instant; // java.time 17

/**
 * Global filter that logs all incoming requests and outgoing responses through the API Gateway.
 * Captures request details, response status, timing information, and ensures correlation IDs
 * are included in logs for distributed tracing.
 */
@Component
@Slf4j
public class LoggingFilter implements GlobalFilter, Ordered {

    /**
     * Headers that contain sensitive information and should not be logged
     */
    private static final String[] SENSITIVE_HEADERS = {
        "Authorization", "Cookie", "Set-Cookie"
    };

    /**
     * Filters incoming requests to log request and response details with timing information
     *
     * @param exchange The server web exchange containing request and response
     * @param chain The filter chain to pass the exchange to
     * @return A Mono<Void> that completes when the filter processing is done
     */
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        Instant startTime = Instant.now();
        
        // Log the request
        logRequest(request);
        
        return chain.filter(exchange)
            .doFinally(signalType -> {
                // Calculate duration
                Duration duration = Duration.between(startTime, Instant.now());
                
                // Log the response
                logResponse(exchange.getResponse(), duration, request.getURI().getPath());
            });
    }

    /**
     * Determines the order of this filter in the filter chain
     * 
     * @return The order value, lower values have higher priority
     */
    @Override
    public int getOrder() {
        // Run after CorrelationIdFilter, AuthenticationFilter, and RateLimitingFilter
        return Ordered.HIGHEST_PRECEDENCE + 30;
    }

    /**
     * Logs details about the incoming request
     * 
     * @param request The HTTP request to log
     */
    private void logRequest(ServerHttpRequest request) {
        String method = request.getMethod().name();
        String path = request.getURI().getPath();
        String queryParams = request.getURI().getQuery() != null ? "?" + request.getURI().getQuery() : "";
        
        // Extract headers (excluding sensitive ones)
        StringBuilder headers = new StringBuilder();
        request.getHeaders().forEach((name, values) -> {
            if (shouldLogHeader(name)) {
                headers.append(name).append("=[").append(String.join(", ", values)).append("] ");
            }
        });
        
        String correlationId = CorrelationIdUtil.getCorrelationId();
        log.info("Request: [{}] {}{} Headers: {} CorrelationId: {}", 
                method, path, queryParams, headers.toString(), correlationId);
    }

    /**
     * Logs details about the outgoing response
     * 
     * @param response The HTTP response to log
     * @param duration The duration of request processing
     * @param path The request path for context
     */
    private void logResponse(ServerHttpResponse response, Duration duration, String path) {
        HttpStatus status = response.getStatusCode();
        int statusCode = status != null ? status.value() : 0;
        
        // Extract headers (excluding sensitive ones)
        StringBuilder headers = new StringBuilder();
        response.getHeaders().forEach((name, values) -> {
            if (shouldLogHeader(name)) {
                headers.append(name).append("=[").append(String.join(", ", values)).append("] ");
            }
        });
        
        String correlationId = CorrelationIdUtil.getCorrelationId();
        
        // Log at appropriate level based on status code
        if (statusCode >= 500) {
            log.error("Response: [{}] {} - {} ms - Headers: {} - CorrelationId: {}", 
                    statusCode, path, duration.toMillis(), headers.toString(), correlationId);
        } else if (statusCode >= 400) {
            log.warn("Response: [{}] {} - {} ms - Headers: {} - CorrelationId: {}", 
                    statusCode, path, duration.toMillis(), headers.toString(), correlationId);
        } else {
            log.info("Response: [{}] {} - {} ms - Headers: {} - CorrelationId: {}", 
                    statusCode, path, duration.toMillis(), headers.toString(), correlationId);
        }
    }

    /**
     * Determines if a header should be logged (excludes sensitive headers)
     * 
     * @param headerName The name of the header to check
     * @return true if the header should be logged, false otherwise
     */
    private boolean shouldLogHeader(String headerName) {
        String lowerCaseHeader = headerName.toLowerCase();
        for (String sensitiveHeader : SENSITIVE_HEADERS) {
            if (sensitiveHeader.toLowerCase().equals(lowerCaseHeader)) {
                return false;
            }
        }
        return true;
    }
}