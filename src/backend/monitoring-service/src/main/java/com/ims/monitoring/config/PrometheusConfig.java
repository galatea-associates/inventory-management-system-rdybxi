package com.ims.monitoring.config;

import com.ims.monitoring.service.MetricsService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.prometheus.PrometheusMeterRegistry;
import io.prometheus.client.CollectorRegistry;
import io.prometheus.client.exporter.PushGateway;
import io.prometheus.client.hotspot.DefaultExports;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;

import jakarta.annotation.PostConstruct;

/**
 * Configuration class for Prometheus metrics collection in the Inventory Management System.
 * Configures Prometheus registry, exporters, collectors, and custom metrics to enable comprehensive
 * monitoring of system performance, health, and business operations.
 */
@Configuration
@Slf4j
public class PrometheusConfig {

    @Value("${spring.application.name:ims-monitoring-service}")
    private String applicationName;

    @Value("${monitoring.prometheus.push-gateway.enabled:false}")
    private boolean pushGatewayEnabled;

    @Value("${monitoring.prometheus.push-gateway.url:localhost:9091}")
    private String pushGatewayUrl;

    @Value("${monitoring.prometheus.push-gateway.job:ims-monitoring-service}")
    private String pushGatewayJob;

    @Value("${monitoring.prometheus.push-gateway.interval:60000}")
    private long pushGatewayInterval;

    @Value("${monitoring.prometheus.step-size:60s}")
    private String stepSize;

    private final MetricsService metricsService;
    private final Environment environment;
    private PrometheusMeterRegistry prometheusRegistry;
    private PushGateway pushGateway;

    /**
     * Constructor with dependency injection for MetricsService
     * 
     * @param metricsService Service for managing metrics
     * @param environment Spring environment for accessing profiles
     */
    public PrometheusConfig(MetricsService metricsService, Environment environment) {
        this.metricsService = metricsService;
        this.environment = environment;
    }

    /**
     * Creates and configures a Prometheus meter registry
     * 
     * @return Configured Prometheus meter registry
     */
    @Bean
    public PrometheusMeterRegistry prometheusRegistry() {
        // Create a new CollectorRegistry for Prometheus metrics
        CollectorRegistry collectorRegistry = new CollectorRegistry();
        
        // Create a new PrometheusMeterRegistry with the collector registry
        prometheusRegistry = new PrometheusMeterRegistry(io.micrometer.prometheus.PrometheusConfig.DEFAULT, collectorRegistry, io.micrometer.core.instrument.Clock.SYSTEM);
        
        // Register JVM metrics with DefaultExports
        DefaultExports.initialize();
        
        log.info("Initialized Prometheus MeterRegistry");
        return prometheusRegistry;
    }

    /**
     * Creates a Prometheus PushGateway client if enabled
     * 
     * @return Configured PushGateway client or null if disabled
     */
    @Bean
    public PushGateway pushGateway() {
        if (pushGatewayEnabled) {
            pushGateway = new PushGateway(pushGatewayUrl);
            log.info("Initialized Prometheus PushGateway at {}", pushGatewayUrl);
            return pushGateway;
        }
        
        log.info("Prometheus PushGateway is disabled");
        return null;
    }

    /**
     * Customizes the Micrometer MeterRegistry with common tags
     * 
     * @return Customizer for the meter registry
     */
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> meterRegistryCustomizer() {
        return registry -> {
            // Add common tags to all metrics
            String activeProfile = environment.getActiveProfiles().length > 0 ? 
                environment.getActiveProfiles()[0] : "default";
                
            registry.config()
                .commonTags("application", applicationName)
                .commonTags("service", "monitoring-service")
                .commonTags("environment", activeProfile);
            
            log.info("Customized MeterRegistry with common tags");
        };
    }

    /**
     * Initializes custom metrics after bean construction
     */
    @PostConstruct
    public void initializeMetrics() {
        log.info("Initializing custom metrics for Prometheus");
        
        try {
            // Register system resource metrics (CPU, memory, disk, network)
            registerSystemMetrics();
            
            // Register JVM metrics (heap, non-heap, GC, threads)
            registerJvmMetrics();
            
            // Register application metrics (requests, errors, latency)
            registerApplicationMetrics();
            
            // Register business metrics (event processing, calculations)
            registerBusinessMetrics();
            
            // Register database metrics (connections, queries)
            registerDatabaseMetrics();
            
            // Register integration metrics (API calls, message queues)
            registerIntegrationMetrics();
            
            log.info("Custom metrics initialization completed successfully");
        } catch (Exception e) {
            log.error("Error initializing custom metrics", e);
        }
    }
    
