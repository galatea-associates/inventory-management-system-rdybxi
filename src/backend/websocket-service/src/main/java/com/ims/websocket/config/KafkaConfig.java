package com.ims.websocket.config;

import com.ims.common.event.BaseEvent;
import com.ims.common.event.InventoryEvent;
import com.ims.common.event.LocateEvent;
import com.ims.common.event.PositionEvent;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.util.backoff.FixedBackOff;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration class for Kafka consumers in the WebSocket service.
 * This class sets up Kafka listener container factories for different event types
 * (position, inventory, locate, alert) with appropriate deserializers, error handlers,
 * and concurrency settings to support high-throughput event processing.
 * 
 * The WebSocket service uses these configurations to consume events from Kafka topics
 * and forward them to connected clients in real-time.
 */
@Configuration
@Slf4j
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id}")
    private String groupId;

    @Value("${spring.kafka.topics.position}")
    private String positionTopic;

    @Value("${spring.kafka.topics.inventory}")
    private String inventoryTopic;

    @Value("${spring.kafka.topics.locate}")
    private String locateTopic;

    @Value("${spring.kafka.topics.alert}")
    private String alertTopic;

    @Value("${spring.kafka.consumer.concurrency:5}")
    private Integer concurrency;

    @Value("${spring.kafka.consumer.max-poll-records:500}")
    private Integer maxPollRecords;

    /**
     * Creates a Kafka listener container factory for position events.
     * 
     * @return A factory for creating position event listener containers
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, PositionEvent> positionEventKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, PositionEvent> factory = 
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(positionEventConsumerFactory());
        factory.setConcurrency(concurrency);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.setBatchListener(true);
        
        log.info("Configured Position Event Kafka Listener Container Factory with concurrency: {}", concurrency);
        return factory;
    }

    /**
     * Creates a Kafka listener container factory for inventory events.
     * 
     * @return A factory for creating inventory event listener containers
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, InventoryEvent> inventoryEventKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, InventoryEvent> factory = 
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(inventoryEventConsumerFactory());
        factory.setConcurrency(concurrency);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.setBatchListener(true);
        
        log.info("Configured Inventory Event Kafka Listener Container Factory with concurrency: {}", concurrency);
        return factory;
    }

    /**
     * Creates a Kafka listener container factory for locate events.
     * 
     * @return A factory for creating locate event listener containers
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, LocateEvent> locateEventKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, LocateEvent> factory = 
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(locateEventConsumerFactory());
        factory.setConcurrency(concurrency);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.setBatchListener(true);
        
        log.info("Configured Locate Event Kafka Listener Container Factory with concurrency: {}", concurrency);
        return factory;
    }

    /**
     * Creates a Kafka listener container factory for alert events.
     * 
     * @return A factory for creating alert event listener containers
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, BaseEvent> baseEventKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, BaseEvent> factory = 
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(baseEventConsumerFactory());
        factory.setConcurrency(concurrency);
        factory.setCommonErrorHandler(kafkaErrorHandler());
        factory.setBatchListener(true);
        
        log.info("Configured Base Event Kafka Listener Container Factory with concurrency: {}", concurrency);
        return factory;
    }

    /**
     * Creates a consumer factory for position events.
     * 
     * @return Factory for creating position event consumers
     */
    @Bean
    public ConsumerFactory<String, PositionEvent> positionEventConsumerFactory() {
        Map<String, Object> props = getCommonConsumerConfigs();
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.ims.common.event");
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, PositionEvent.class.getName());
        
        return new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new ErrorHandlingDeserializer<>(new JsonDeserializer<>(PositionEvent.class))
        );
    }

    /**
     * Creates a consumer factory for inventory events.
     * 
     * @return Factory for creating inventory event consumers
     */
    @Bean
    public ConsumerFactory<String, InventoryEvent> inventoryEventConsumerFactory() {
        Map<String, Object> props = getCommonConsumerConfigs();
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.ims.common.event");
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, InventoryEvent.class.getName());
        
        return new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new ErrorHandlingDeserializer<>(new JsonDeserializer<>(InventoryEvent.class))
        );
    }

    /**
     * Creates a consumer factory for locate events.
     * 
     * @return Factory for creating locate event consumers
     */
    @Bean
    public ConsumerFactory<String, LocateEvent> locateEventConsumerFactory() {
        Map<String, Object> props = getCommonConsumerConfigs();
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.ims.common.event");
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, LocateEvent.class.getName());
        
        return new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new ErrorHandlingDeserializer<>(new JsonDeserializer<>(LocateEvent.class))
        );
    }

    /**
     * Creates a consumer factory for alert events.
     * 
     * @return Factory for creating alert event consumers
     */
    @Bean
    public ConsumerFactory<String, BaseEvent> baseEventConsumerFactory() {
        Map<String, Object> props = getCommonConsumerConfigs();
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.ims.common.event");
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, BaseEvent.class.getName());
        
        return new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new ErrorHandlingDeserializer<>(new JsonDeserializer<>(BaseEvent.class))
        );
    }

    /**
     * Creates common Kafka consumer configuration properties.
     * 
     * @return Map of Kafka consumer configuration properties
     */
    private Map<String, Object> getCommonConsumerConfigs() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, maxPollRecords);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.ims.common.event");
        
        // Performance tuning for high-throughput processing (F-501)
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024);
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        
        return props;
    }

    /**
     * Creates a common error handler for Kafka listeners.
     * 
     * @return Error handler for Kafka listeners
     */
    @Bean
    public CommonErrorHandler kafkaErrorHandler() {
        // Configure retry with fixed backoff (5 retries, 1000ms interval)
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(new FixedBackOff(1000L, 5));
        
        // Configure specific exceptions that should not be retried
        errorHandler.addNotRetryableExceptions(
                org.apache.kafka.common.errors.SerializationException.class,
                org.springframework.kafka.support.serializer.DeserializationException.class
        );
        
        log.info("Configured Kafka Error Handler with FixedBackOff(1000ms, 5 attempts)");
        return errorHandler;
    }
}