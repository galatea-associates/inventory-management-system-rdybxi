package com.ims.calculation.config;

import com.ims.common.event.BaseEvent;
import com.ims.common.event.PositionEvent;
import com.ims.common.event.MarketDataEvent;
import com.ims.common.event.InventoryEvent;
import com.ims.common.event.WorkflowEvent;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.util.backoff.FixedBackOff;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.common.serialization.StringDeserializer;

import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration class for Apache Kafka in the Calculation Service.
 * Defines Kafka producers, consumers, serializers, deserializers, and error handling
 * for high-throughput event processing. This configuration supports the event-driven
 * architecture of the Inventory Management System, enabling the processing of
 * 300,000+ events per second with guaranteed delivery semantics.
 */
@Configuration
@Slf4j
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id}")
    private String consumerGroupId;

    @Value("${spring.kafka.topics.position-event}")
    private String positionEventTopic;

    @Value("${spring.kafka.topics.inventory-event}")
    private String inventoryEventTopic;

    @Value("${spring.kafka.topics.market-data-event}")
    private String marketDataEventTopic;
    
    @Value("${spring.kafka.topics.workflow-event}")
    private String workflowEventTopic;
    
    @Value("${spring.kafka.listener.concurrency}")
    private Integer concurrency;
    
    /**
     * Creates producer configuration properties with optimized settings
     * for high-throughput event processing.
     *
     * @return Map of producer configuration properties
     */
    @Bean
    public Map<String, Object> producerConfigs() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 10);
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");
        return props;
    }

    /**
     * Creates consumer configuration properties with optimized settings
     * for high-throughput event processing.
     *
     * @return Map of consumer configuration properties
     */
    @Bean
    public Map<String, Object> consumerConfigs() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, consumerGroupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024);
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.ims.common.event");
        return props;
    }

    /**
     * Creates a producer factory for position events.
     *
     * @return Producer factory for position events
     */
    @Bean
    public ProducerFactory<String, PositionEvent> positionEventProducerFactory() {
        return new DefaultKafkaProducerFactory<>(producerConfigs());
    }

    /**
     * Creates a Kafka template for sending position events.
     *
     * @return Kafka template for position events
     */
    @Bean
    public KafkaTemplate<String, PositionEvent> positionEventKafkaTemplate() {
        return new KafkaTemplate<>(positionEventProducerFactory());
    }

    /**
     * Creates a producer factory for inventory events.
     *
     * @return Producer factory for inventory events
     */
    @Bean
    public ProducerFactory<String, InventoryEvent> inventoryEventProducerFactory() {
        return new DefaultKafkaProducerFactory<>(producerConfigs());
    }

    /**
     * Creates a Kafka template for sending inventory events.
     *
     * @return Kafka template for inventory events
     */
    @Bean
    public KafkaTemplate<String, InventoryEvent> inventoryEventKafkaTemplate() {
        return new KafkaTemplate<>(inventoryEventProducerFactory());
    }

    /**
     * Creates a consumer factory for position events.
     *
     * @return Consumer factory for position events
     */
    @Bean
    public ConsumerFactory<String, PositionEvent> positionEventConsumerFactory() {
        DefaultKafkaConsumerFactory<String, PositionEvent> factory = new DefaultKafkaConsumerFactory<>(consumerConfigs());
        factory.setValueDeserializer(new JsonDeserializer<>(PositionEvent.class));
        return factory;
    }

    /**
     * Creates a Kafka listener container factory for position events.
     * Configures concurrency, error handling, and manual acknowledgment.
     *
     * @return Listener container factory for position events
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, PositionEvent> positionEventKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, PositionEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(positionEventConsumerFactory());
        factory.setConcurrency(concurrency);
        factory.setBatchListener(false);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        return factory;
    }

    /**
     * Creates a consumer factory for market data events.
     *
     * @return Consumer factory for market data events
     */
    @Bean
    public ConsumerFactory<String, MarketDataEvent> marketDataEventConsumerFactory() {
        DefaultKafkaConsumerFactory<String, MarketDataEvent> factory = new DefaultKafkaConsumerFactory<>(consumerConfigs());
        factory.setValueDeserializer(new JsonDeserializer<>(MarketDataEvent.class));
        return factory;
    }

    /**
     * Creates a Kafka listener container factory for market data events.
     * Configures concurrency, error handling, and manual acknowledgment.
     *
     * @return Listener container factory for market data events
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, MarketDataEvent> marketDataEventKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, MarketDataEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(marketDataEventConsumerFactory());
        factory.setConcurrency(concurrency);
        factory.setBatchListener(false);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        return factory;
    }

    /**
     * Creates a consumer factory for workflow events.
     *
     * @return Consumer factory for workflow events
     */
    @Bean
    public ConsumerFactory<String, WorkflowEvent> workflowEventConsumerFactory() {
        DefaultKafkaConsumerFactory<String, WorkflowEvent> factory = new DefaultKafkaConsumerFactory<>(consumerConfigs());
        factory.setValueDeserializer(new JsonDeserializer<>(WorkflowEvent.class));
        return factory;
    }

    /**
     * Creates a Kafka listener container factory for workflow events.
     * Configures concurrency, error handling, and manual acknowledgment.
     *
     * @return Listener container factory for workflow events
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, WorkflowEvent> workflowEventKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, WorkflowEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(workflowEventConsumerFactory());
        factory.setConcurrency(concurrency);
        factory.setBatchListener(false);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        return factory;
    }

    /**
     * Creates a default error handler for Kafka consumers with retry capabilities.
     * Configures which exceptions should not be retried and adds logging for retries.
     *
     * @return Error handler for Kafka consumers
     */
    @Bean
    public DefaultErrorHandler kafkaErrorHandler() {
        FixedBackOff fixedBackOff = new FixedBackOff(1000L, 3); // 1-second backoff, 3 retries
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(fixedBackOff);
        
        // Non-recoverable exceptions should not be retried
        errorHandler.addNotRetryableExceptions(
            IllegalArgumentException.class,
            IllegalStateException.class,
            JsonDeserializer.Exception.class
        );
        
        // Add logging for retryable exceptions
        errorHandler.setRetryListeners((record, ex, deliveryAttempt) -> {
            log.warn("Retrying message delivery (attempt {}): {} due to error: {}", 
                    deliveryAttempt, record.value(), ex.getMessage(), ex);
        });
        
        return errorHandler;
    }
}