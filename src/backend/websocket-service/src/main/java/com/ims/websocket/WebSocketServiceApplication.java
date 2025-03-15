package com.ims.websocket;

import org.springframework.boot.SpringApplication; // Spring Boot 3.1.0
import org.springframework.boot.autoconfigure.SpringBootApplication; // Spring Boot 3.1.0
import org.springframework.kafka.annotation.EnableKafka; // Spring Kafka 3.0.7
import lombok.extern.slf4j.Slf4j; // Lombok 1.18.26

/**
 * Main application class for the WebSocket Service in the Inventory Management System.
 * This service provides real-time data streaming capabilities for positions, inventory,
 * locates, and alerts to connected clients through WebSocket connections.
 * It consumes events from Kafka topics and forwards them to connected WebSocket clients.
 * 
 * The service is designed to handle high-throughput message processing (300,000+ events per second)
 * with low latency (under 200ms) to meet the real-time data distribution requirements
 * of the Inventory Management System.
 */
@SpringBootApplication
@EnableKafka
@Slf4j
public class WebSocketServiceApplication {

    /**
     * Entry point for the WebSocket Service application.
     * Bootstraps the Spring Boot application which enables WebSocket endpoints
     * and Kafka consumer listeners.
     * 
     * @param args Command line arguments passed to the application
     */
    public static void main(String[] args) {
        log.info("Starting WebSocket Service Application");
        SpringApplication.run(WebSocketServiceApplication.class, args);
        log.info("WebSocket Service Application started successfully");
    }
}