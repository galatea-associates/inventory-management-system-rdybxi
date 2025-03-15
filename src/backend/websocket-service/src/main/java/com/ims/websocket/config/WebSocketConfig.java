package com.ims.websocket.config;

import com.ims.websocket.handler.AlertWebSocketHandler;
import com.ims.websocket.handler.InventoryWebSocketHandler;
import com.ims.websocket.handler.LocateWebSocketHandler;
import com.ims.websocket.handler.PositionWebSocketHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

import java.util.List;
import java.util.Map;

/**
 * Configuration class for WebSocket endpoints in the Inventory Management System.
 * This class registers WebSocket handlers, configures WebSocket endpoints, and sets up
 * security interceptors to enable real-time data streaming for positions, inventory, locates,
 * and alerts to connected clients.
 */
@Configuration
@EnableWebSocket
@Slf4j
public class WebSocketConfig implements WebSocketConfigurer {

    @Value("${websocket.allowed-origins:*}")
    private List<String> allowedOrigins;

    @Value("${websocket.send-timeout-ms:10000}")
    private Long sendTimeoutMs;

    @Value("${websocket.send-buffer-size-limit:524288}")
    private Integer sendBufferSizeLimit;

    @Value("${websocket.message-buffer-size-limit:131072}")
    private Integer messageBufferSizeLimit;

    private final PositionWebSocketHandler positionWebSocketHandler;
    private final InventoryWebSocketHandler inventoryWebSocketHandler;
    private final LocateWebSocketHandler locateWebSocketHandler;
    private final AlertWebSocketHandler alertWebSocketHandler;
    private final JwtDecoder jwtDecoder;

    /**
     * Initializes the WebSocket configuration with required dependencies
     *
     * @param positionWebSocketHandler Handler for position data WebSocket connections
     * @param inventoryWebSocketHandler Handler for inventory data WebSocket connections
     * @param locateWebSocketHandler Handler for locate data WebSocket connections
     * @param alertWebSocketHandler Handler for system alerts WebSocket connections
     * @param jwtDecoder JWT decoder for authentication and authorization
     */
    public WebSocketConfig(
            PositionWebSocketHandler positionWebSocketHandler,
            InventoryWebSocketHandler inventoryWebSocketHandler,
            LocateWebSocketHandler locateWebSocketHandler,
            AlertWebSocketHandler alertWebSocketHandler,
            JwtDecoder jwtDecoder) {
        this.positionWebSocketHandler = positionWebSocketHandler;
        this.inventoryWebSocketHandler = inventoryWebSocketHandler;
        this.locateWebSocketHandler = locateWebSocketHandler;
        this.alertWebSocketHandler = alertWebSocketHandler;
        this.jwtDecoder = jwtDecoder;
        log.info("WebSocket configuration initialized");
    }

    /**
     * Registers WebSocket handlers with their respective endpoints
     *
     * @param registry The WebSocket handler registry
     */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Register position WebSocket handler
        registry.addHandler(positionWebSocketHandler, "/ws/positions")
                .setAllowedOrigins(allowedOrigins.toArray(new String[0]))
                .addInterceptors(securityHandshakeInterceptor(), httpSessionHandshakeInterceptor())
                .setHandshakeHandler(defaultHandshakeHandler())
                .setSendTimeLimit(sendTimeoutMs)
                .setSendBufferSizeLimit(sendBufferSizeLimit)
                .setMessageSizeLimit(messageBufferSizeLimit);

        // Register inventory WebSocket handler
        registry.addHandler(inventoryWebSocketHandler, "/ws/inventory")
                .setAllowedOrigins(allowedOrigins.toArray(new String[0]))
                .addInterceptors(securityHandshakeInterceptor(), httpSessionHandshakeInterceptor())
                .setHandshakeHandler(defaultHandshakeHandler())
                .setSendTimeLimit(sendTimeoutMs)
                .setSendBufferSizeLimit(sendBufferSizeLimit)
                .setMessageSizeLimit(messageBufferSizeLimit);

        // Register locate WebSocket handler
        registry.addHandler(locateWebSocketHandler, "/ws/locates")
                .setAllowedOrigins(allowedOrigins.toArray(new String[0]))
                .addInterceptors(securityHandshakeInterceptor(), httpSessionHandshakeInterceptor())
                .setHandshakeHandler(defaultHandshakeHandler())
                .setSendTimeLimit(sendTimeoutMs)
                .setSendBufferSizeLimit(sendBufferSizeLimit)
                .setMessageSizeLimit(messageBufferSizeLimit);

        // Register alert WebSocket handler
        registry.addHandler(alertWebSocketHandler, "/ws/alerts")
                .setAllowedOrigins(allowedOrigins.toArray(new String[0]))
                .addInterceptors(securityHandshakeInterceptor(), httpSessionHandshakeInterceptor())
                .setHandshakeHandler(defaultHandshakeHandler())
                .setSendTimeLimit(sendTimeoutMs)
                .setSendBufferSizeLimit(sendBufferSizeLimit)
                .setMessageSizeLimit(messageBufferSizeLimit);

