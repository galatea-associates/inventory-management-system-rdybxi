package com.ims.ingestion.config;

import com.ims.common.event.BaseEvent;
import com.ims.common.event.ReferenceDataEvent;
import com.ims.common.event.MarketDataEvent;
import com.ims.common.event.TradeDataEvent;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.common.serialization.StringDeserializer;

import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration class for Apache Kafka in the Data Ingestion Service.
 * Configures producers, consumers, and error handling for high-throughput 
 * event processing of reference data, market data, trade data, and contract data events.
 * 
 * This configuration supports:
 * - Processing 300,000+ events per second (F-501)
 * - Message delivery guarantees with at-least-once semantics (F-505)
 * - Event-driven architecture for loose coupling between services
 * - Specialized configurations for different event types
 */
@Configuration
@Slf4j
public class KafkaConfig {

    private final String bootstrapServers;
    private final String groupId;
    private final String referenceDataTopic;
    private final String marketDataTopic;
    private final String tradeDataTopic;
    private final String contractDataTopic;
    private final int concurrency;

    /**
     * Constructor with dependency injection for Kafka configuration properties
     * 
     * @param bootstrapServers Kafka broker addresses
     * @param groupId Consumer group ID
     * @param referenceDataTopic Topic for reference data events
     * @param marketDataTopic Topic for market data events
     * @param tradeDataTopic Topic for trade data events
     * @param contractDataTopic Topic for contract data events
     * @param concurrency Number of concurrent consumers
     */
    public KafkaConfig(
            @Value("${spring.kafka.bootstrap-servers}") String bootstrapServers,
            @Value("${spring.kafka.consumer.group-id}") String groupId,
            @Value("${spring.kafka.topics.reference-data}") String referenceDataTopic,
            @Value("${spring.kafka.topics.market-data}") String marketDataTopic,
            @Value("${spring.kafka.topics.trade-data}") String tradeDataTopic,
            @Value("${spring.kafka.topics.contract-data}") String contractDataTopic,
            @Value("${spring.kafka.listener.concurrency:5}") int concurrency) {
        this.bootstrapServers = bootstrapServers;
        this.groupId = groupId;
        this.referenceDataTopic = referenceDataTopic;
        this.marketDataTopic = marketDataTopic;
        this.tradeDataTopic = tradeDataTopic;
        this.contractDataTopic = contractDataTopic;
        this.concurrency = concurrency;
        log.info("Initializing Kafka configuration with bootstrap servers: {}", bootstrapServers);
    }

    /**
     * Creates the configuration properties for Kafka producers
     * 
     * @return Map of producer configuration properties
     */
    public Map<String, Object> producerConfigs() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        
        // High throughput settings
        props.put(ProducerConfig.ACKS_CONFIG, "all"); // Ensure durability
        props.put(ProducerConfig.RETRIES_CONFIG, 10); // Retry on failure
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384); // Batch messages
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432); // 32MB buffer
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy"); // Compress messages
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5); // Wait a bit for batching
        
        // Exactly-once delivery semantics
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1); // Preserve ordering
        
        return props;
    }

    /**
     * Creates the configuration properties for Kafka consumers
     * 
     * @return Map of consumer configuration properties
     */
    public Map<String, Object> consumerConfigs() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());
        
        // Trust packages for deserialization
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.ims.common.event,com.ims.ingestion.model");
        
        // High throughput settings
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500); // Process more records per poll
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024); // Minimum data to fetch
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500); // Max wait time for fetch
        
        // Disable auto-commit for manual control
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        
        return props;
    }

    /**
     * Creates a producer factory for Kafka producers
     * 
     * @return Factory for creating Kafka producers
     */
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        return new DefaultKafkaProducerFactory<>(producerConfigs());
    }

    /**
     * Creates a producer factory specifically for reference data events
     * 
     * @return Factory for creating reference data producers
     */
    @Bean
    public ProducerFactory<String, ReferenceDataEvent> referenceDataProducerFactory() {
        return new DefaultKafkaProducerFactory<>(producerConfigs());
    }

    /**
     * Creates a producer factory specifically for market data events
     * 
     * @return Factory for creating market data producers
     */
    @Bean
    public ProducerFactory<String, MarketDataEvent> marketDataProducerFactory() {
        return new DefaultKafkaProducerFactory<>(producerConfigs());
    }

    /**
     * Creates a producer factory specifically for trade data events
     * 
     * @return Factory for creating trade data producers
     */
    @Bean
    public ProducerFactory<String, TradeDataEvent> tradeDataProducerFactory() {
        return new DefaultKafkaProducerFactory<>(producerConfigs());
    }

    /**
     * Creates a generic Kafka template for sending messages
     * 
     * @return Template for sending Kafka messages
     */
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    /**
     * Creates a Kafka template specifically for reference data events
     * 
     * @return Template for sending reference data events
     */
    @Bean
    public KafkaTemplate<String, ReferenceDataEvent> referenceDataKafkaTemplate() {
        KafkaTemplate<String, ReferenceDataEvent> template = new KafkaTemplate<>(referenceDataProducerFactory());
        template.setDefaultTopic(referenceDataTopic);
        return template;
    }

    /**
     * Creates a Kafka template specifically for market data events
     * 
     * @return Template for sending market data events
     */
    @Bean
    public KafkaTemplate<String, MarketDataEvent> marketDataKafkaTemplate() {
        KafkaTemplate<String, MarketDataEvent> template = new KafkaTemplate<>(marketDataProducerFactory());
        template.setDefaultTopic(marketDataTopic);
        return template;
    }

    /**
     * Creates a Kafka template specifically for trade data events
     * 
     * @return Template for sending trade data events
     */
    @Bean
    public KafkaTemplate<String, TradeDataEvent> tradeDataKafkaTemplate() {
        KafkaTemplate<String, TradeDataEvent> template = new KafkaTemplate<>(tradeDataProducerFactory());
        template.setDefaultTopic(tradeDataTopic);
        return template;
    }

    /**
     * Creates a consumer factory for Kafka consumers
     * 
     * @return Factory for creating Kafka consumers
     */
    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        return new DefaultKafkaConsumerFactory<>(consumerConfigs());
    }

    /**
     * Creates a factory for Kafka listener containers
     * 
     * @return Factory for creating Kafka listener containers
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.setConcurrency(concurrency); // Set concurrency based on configuration
        factory.setCommonErrorHandler(errorHandler());
        factory.setBatchListener(true); // Enable batch listening for efficiency
        return factory;
    }

    /**
     * Creates an error handler for Kafka consumers
     * 
     * @return Error handler for Kafka consumers
     */
    @Bean
    public CommonErrorHandler errorHandler() {
        // Create a backoff policy: retry every 1 second, up to 10 times
        FixedBackOff fixedBackOff = new FixedBackOff(1000L, 10L);
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(fixedBackOff);
        
        // Configure to log errors before retrying
        errorHandler.setLogLevel(org.springframework.kafka.listener.LoggingErrorHandler.Level.ERROR);
        
        // Configure specific exceptions to retry or not retry
        // errorHandler.addNotRetryableExceptions(InvalidMessageException.class);
        // errorHandler.addRetryableExceptions(TransientException.class);
        
        return errorHandler;
    }
}