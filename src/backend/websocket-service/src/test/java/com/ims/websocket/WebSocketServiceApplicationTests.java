package com.ims.websocket;

import org.junit.jupiter.api.Test; // JUnit 5.9.2
import org.springframework.boot.test.context.SpringBootTest; // Spring Boot 3.1.0
import org.springframework.test.context.ActiveProfiles; // Spring 6.0.9
import org.springframework.beans.factory.annotation.Autowired; // Spring 6.0.9
import org.springframework.context.ApplicationContext; // Spring 6.0.9
import static org.junit.jupiter.api.Assertions.assertNotNull; // JUnit 5.9.2

/**
 * Integration test class for the WebSocket Service application in the Inventory Management System.
 * This class verifies that the Spring application context loads correctly with all required beans
 * and configurations for WebSocket communication.
 */
@SpringBootTest
@ActiveProfiles("test")
public class WebSocketServiceApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    /**
     * Verifies that the Spring application context loads successfully.
     * This test will fail if there are any issues with the application configuration
     * or bean initialization during startup.
     */
    @Test
    public void contextLoads() {
        assertNotNull(applicationContext, "Application context should not be null");
    }

    /**
     * Verifies that all required WebSocket handlers are properly initialized.
     * These handlers are responsible for managing WebSocket connections and
     * distributing real-time data to connected clients.
     */
    @Test
    public void webSocketHandlersExist() {
        assertNotNull(applicationContext.getBean("positionWebSocketHandler"), 
                "Position WebSocket handler should be initialized");
        assertNotNull(applicationContext.getBean("inventoryWebSocketHandler"), 
                "Inventory WebSocket handler should be initialized");
        assertNotNull(applicationContext.getBean("locateWebSocketHandler"), 
                "Locate WebSocket handler should be initialized");
        assertNotNull(applicationContext.getBean("alertWebSocketHandler"), 
                "Alert WebSocket handler should be initialized");
    }

    /**
     * Verifies that the WebSocket configuration is properly initialized.
     * The WebSocket config defines endpoints, allowed origins, and other
     * connection parameters for real-time data streaming.
     */
    @Test
    public void webSocketConfigExists() {
        assertNotNull(applicationContext.getBean("webSocketConfig"), 
                "WebSocket configuration should be initialized");
    }

    /**
     * Verifies that all Kafka event listeners are properly initialized.
     * These listeners consume events from Kafka topics and forward them
     * to WebSocket clients for real-time updates.
     */
    @Test
    public void kafkaListenersExist() {
        assertNotNull(applicationContext.getBean("positionEventListener"), 
                "Position event listener should be initialized");
        assertNotNull(applicationContext.getBean("inventoryEventListener"), 
                "Inventory event listener should be initialized");
        assertNotNull(applicationContext.getBean("locateEventListener"), 
                "Locate event listener should be initialized");
        assertNotNull(applicationContext.getBean("alertEventListener"), 
                "Alert event listener should be initialized");
    }
}