package com.ims.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import lombok.extern.slf4j.Slf4j;

/**
 * Configuration class that provides standardized Jackson ObjectMapper configuration 
 * for consistent JSON serialization/deserialization across all services.
 * 
 * This configuration ensures:
 * - Proper handling of Java 8 date/time types (ISO-8601 format)
 * - Support for Optional and other JDK 8 types
 * - Parameter names for constructors
 * - Forward compatibility through ignoring unknown properties
 * - Performance optimizations for high-throughput event processing
 * 
 * This standardization is critical for the event-driven architecture to ensure
 * consistent message formats across all services of the Inventory Management System.
 */
@Configuration
@Slf4j
public class CommonJacksonConfig {

    /**
     * Creates and configures a standard ObjectMapper with optimized settings for the IMS.
     * This mapper is configured for high-throughput JSON processing with consistent
     * handling of date/time types and other complex Java objects.
     *
     * @return Configured ObjectMapper instance
     */
    @Bean
    public ObjectMapper objectMapper() {
        log.debug("Configuring standard ObjectMapper for IMS");
        
        return JsonMapper.builder()
                // Add support for Java 8 date/time types
                .addModule(new JavaTimeModule())
                // Add support for JDK 8 types like Optional
                .addModule(new Jdk8Module())
                // Add support for constructor parameter names
                .addModule(new ParameterNamesModule())
                // Use ISO-8601 format for dates
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                // Ensure forward compatibility
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                // Include properties with default view
                .enable(MapperFeature.DEFAULT_VIEW_INCLUSION)
                // Performance optimizations
                .disable(SerializationFeature.FLUSH_AFTER_WRITE_VALUE) // Improves performance for streaming
                .disable(DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE) // Preserves timezone information
                // Memory optimizations
                .disable(MapperFeature.AUTO_DETECT_IS_GETTERS) // Reduces reflection overhead
                // Order map entries for consistent serialization
                .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
                // Build the mapper
                .build();
    }

    /**
     * Creates a Jackson2ObjectMapperBuilder with standard configuration for Spring components.
     * This builder ensures that all Spring-managed JSON conversion uses consistent settings.
     *
     * @return Configured builder for Spring's Jackson integration
     */
    @Bean
    public Jackson2ObjectMapperBuilder jackson2ObjectMapperBuilder() {
        log.debug("Configuring Jackson2ObjectMapperBuilder for Spring components");
        
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();
        
        // Configure modules
        builder.modules(
                new JavaTimeModule(),
                new Jdk8Module(),
                new ParameterNamesModule()
        );
        
        // Configure serialization features
        builder.featuresToDisable(
                SerializationFeature.WRITE_DATES_AS_TIMESTAMPS,
                SerializationFeature.FLUSH_AFTER_WRITE_VALUE
        );
        builder.featuresToEnable(
                SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS
        );
        
        // Configure deserialization features
        builder.featuresToDisable(
                DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE
        );
        
        // Configure mapper features
        builder.featuresToEnable(
                MapperFeature.DEFAULT_VIEW_INCLUSION
        );
        
        builder.featuresToDisable(
                MapperFeature.AUTO_DETECT_IS_GETTERS
        );
        
        return builder;
    }

    /**
     * Applies standard customizations to an existing ObjectMapper instance.
     * This is useful for customizing ObjectMappers that are created outside of Spring context
     * or by third-party libraries.
     *
     * @param objectMapper The ObjectMapper to customize
     * @return The customized ObjectMapper instance
     */
    public ObjectMapper customizeObjectMapper(ObjectMapper objectMapper) {
        log.debug("Customizing existing ObjectMapper with IMS standard configuration");
        
        if (objectMapper == null) {
            log.warn("Null ObjectMapper provided to customizeObjectMapper, creating new instance");
            return objectMapper();
        }
        
        // Register modules if not already registered
        if (!objectMapper.getRegisteredModuleIds().contains(JavaTimeModule.class.getName())) {
            log.debug("Registering JavaTimeModule");
            objectMapper.registerModule(new JavaTimeModule());
        }
        
        if (!objectMapper.getRegisteredModuleIds().contains(Jdk8Module.class.getName())) {
            log.debug("Registering Jdk8Module");
            objectMapper.registerModule(new Jdk8Module());
        }
        
        if (!objectMapper.getRegisteredModuleIds().contains(ParameterNamesModule.class.getName())) {
            log.debug("Registering ParameterNamesModule");
            objectMapper.registerModule(new ParameterNamesModule());
        }
        
        // Configure serialization features
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        objectMapper.disable(SerializationFeature.FLUSH_AFTER_WRITE_VALUE);
        objectMapper.enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
        
        // Configure deserialization features
        objectMapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        objectMapper.disable(DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE);
        
        // Configure mapper features
        objectMapper.enable(MapperFeature.DEFAULT_VIEW_INCLUSION);
        objectMapper.disable(MapperFeature.AUTO_DETECT_IS_GETTERS);
        
        return objectMapper;
    }
}