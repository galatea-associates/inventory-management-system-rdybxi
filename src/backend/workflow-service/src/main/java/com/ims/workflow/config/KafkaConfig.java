package com.ims.workflow.config;

import com.ims.common.event.BaseEvent;
import com.ims.common.event.InventoryEvent;
import com.ims.common.event.LocateEvent;
import com.ims.common.event.WorkflowEvent;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.springframework.util.backoff.FixedBackOff;
import org.springframework.beans.factory.annotation.Value;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;

import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration class for Kafka messaging in the Workflow Service.
 * Sets up producers, consumers, error handlers, and topic configurations for high-throughput,
 * reliable event processing to support the workflow service's communications with other
 * microservices in the Inventory Management System.
 * 
 * This configuration supports:
 * - High-throughput message processing (300,000+ events per second)
 * - Message delivery guarantees with at-least-once semantics
 * - Event-driven architecture for Locate and Short Sell approval workflows
 * - Type-specific event handling for different message types
 */
@Configuration
@EnableKafka
@Slf4j
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id}")
    private String groupId;

    @Value("${spring.kafka.topics.workflow-event}")
    private String workflowEventTopic;

    @Value("${spring.kafka.topics.locate-event}")
    private String locateEventTopic;

    @Value("${spring.kafka.topics.inventory-event}")
    private String inventoryEventTopic;

    @Value("${spring.kafka.topics.limit-event}")
    private String limitEventTopic;

    @Value("${spring.kafka.listener.concurrency:10}")
    private Integer concurrency;

    private final String trustedPackages = "com.ims.common.event,com.ims.workflow.model";

    /**
     * Creates the configuration properties for Kafka producers.
     * Optimized for high-throughput, reliable delivery with compression and batching.
     *
     * @return Map of producer configuration properties
     */
    @Bean
    public Map<String, Object> producerConfigs() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        
        // For durability and reliability
        props.put(ProducerConfig.ACKS_CONFIG, "all");                           // Wait for all replicas to acknowledge
        props.put(ProducerConfig.RETRIES_CONFIG, 10);                           // Retry on temporary failures
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);              // Prevent duplicate messages
        
        // For performance optimization
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);                     // 16KB batch size
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5);                          // Wait up to 5ms to batch messages
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);               // 32MB buffer
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");            // Compress messages
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1);     // Ensure message ordering

        return props;
    }

    /**
     * Creates a producer factory with the producer configuration.
     *
     * @return Factory for creating Kafka producers
     */
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        return new DefaultKafkaProducerFactory<>(producerConfigs());
    }

    /**
     * Creates a Kafka template for sending messages.
     *
     * @return Template for sending Kafka messages
     */
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    /**
     * Creates the configuration properties for Kafka consumers.
     * Optimized for reliable message consumption with appropriate deserializers.
     *
     * @return Map of consumer configuration properties
     */
    @Bean
    public Map<String, Object> consumerConfigs() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");         // Start from earliest offset if no committed offset
        
        // Deserializers
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class); // Wrap deserializer with error handler
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, trustedPackages);          // Security measure
        
        // Performance optimization
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);                 // Process up to 500 records per poll
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024);                 // Wait until 1KB of data is available
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);                // Wait up to 500ms for data
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);             // Manual commit for better control

        return props;
    }

    /**
     * Creates a consumer factory with the consumer configuration.
     *
     * @return Factory for creating Kafka consumers
     */
    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        return new DefaultKafkaConsumerFactory<>(consumerConfigs());
    }

    /**
     * Creates a Kafka listener container factory for processing messages.
     * Configures concurrency, error handling, and batch processing.
     *
     * @return Factory for creating Kafka listener containers
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.setConcurrency(concurrency);                   // Multiple consumer threads
        factory.setCommonErrorHandler(kafkaErrorHandler());    // Handle exceptions during processing
        factory.setBatchListener(true);                        // Process messages in batches for better throughput
        return factory;
    }

    /**
     * Creates an error handler for Kafka consumer exceptions.
     * Configures retry behavior with fixed backoff strategy.
     *
     * @return Error handler for Kafka consumers
     */
    @Bean
    public CommonErrorHandler kafkaErrorHandler() {
        // 1 second retry interval, 3 max attempts
        FixedBackOff fixedBackOff = new FixedBackOff(1000L, 3L);
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(fixedBackOff);
        
        // Log errors at appropriate level
        errorHandler.setLogLevel(org.springframework.kafka.listener.LoggingErrorHandler.Level.ERROR);
        
        // Configure specific exception handling
        // For example, don't retry on deserialization errors
        errorHandler.addNotRetryableExceptions(org.springframework.kafka.support.serializer.DeserializationException.class);
        
        // Do retry on network-related exceptions
        errorHandler.addRetryableExceptions(org.apache.kafka.common.errors.RetriableException.class);
        
        log.info("Configured Kafka error handler with {} retry attempts and {} ms backoff", 3, 1000);
        return errorHandler;
    }

    /**
     * Creates a specialized listener container factory for inventory events.
     * Optimized for higher concurrency due to high volume of inventory events.
     *
     * @return Factory for inventory event listeners
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, InventoryEvent> inventoryEventListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, InventoryEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        
        // Configure with type-specific deserializer
        Map<String, Object> props = consumerConfigs();
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, InventoryEvent.class.getName());
        ConsumerFactory<String, InventoryEvent> consumerFactory = new DefaultKafkaConsumerFactory<>(props);
        
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(concurrency * 2);              // Higher concurrency for inventory events
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.setBatchListener(true);
        
        log.info("Configured InventoryEvent listener factory with concurrency {}", concurrency * 2);
        return factory;
    }

    /**
     * Creates a specialized listener container factory for locate events.
     * Supports the locate approval workflow.
     *
     * @return Factory for locate event listeners
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, LocateEvent> locateEventListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, LocateEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        
        // Configure with type-specific deserializer
        Map<String, Object> props = consumerConfigs();
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, LocateEvent.class.getName());
        ConsumerFactory<String, LocateEvent> consumerFactory = new DefaultKafkaConsumerFactory<>(props);
        
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(concurrency);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.setBatchListener(true);
        
        log.info("Configured LocateEvent listener factory with concurrency {}", concurrency);
        return factory;
    }

    /**
     * Creates a specialized listener container factory for workflow events.
     * Core component for workflow state management.
     *
     * @return Factory for workflow event listeners
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, WorkflowEvent> workflowEventListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, WorkflowEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        
        // Configure with type-specific deserializer
        Map<String, Object> props = consumerConfigs();
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, WorkflowEvent.class.getName());
        ConsumerFactory<String, WorkflowEvent> consumerFactory = new DefaultKafkaConsumerFactory<>(props);
        
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(concurrency);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.setBatchListener(true);
        
        log.info("Configured WorkflowEvent listener factory with concurrency {}", concurrency);
        return factory;
    }
}