    private void registerSystemMetrics() {
        // CPU metrics
        io.micrometer.core.instrument.Gauge.builder("system.cpu.usage", 
                () -> {
                    Object value = metricsService.getMetricValue("system.cpu.processLoad");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("CPU usage percentage")
                .register(prometheusRegistry);
        
        // Memory metrics
        io.micrometer.core.instrument.Gauge.builder("system.memory.used", 
                () -> {
                    Object value = metricsService.getMetricValue("system.memory.used");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Memory usage in bytes")
                .baseUnit("bytes")
                .register(prometheusRegistry);
        
        // Disk metrics
        io.micrometer.core.instrument.Gauge.builder("system.disk.free", 
                () -> {
                    Object value = metricsService.getMetricValue("system.disk.free");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Free disk space in bytes")
                .baseUnit("bytes")
                .register(prometheusRegistry);
        
        // Network metrics
        io.micrometer.core.instrument.Gauge.builder("system.network.rx", 
                () -> {
                    Object value = metricsService.getMetricValue("system.network.received");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Network bytes received")
                .baseUnit("bytes")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Gauge.builder("system.network.tx", 
                () -> {
                    Object value = metricsService.getMetricValue("system.network.sent");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Network bytes transmitted")
                .baseUnit("bytes")
                .register(prometheusRegistry);
        
        log.debug("Registered system resource metrics");
    }
    
    private void registerJvmMetrics() {
        // JVM heap metrics
        io.micrometer.core.instrument.Gauge.builder("jvm.memory.heap.used.percentage", 
                () -> {
                    Object used = metricsService.getMetricValue("jvm.memory.heap.used");
                    Object max = metricsService.getMetricValue("jvm.memory.heap.max");
                    if (used instanceof Number && max instanceof Number && ((Number) max).doubleValue() > 0) {
                        return ((Number) used).doubleValue() / ((Number) max).doubleValue();
                    }
                    return 0.0;
                })
                .description("JVM heap memory usage percentage")
                .register(prometheusRegistry);
        
        // JVM non-heap metrics
        io.micrometer.core.instrument.Gauge.builder("jvm.memory.nonheap.used", 
                () -> {
                    Object value = metricsService.getMetricValue("jvm.memory.nonheap.used");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("JVM non-heap memory used")
                .baseUnit("bytes")
                .register(prometheusRegistry);
        
        // Thread metrics
        io.micrometer.core.instrument.Gauge.builder("jvm.threads.active", 
                () -> {
                    Object value = metricsService.getMetricValue("jvm.threads.count");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Number of active JVM threads")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Gauge.builder("jvm.threads.daemon", 
                () -> {
                    Object value = metricsService.getMetricValue("jvm.threads.daemon");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Number of daemon threads")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Gauge.builder("jvm.threads.peak", 
                () -> {
                    Object value = metricsService.getMetricValue("jvm.threads.peak");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Peak thread count")
                .register(prometheusRegistry);
        
        log.debug("Registered JVM metrics");
    }
    
    private void registerApplicationMetrics() {
        // HTTP request metrics
        io.micrometer.core.instrument.Gauge.builder("application.requests.active", 
                () -> {
                    Object value = metricsService.getMetricValue("http.server.requests.active");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Number of active HTTP requests")
                .register(prometheusRegistry);
        
        // Request latency metrics
        io.micrometer.core.instrument.Timer.builder("application.request.latency")
                .description("HTTP request processing time")
                .register(prometheusRegistry);
        
        // Error metrics
        io.micrometer.core.instrument.Counter.builder("application.errors")
                .description("Number of application errors")
                .register(prometheusRegistry);
        
        // Connection pool metrics
        io.micrometer.core.instrument.Gauge.builder("application.connections.active", 
                () -> {
                    Object value = metricsService.getMetricValue("http.server.connections.active");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Number of active HTTP connections")
                .register(prometheusRegistry);
        
        log.debug("Registered application metrics");
    }
    
    private void registerBusinessMetrics() {
        // Event processing metrics
        io.micrometer.core.instrument.Counter.builder("business.events.processed")
                .description("Number of events processed")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Timer.builder("business.events.processing.time")
                .description("Event processing time")
                .register(prometheusRegistry);
        
        // Calculation metrics
        io.micrometer.core.instrument.Timer.builder("business.calculations.time")
                .description("Calculation processing time")
                .register(prometheusRegistry);
        
        // Inventory metrics
        io.micrometer.core.instrument.Gauge.builder("business.inventory.utilization", 
                () -> {
                    Object value = metricsService.getMetricValue("business.inventory.utilization");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Inventory utilization percentage")
                .register(prometheusRegistry);
        
        // Locate request metrics
        io.micrometer.core.instrument.Counter.builder("business.locates.requests")
                .description("Number of locate requests received")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Counter.builder("business.locates.approvals")
                .description("Number of locate requests approved")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Timer.builder("business.locates.processing.time")
                .description("Locate request processing time")
                .register(prometheusRegistry);
        
        // Short sell validation metrics
        io.micrometer.core.instrument.Counter.builder("business.shortsell.validations")
                .description("Number of short sell validations")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Timer.builder("business.shortsell.validation.time")
                .description("Short sell validation time")
                .register(prometheusRegistry);
        
        log.debug("Registered business metrics");
    }
    
    private void registerDatabaseMetrics() {
        // Connection metrics
        io.micrometer.core.instrument.Gauge.builder("db.connections.active", 
                () -> {
                    Object value = metricsService.getMetricValue("db.connections.active");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Number of active database connections")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Gauge.builder("db.connections.idle", 
                () -> {
                    Object value = metricsService.getMetricValue("db.connections.idle");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Number of idle database connections")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Gauge.builder("db.connections.max", 
                () -> {
                    Object value = metricsService.getMetricValue("db.connections.max");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Maximum number of database connections")
                .register(prometheusRegistry);
        
        // Query metrics
        io.micrometer.core.instrument.Timer.builder("db.query.time")
                .description("Database query execution time")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Counter.builder("db.query.slow")
                .description("Number of slow database queries")
                .register(prometheusRegistry);
        
        log.debug("Registered database metrics");
    }
    
    private void registerIntegrationMetrics() {
        // API call metrics
        io.micrometer.core.instrument.Counter.builder("integration.api.calls")
                .description("Number of external API calls")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Timer.builder("integration.api.response.time")
                .description("External API response time")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Counter.builder("integration.api.errors")
                .description("Number of external API errors")
                .register(prometheusRegistry);
        
        // Message queue metrics
        io.micrometer.core.instrument.Gauge.builder("integration.queue.depth", 
                () -> {
                    Object value = metricsService.getMetricValue("integration.queue.depth");
                    return value instanceof Number ? ((Number) value).doubleValue() : 0.0;
                })
                .description("Message queue depth")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Counter.builder("integration.messages.processed")
                .description("Number of messages processed")
                .register(prometheusRegistry);
        
        io.micrometer.core.instrument.Counter.builder("integration.messages.errors")
                .description("Number of message processing errors")
                .register(prometheusRegistry);
        
        log.debug("Registered integration metrics");
    }

    /**
     * Periodically pushes metrics to Prometheus PushGateway if enabled
     */
    @Scheduled(fixedRateString = "${monitoring.prometheus.push-gateway.interval:60000}")
    public void pushMetrics() {
        if (pushGatewayEnabled && pushGateway != null && prometheusRegistry != null) {
            try {
                // Get the CollectorRegistry from the prometheusRegistry
                CollectorRegistry collectorRegistry = prometheusRegistry.getPrometheusRegistry();
                
                // Push the metrics to the PushGateway
                pushGateway.pushAdd(collectorRegistry, pushGatewayJob);
                
                log.debug("Successfully pushed metrics to Prometheus PushGateway");
            } catch (Exception e) {
                log.error("Failed to push metrics to Prometheus PushGateway: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * Creates a custom metrics collector that integrates with the MetricsService
     * 
     * @return Registry with custom metrics collectors
     */
    @Bean
    public CollectorRegistry customMetricsCollector() {
        // Create a new CollectorRegistry for custom metrics
        CollectorRegistry registry = new CollectorRegistry();
        
        try {
            // This collector registry allows for direct integration with the MetricsService
            // to expose metrics that may not fit well within the standard Micrometer model.
            // The registry can be used for exposing complex business metrics or aggregations
            // that are calculated by the MetricsService.
            
            // Custom collectors would be registered here to expose specific metrics
            // from the MetricsService that aren't already covered by standard metrics.
            
            // The collector approach allows more flexibility in how metrics are exposed to Prometheus,
            // especially for metrics that require custom labeling or complex derivation logic.
            
            log.info("Registered custom metrics collector");
        } catch (Exception e) {
            log.error("Error registering custom metrics collector", e);
        }
        
        return registry;
    }
}