package com.ims.monitoring;

import com.ims.monitoring.config.PrometheusConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application class for the Monitoring Service component of the Inventory Management System.
 * Initializes and configures the Spring Boot application that provides comprehensive monitoring
 * capabilities including metrics collection, health checks, and alerting.
 * 
 * This service implements:
 * - F-503 System Monitoring with comprehensive metrics collection for infrastructure and application components
 * - Monitoring Infrastructure with centralized metrics collection, storage, and visualization
 * - Health Check Implementation with multi-level service health monitoring (liveness, readiness, dependency checks)
 * - Alert Management System with configurable alerting and notification capabilities
 * 
 * The Monitoring Service enables the IMS to achieve its high availability requirements (99.999% uptime)
 * by providing real-time visibility into system performance and health, allowing for proactive
 * issue detection and resolution before they impact user experience.
 */
@SpringBootApplication
@EnableScheduling
@EnableDiscoveryClient
@Import(PrometheusConfig.class)
@Slf4j
public class MonitoringServiceApplication {

    /**
     * Main entry point for the Monitoring Service application
     *
     * @param args Command-line arguments passed to the application
     */
    public static void main(String[] args) {
        log.info("Starting Monitoring Service Application...");
        SpringApplication.run(MonitoringServiceApplication.class, args);
        log.info("Monitoring Service Application initialized successfully");
    }
}