        log.info("WebSocket handlers registered with endpoints: /ws/positions, /ws/inventory, /ws/locates, /ws/alerts");
    }

    /**
     * Creates a handshake interceptor that validates JWT tokens during WebSocket connection establishment
     *
     * @return Security interceptor for WebSocket handshakes
     */
    @Bean
    public HandshakeInterceptor securityHandshakeInterceptor() {
        return new HandshakeInterceptor() {
            @Override
            public boolean beforeHandshake(org.springframework.http.server.ServerHttpRequest request, 
                                          org.springframework.http.server.ServerHttpResponse response, 
                                          org.springframework.web.socket.WebSocketHandler wsHandler, 
                                          Map<String, Object> attributes) throws Exception {
                log.debug("Processing WebSocket handshake request");
                
                // Extract JWT token from the request headers
                String token = extractTokenFromRequest(request);
                
                if (token == null) {
                    log.warn("No JWT token found in WebSocket handshake request");
                    return false;
                }
                
                try {
                    // Validate the JWT token
                    var jwt = jwtDecoder.decode(token);
                    
                    // Extract user information and roles from the token
                    String username = jwt.getSubject();
                    List<String> roles = jwt.getClaimAsStringList("roles");
                    
                    // Check if the user has the required roles for the endpoint
                    if (!hasRequiredRolesForEndpoint(request.getURI().getPath(), roles)) {
                        log.warn("User {} does not have required roles for endpoint {}", 
                                username, request.getURI().getPath());
                        return false;
                    }
                    
                    // Store authentication details in attributes map for use in the WebSocket session
                    attributes.put("username", username);
                    attributes.put("roles", roles);
                    attributes.put("authenticated", true);
                    
                    log.debug("WebSocket handshake authentication successful for user: {}", username);
                    return true;
                } catch (Exception e) {
                    log.error("Error validating JWT token during WebSocket handshake: {}", e.getMessage());
                    return false;
                }
            }

            @Override
            public void afterHandshake(org.springframework.http.server.ServerHttpRequest request, 
                                     org.springframework.http.server.ServerHttpResponse response, 
                                     org.springframework.web.socket.WebSocketHandler wsHandler, 
                                     Exception exception) {
                // No action needed after handshake
            }
            
            /**
             * Extracts JWT token from the request
             * 
             * @param request The server HTTP request
             * @return The JWT token string or null if not found
             */
            private String extractTokenFromRequest(org.springframework.http.server.ServerHttpRequest request) {
                List<String> authHeaders = request.getHeaders().get("Authorization");
                
                if (authHeaders != null && !authHeaders.isEmpty()) {
                    String authHeader = authHeaders.get(0);
                    if (authHeader.startsWith("Bearer ")) {
                        return authHeader.substring(7);
                    }
                }
                
                // If not in Authorization header, check for token in query parameters
                String query = request.getURI().getQuery();
                if (query != null && query.contains("token=")) {
                    String[] params = query.split("&");
                    for (String param : params) {
                        if (param.startsWith("token=")) {
                            return param.substring(6);
                        }
                    }
                }
                
                return null;
            }
            
            /**
             * Checks if the user has the required roles for the requested endpoint
             * 
             * @param endpoint The WebSocket endpoint path
             * @param userRoles The user's roles
             * @return True if the user has the required roles, false otherwise
             */
            private boolean hasRequiredRolesForEndpoint(String endpoint, List<String> userRoles) {
                if (userRoles == null || userRoles.isEmpty()) {
                    return false;
                }
                
                // Check if user has admin role, which can access all endpoints
                if (userRoles.contains("ROLE_ADMIN")) {
                    return true;
                }
                
                // Define required roles for each endpoint
                if (endpoint.equals("/ws/positions")) {
                    return userRoles.stream().anyMatch(role -> 
                            role.equals("ROLE_TRADER") || 
                            role.equals("ROLE_OPERATIONS") || 
                            role.equals("ROLE_COMPLIANCE"));
                }
                
                if (endpoint.equals("/ws/inventory")) {
                    return userRoles.stream().anyMatch(role -> 
                            role.equals("ROLE_TRADER") || 
                            role.equals("ROLE_OPERATIONS") || 
                            role.equals("ROLE_COMPLIANCE"));
                }
                
                if (endpoint.equals("/ws/locates")) {
                    return userRoles.stream().anyMatch(role -> 
                            role.equals("ROLE_TRADER") || 
                            role.equals("ROLE_OPERATIONS"));
                }
                
                if (endpoint.equals("/ws/alerts")) {
                    // All authenticated users can access alerts
                    return true;
                }
                
                // Default deny
                return false;
            }
        };
    }

    /**
     * Creates a custom handshake handler with extended capabilities
     *
     * @return Custom handshake handler for WebSocket connections
     */
    @Bean
    public DefaultHandshakeHandler defaultHandshakeHandler() {
        return new DefaultHandshakeHandler();
    }

    /**
     * Creates an interceptor that copies HTTP session attributes to WebSocket session
     *
     * @return Session attribute copying interceptor
     */
    @Bean
    public HttpSessionHandshakeInterceptor httpSessionHandshakeInterceptor() {
        HttpSessionHandshakeInterceptor interceptor = new HttpSessionHandshakeInterceptor();
        interceptor.setCopyAllAttributes(false);
        interceptor.setCreateSession(true);
        
        // Copy specific attributes from HTTP session to WebSocket session
        interceptor.setCopyHttpSessionAttributes(true);
        return interceptor;
    }
}