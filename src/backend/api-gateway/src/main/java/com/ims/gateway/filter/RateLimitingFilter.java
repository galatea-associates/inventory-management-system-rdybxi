package com.ims.gateway.filter;

import com.ims.common.util.CorrelationIdUtil;
import com.ims.common.exception.ServiceException;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.local.LocalBucketBuilder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gateway filter responsible for rate limiting requests to the API Gateway to protect 
 * backend services from excessive load. Implements configurable rate limiting based on 
 * client identity, IP address, or other attributes with different tiers for various 
 * service categories.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter implements GlobalFilter, Ordered {

    private static final Map<String, Bucket> CLIENT_BUCKETS = new ConcurrentHashMap<>();
    private static final Map<String, Bucket> IP_BUCKETS = new ConcurrentHashMap<>();
    private static final String X_RATE_LIMIT_REMAINING_HEADER = "X-Rate-Limit-Remaining";
    private static final String X_RATE_LIMIT_RETRY_AFTER_HEADER = "X-Rate-Limit-Retry-After";
    private static final String RATE_LIMIT_EXCEEDED_MESSAGE = "Rate limit exceeded. Please try again later.";

    /**
     * Enum defining different rate limit tiers with their respective limits
     */
    public enum RateLimitTier {
        // Critical services have highest limits - 10,000 req/min with 200% burst
        CRITICAL(167, 334),  // ~10,000/minute
        // Standard services - 1,000 req/min with 150% burst
        STANDARD(17, 25),    // ~1,000/minute
        // Batch operations - 100 req/min with 300% burst
        BATCH(2, 6),         // ~100/minute
        // Public APIs - 60 req/min with no burst
        PUBLIC(1, 1);        // ~60/minute

        private final int tokensPerSecond;
        private final int burstCapacity;

        RateLimitTier(int tokensPerSecond, int burstCapacity) {
            this.tokensPerSecond = tokensPerSecond;
            this.burstCapacity = burstCapacity;
        }

        public int getTokensPerSecond() {
            return tokensPerSecond;
        }

        public int getBurstCapacity() {
            return burstCapacity;
        }
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();
        
        // Determine appropriate rate limit tier based on the request path
        RateLimitTier tier = getRateLimitTier(path);
        
        // Get client identifier (API key, user ID, or IP address)
        String clientId = getClientIdentifier(request);
        boolean isIpBased = clientId.startsWith("ip:");
        
        // Get or create the appropriate rate limiter bucket
        Bucket bucket = getBucket(clientId, tier, isIpBased);
        
        // Try to consume a token from the bucket
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        
        if (probe.isConsumed()) {
            // Request is allowed, add rate limit headers
            ServerHttpResponse response = exchange.getResponse();
            response.getHeaders().add(X_RATE_LIMIT_REMAINING_HEADER, 
                    String.valueOf(probe.getRemainingTokens()));
            
            // Continue to the next filter in the chain
            log.debug("Request allowed for client: {}, path: {}, remaining: {}, correlationId: {}", 
                    clientId, path, probe.getRemainingTokens(), CorrelationIdUtil.getCorrelationId());
            return chain.filter(exchange);
        } else {
            // Rate limit exceeded, return 429 Too Many Requests
            long waitTimeMillis = probe.getNanosToWaitForRefill() / 1_000_000;
            log.warn("Rate limit exceeded for client: {}, path: {}, retry after: {}ms, correlationId: {}", 
                    clientId, path, waitTimeMillis, CorrelationIdUtil.getCorrelationId());
            return createRateLimitExceededResponse(exchange, waitTimeMillis);
        }
    }

    @Override
    public int getOrder() {
        // Run this filter after authentication but before most other filters
        return Ordered.HIGHEST_PRECEDENCE + 20;
    }

    /**
     * Determines the rate limit tier based on the request path
     */
    private RateLimitTier getRateLimitTier(String path) {
        // Critical services: short sell validation, position calculations, locate approvals
        if (path.contains("/api/v1/orders/validate") || 
            path.contains("/api/v1/positions/calculate") ||
            path.contains("/api/v1/locates/approve") ||
            path.contains("/api/v1/inventory/calculate") ||
            path.contains("/api/v1/limits")) {
            return RateLimitTier.CRITICAL;
        }
        
        // Batch operations: bulk uploads, exports, data processing
        if (path.contains("/api/v1/batch") || 
            path.contains("/api/v1/export") ||
            path.contains("/api/v1/import") ||
            path.contains("/api/v1/bulk") ||
            path.contains("/api/v1/process")) {
            return RateLimitTier.BATCH;
        }
        
        // Public APIs: unauthenticated endpoints, health checks, status
        if (path.contains("/api/public") || 
            path.contains("/health") ||
            path.contains("/status") ||
            path.contains("/actuator") ||
            path.contains("/metrics")) {
            return RateLimitTier.PUBLIC;
        }
        
        // Default to standard tier for most API endpoints
        return RateLimitTier.STANDARD;
    }

    /**
     * Extracts the client identifier from the request
     */
    private String getClientIdentifier(ServerHttpRequest request) {
        // First try to use the API key if present
        String apiKey = request.getHeaders().getFirst("X-Api-Key");
        if (apiKey != null && !apiKey.isEmpty()) {
            return "apikey:" + apiKey;
        }
        
        // Next try to use the user ID from authentication
        String userId = request.getHeaders().getFirst("X-User-ID");
        if (userId != null && !userId.isEmpty()) {
            return "user:" + userId;
        }
        
        // Fall back to IP address if no other identifier is available
        String clientIp = "unknown";
        if (request.getRemoteAddress() != null && request.getRemoteAddress().getAddress() != null) {
            clientIp = request.getRemoteAddress().getAddress().getHostAddress();
        }
        return "ip:" + clientIp;
    }

    /**
     * Gets or creates a rate limiter bucket for the given identifier and tier
     */
    private Bucket getBucket(String identifier, RateLimitTier tier, boolean isIpBased) {
        Map<String, Bucket> bucketMap = isIpBased ? IP_BUCKETS : CLIENT_BUCKETS;
        
        return bucketMap.computeIfAbsent(identifier, id -> createBucket(tier));
    }

    /**
     * Creates a new rate limiter bucket with appropriate limits
     */
    private Bucket createBucket(RateLimitTier tier) {
        LocalBucketBuilder builder = Bucket4j.builder();
        
        // Add a short-term rate limit with burst capacity
        builder.addLimit(Bandwidth.simple(
                tier.getBurstCapacity(), 
                Duration.ofSeconds(1)));
        
        // Add a sustainable rate limit over 1 minute
        builder.addLimit(Bandwidth.simple(
                tier.getTokensPerSecond() * 60, 
                Duration.ofMinutes(1)));
        
        return builder.build();
    }

    /**
     * Creates a response for when rate limit is exceeded
     */
    private Mono<Void> createRateLimitExceededResponse(ServerWebExchange exchange, long waitTimeMillis) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        response.getHeaders().add(X_RATE_LIMIT_RETRY_AFTER_HEADER, String.valueOf(waitTimeMillis));
        
        String correlationId = CorrelationIdUtil.getCorrelationId();
        String jsonResponse = String.format(
                "{\"message\":\"%s\",\"correlationId\":\"%s\"}",
                RATE_LIMIT_EXCEEDED_MESSAGE,
                correlationId);
        
        DataBuffer buffer = response.bufferFactory().wrap(jsonResponse.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}