package com.ims.ingestion;

import org.springframework.boot.SpringApplication; // Spring Boot 3.1.0
import org.springframework.boot.autoconfigure.SpringBootApplication; // Spring Boot 3.1.0
import org.springframework.cloud.openfeign.EnableFeignClients; // Spring Cloud OpenFeign 4.0.3
import org.springframework.kafka.annotation.EnableKafka; // Spring Kafka 3.0.5
import org.springframework.scheduling.annotation.EnableScheduling; // Spring Framework 6.0.9
import org.springframework.retry.annotation.EnableRetry; // Spring Retry 2.0.1
import io.swagger.v3.oas.annotations.OpenAPIDefinition; // SpringDoc OpenAPI 2.2.0
import io.swagger.v3.oas.annotations.info.Info; // SpringDoc OpenAPI 2.2.0

/**
 * Main application class for the Data Ingestion Service in the Inventory Management System.
 * This service is responsible for ingesting and processing various types of data from external sources:
 * - Reference data (securities, counterparties, indices, aggregation units)
 * - Market data (prices, NAVs, volatility data)
 * - Trade data from trading systems
 * - Security financing contract data
 * 
 * The service is designed for high-throughput processing, capable of handling
 * over 300,000 events per second with end-to-end latency under 200ms.
 * 
 * This class serves as the entry point and provides configuration for the application,
 * enabling Feign clients for API integration, Kafka for message processing,
 * scheduling for batch operations, and retry mechanisms for resilient operations.
 */
@SpringBootApplication
@EnableFeignClients
@EnableKafka
@EnableScheduling
@EnableRetry
@OpenAPIDefinition(
    info = @Info(
        title = "Data Ingestion Service API",
        version = "1.0",
        description = "API for ingesting reference data, market data, trade data, and contract data from various sources"
    )
)
public class DataIngestionServiceApplication {

    /**
     * Entry point for the Data Ingestion Service application.
     * Bootstraps the Spring Boot application with all required configurations.
     *
     * @param args Command line arguments passed to the application
     */
    public static void main(String[] args) {
        SpringApplication.run(DataIngestionServiceApplication.class, args);
    }
}