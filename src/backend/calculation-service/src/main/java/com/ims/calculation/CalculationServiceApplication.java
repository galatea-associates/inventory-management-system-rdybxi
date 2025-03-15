package com.ims.calculation;

import org.springframework.boot.SpringApplication;  // Spring Boot 3.1.0
import org.springframework.boot.autoconfigure.SpringBootApplication;  // Spring Boot 3.1.0
import org.springframework.scheduling.annotation.EnableAsync;  // Spring 6.0.9
import org.springframework.kafka.annotation.EnableKafka;  // Spring Kafka 3.0.7
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;  // Spring Cloud 4.0.3
import org.springframework.context.annotation.Import;  // Spring 6.0.9

import com.ims.calculation.config.KafkaConfig;
import com.ims.calculation.config.HazelcastConfig;
import com.ims.calculation.config.SecurityConfig;

/**
 * Main application class for the Calculation Service in the Inventory Management System.
 * <p>
 * This service provides high-performance calculation capabilities for:
 * - Real-time position and settlement ladder calculations (F-201)
 * - For loan availability calculations (F-202)
 * - Long and short sell availability calculations (F-205)
 * <p>
 * The service is designed to support:
 * - Processing 300,000+ events per second with end-to-end latency under 200ms (F-501)
 * - 99.999% uptime during 24x6 operational hours (F-502)
 */
@SpringBootApplication
@EnableAsync
@EnableKafka
@EnableDiscoveryClient
@Import({KafkaConfig.class, HazelcastConfig.class, SecurityConfig.class})
public class CalculationServiceApplication {

    /**
     * Main entry point for the Calculation Service application.
     * 
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(CalculationServiceApplication.class, args);
    }
}