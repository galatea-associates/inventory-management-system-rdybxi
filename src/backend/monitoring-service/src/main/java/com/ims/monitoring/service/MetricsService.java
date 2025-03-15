package com.ims.monitoring.service;

import com.ims.monitoring.model.Alert;
import com.ims.monitoring.model.HealthStatus;
import com.ims.monitoring.model.ServiceStatus;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import io.micrometer.core.instrument.Tags;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.metrics.MetricsEndpoint;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.lang.management.ThreadMXBean;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Service responsible for collecting, processing, and exposing metrics about the Inventory Management System.
 * Provides comprehensive monitoring of system performance, health, and business operations to ensure
 * the system meets its high availability and performance requirements.
 */
@Service
@Slf4j
public class MetricsService {

    private static final String CATEGORY_SYSTEM = "system";
    private static final String CATEGORY_APPLICATION = "application";
    private static final String CATEGORY_BUSINESS = "business";
    private static final String CATEGORY_DATABASE = "database";
    private static final String CATEGORY_INTEGRATION = "integration";
    
    private static final int DEFAULT_HISTORY_SIZE = 100;
    private static final int DEFAULT_METRIC_RETENTION_HOURS = 24;

    @Autowired
    private MeterRegistry meterRegistry;
    
    @Autowired
    private MetricsEndpoint metricsEndpoint;
    
    @Autowired(required = false)
    private DataSource dataSource;
    
    // Map to store metric history: category -> metric name -> list of {timestamp, value} maps
    private final Map<String, Map<String, List<Map<String, Object>>>> metricsHistory = new ConcurrentHashMap<>();
    
    /**
     * Initializes the metrics history storage
     */
    public MetricsService() {
        metricsHistory.put(CATEGORY_SYSTEM, new ConcurrentHashMap<>());
        metricsHistory.put(CATEGORY_APPLICATION, new ConcurrentHashMap<>());
        metricsHistory.put(CATEGORY_BUSINESS, new ConcurrentHashMap<>());
        metricsHistory.put(CATEGORY_DATABASE, new ConcurrentHashMap<>());
        metricsHistory.put(CATEGORY_INTEGRATION, new ConcurrentHashMap<>());
    }
    
    /**
     * Collects system-level metrics including CPU, memory, disk, and network utilization
     */
    @Scheduled(fixedRateString = "${monitoring.metrics.system-collection-rate:15000}")
    public void collectSystemMetrics() {
        try {
            Map<String, Object> metrics = new HashMap<>();
            LocalDateTime timestamp = LocalDateTime.now();
            
            // Collect OS metrics
            OperatingSystemMXBean osMBean = ManagementFactory.getOperatingSystemMXBean();
            double systemLoadAverage = osMBean.getSystemLoadAverage();
            metrics.put("system.cpu.loadAverage", systemLoadAverage);
            
            // Try to access com.sun.management.OperatingSystemMXBean for more detailed metrics if available
            if (osMBean instanceof com.sun.management.OperatingSystemMXBean) {
                com.sun.management.OperatingSystemMXBean sunOsMBean = (com.sun.management.OperatingSystemMXBean) osMBean;
                double processCpuLoad = sunOsMBean.getProcessCpuLoad();
                long freePhysicalMemory = sunOsMBean.getFreePhysicalMemorySize();
                long totalPhysicalMemory = sunOsMBean.getTotalPhysicalMemorySize();
                
                metrics.put("system.cpu.processLoad", processCpuLoad);
                metrics.put("system.memory.free", freePhysicalMemory);
                metrics.put("system.memory.total", totalPhysicalMemory);
                metrics.put("system.memory.used", totalPhysicalMemory - freePhysicalMemory);
                
                // Record gauges in the meter registry
                Gauge.builder("system.cpu.process.load", () -> processCpuLoad)
                    .description("CPU load for the current process")
                    .register(meterRegistry);
                Gauge.builder("system.memory.used", () -> totalPhysicalMemory - freePhysicalMemory)
                    .description("Used physical memory")
                    .baseUnit("bytes")
                    .register(meterRegistry);
            }
            
            // Collect memory metrics
            MemoryMXBean memoryMBean = ManagementFactory.getMemoryMXBean();
            long heapMemoryUsed = memoryMBean.getHeapMemoryUsage().getUsed();
            long heapMemoryMax = memoryMBean.getHeapMemoryUsage().getMax();
            long nonHeapMemoryUsed = memoryMBean.getNonHeapMemoryUsage().getUsed();
            
            metrics.put("jvm.memory.heap.used", heapMemoryUsed);
            metrics.put("jvm.memory.heap.max", heapMemoryMax);
            metrics.put("jvm.memory.nonheap.used", nonHeapMemoryUsed);
            
            // Collect thread metrics
            ThreadMXBean threadMBean = ManagementFactory.getThreadMXBean();
            int threadCount = threadMBean.getThreadCount();
            int daemonThreadCount = threadMBean.getDaemonThreadCount();
            int peakThreadCount = threadMBean.getPeakThreadCount();
            
            metrics.put("jvm.threads.count", threadCount);
            metrics.put("jvm.threads.daemon", daemonThreadCount);
            metrics.put("jvm.threads.peak", peakThreadCount);
            
            // Record thread metrics in the meter registry
            Gauge.builder("jvm.threads.active", () -> threadCount)
                .description("Active thread count")
                .register(meterRegistry);
            
            // Store metrics in history
            storeMetrics(CATEGORY_SYSTEM, metrics, timestamp);
            
            log.debug("System metrics collected: {} metrics", metrics.size());
        } catch (Exception e) {
            log.error("Error collecting system metrics", e);
        }
    }

    /**
     * Collects application-level metrics including request rates, response times, error rates, and queue depths
     */
    @Scheduled(fixedRateString = "${monitoring.metrics.application-collection-rate:15000}")
    public void collectApplicationMetrics() {
        try {
            Map<String, Object> metrics = new HashMap<>();
            LocalDateTime timestamp = LocalDateTime.now();
            
            // Collect HTTP request metrics
            MetricsEndpoint.MetricResponse httpRequestsMetric = metricsEndpoint.metric("http.server.requests", null);
            if (httpRequestsMetric != null) {
                httpRequestsMetric.getMeasurements().forEach(measurement -> {
                    metrics.put("http.server.requests." + measurement.getStatistic().toString().toLowerCase(), measurement.getValue());
                });
            }
            
            // Collect error metrics
            Counter errorCounter = meterRegistry.find("application.errors").counter();
            if (errorCounter != null) {
                metrics.put("application.errors.count", errorCounter.count());
            }
            
            // Collect API endpoint metrics (this would require custom instrumentation in controllers)
            
            // Collect connection pool metrics
            if (dataSource != null) {
                try {
                    // This assumes HikariCP is being used, adjust if using a different connection pool
                    MetricsEndpoint.MetricResponse hikariConnectionsActive = 
                        metricsEndpoint.metric("hikaricp.connections.active", null);
                    if (hikariConnectionsActive != null) {
                        hikariConnectionsActive.getMeasurements().forEach(measurement -> {
                            metrics.put("db.connections.active", measurement.getValue());
                        });
                    }
                } catch (Exception e) {
                    log.warn("Error collecting connection pool metrics", e);
                }
            }
            
            // Store metrics in history
            storeMetrics(CATEGORY_APPLICATION, metrics, timestamp);
            
            log.debug("Application metrics collected: {} metrics", metrics.size());
        } catch (Exception e) {
            log.error("Error collecting application metrics", e);
        }
    }

    /**
     * Collects business-level metrics including event processing rates, calculation times, and inventory utilization
     */
    @Scheduled(fixedRateString = "${monitoring.metrics.business-collection-rate:30000}")
    public void collectBusinessMetrics() {
        try {
            Map<String, Object> metrics = new HashMap<>();
            LocalDateTime timestamp = LocalDateTime.now();
            
            // Collect event processing metrics
            Counter eventProcessingCounter = meterRegistry.find("business.events.processed").counter();
            if (eventProcessingCounter != null) {
                metrics.put("business.events.processed.count", eventProcessingCounter.count());
            }
            
            Timer eventProcessingTimer = meterRegistry.find("business.events.processing.time").timer();
            if (eventProcessingTimer != null) {
                metrics.put("business.events.processing.time.mean", eventProcessingTimer.mean(TimeUnit.MILLISECONDS));
                metrics.put("business.events.processing.time.max", eventProcessingTimer.max(TimeUnit.MILLISECONDS));
                metrics.put("business.events.processing.time.p95", eventProcessingTimer.percentile(0.95, TimeUnit.MILLISECONDS));
                metrics.put("business.events.processing.time.p99", eventProcessingTimer.percentile(0.99, TimeUnit.MILLISECONDS));
            }
            
            // Collect calculation metrics
            Timer calculationTimer = meterRegistry.find("business.calculations.time").timer();
            if (calculationTimer != null) {
                metrics.put("business.calculations.time.mean", calculationTimer.mean(TimeUnit.MILLISECONDS));
                metrics.put("business.calculations.time.max", calculationTimer.max(TimeUnit.MILLISECONDS));
                metrics.put("business.calculations.time.p95", calculationTimer.percentile(0.95, TimeUnit.MILLISECONDS));
                metrics.put("business.calculations.time.p99", calculationTimer.percentile(0.99, TimeUnit.MILLISECONDS));
            }
            
            // Collect inventory metrics
            Gauge inventoryUtilizationGauge = meterRegistry.find("business.inventory.utilization").gauge();
            if (inventoryUtilizationGauge != null) {
                metrics.put("business.inventory.utilization", inventoryUtilizationGauge.value());
            }
            
            // Collect locate metrics
            Counter locateRequestCounter = meterRegistry.find("business.locates.requests").counter();
            if (locateRequestCounter != null) {
                metrics.put("business.locates.requests.count", locateRequestCounter.count());
            }
            
            Counter locateApprovalCounter = meterRegistry.find("business.locates.approvals").counter();
            if (locateApprovalCounter != null) {
                metrics.put("business.locates.approvals.count", locateApprovalCounter.count());
                
                // Calculate approval rate if both counters exist
                if (locateRequestCounter != null && locateRequestCounter.count() > 0) {
                    double approvalRate = locateApprovalCounter.count() / locateRequestCounter.count();
                    metrics.put("business.locates.approval.rate", approvalRate);
                }
            }
            
            Timer locateProcessingTimer = meterRegistry.find("business.locates.processing.time").timer();
            if (locateProcessingTimer != null) {
                metrics.put("business.locates.processing.time.mean", locateProcessingTimer.mean(TimeUnit.MILLISECONDS));
                metrics.put("business.locates.processing.time.p95", locateProcessingTimer.percentile(0.95, TimeUnit.MILLISECONDS));
            }
            
            // Store metrics in history
            storeMetrics(CATEGORY_BUSINESS, metrics, timestamp);
            
            log.debug("Business metrics collected: {} metrics", metrics.size());
        } catch (Exception e) {
            log.error("Error collecting business metrics", e);
        }
    }

    /**
     * Collects database-level metrics including query performance, connection counts, and storage utilization
     */
    @Scheduled(fixedRateString = "${monitoring.metrics.database-collection-rate:30000}")
    public void collectDatabaseMetrics() {
        try {
            Map<String, Object> metrics = new HashMap<>();
            LocalDateTime timestamp = LocalDateTime.now();
            
            if (dataSource != null) {
                // Collect connection pool metrics
                MetricsEndpoint.MetricResponse connectionActive = metricsEndpoint.metric("hikaricp.connections.active", null);
                MetricsEndpoint.MetricResponse connectionIdle = metricsEndpoint.metric("hikaricp.connections.idle", null);
                MetricsEndpoint.MetricResponse connectionMax = metricsEndpoint.metric("hikaricp.connections.max", null);
                
                if (connectionActive != null) {
                    connectionActive.getMeasurements().forEach(measurement -> {
                        metrics.put("db.connections.active", measurement.getValue());
                    });
                }
                
                if (connectionIdle != null) {
                    connectionIdle.getMeasurements().forEach(measurement -> {
                        metrics.put("db.connections.idle", measurement.getValue());
                    });
                }
                
                if (connectionMax != null) {
                    connectionMax.getMeasurements().forEach(measurement -> {
                        metrics.put("db.connections.max", measurement.getValue());
                    });
                }
                
                // Collect query performance metrics
                Timer queryTimer = meterRegistry.find("db.query.time").timer();
                if (queryTimer != null) {
                    metrics.put("db.query.time.mean", queryTimer.mean(TimeUnit.MILLISECONDS));
                    metrics.put("db.query.time.max", queryTimer.max(TimeUnit.MILLISECONDS));
                    metrics.put("db.query.time.p95", queryTimer.percentile(0.95, TimeUnit.MILLISECONDS));
                    metrics.put("db.query.time.p99", queryTimer.percentile(0.99, TimeUnit.MILLISECONDS));
                }
                
                // Collect slow query metrics
                Counter slowQueryCounter = meterRegistry.find("db.query.slow").counter();
                if (slowQueryCounter != null) {
                    metrics.put("db.query.slow.count", slowQueryCounter.count());
                }
            }
            
            // Store metrics in history
            storeMetrics(CATEGORY_DATABASE, metrics, timestamp);
            
            log.debug("Database metrics collected: {} metrics", metrics.size());
        } catch (Exception e) {
            log.error("Error collecting database metrics", e);
        }
    }

    /**
     * Collects integration-level metrics including API call volumes, integration latency, and error rates
     */
    @Scheduled(fixedRateString = "${monitoring.metrics.integration-collection-rate:30000}")
    public void collectIntegrationMetrics() {
        try {
            Map<String, Object> metrics = new HashMap<>();
            LocalDateTime timestamp = LocalDateTime.now();
            
            // Collect external API call metrics
            Counter apiCallCounter = meterRegistry.find("integration.api.calls").counter();
            if (apiCallCounter != null) {
                metrics.put("integration.api.calls.count", apiCallCounter.count());
            }
            
            Timer apiCallTimer = meterRegistry.find("integration.api.response.time").timer();
            if (apiCallTimer != null) {
                metrics.put("integration.api.response.time.mean", apiCallTimer.mean(TimeUnit.MILLISECONDS));
                metrics.put("integration.api.response.time.p95", apiCallTimer.percentile(0.95, TimeUnit.MILLISECONDS));
                metrics.put("integration.api.response.time.p99", apiCallTimer.percentile(0.99, TimeUnit.MILLISECONDS));
            }
            
            Counter apiErrorCounter = meterRegistry.find("integration.api.errors").counter();
            if (apiErrorCounter != null) {
                metrics.put("integration.api.errors.count", apiErrorCounter.count());
                
                // Calculate error rate if both counters exist
                if (apiCallCounter != null && apiCallCounter.count() > 0) {
                    double errorRate = apiErrorCounter.count() / apiCallCounter.count();
                    metrics.put("integration.api.error.rate", errorRate);
                }
            }
            
            // Collect message broker metrics
            Gauge queueDepthGauge = meterRegistry.find("integration.queue.depth").gauge();
            if (queueDepthGauge != null) {
                metrics.put("integration.queue.depth", queueDepthGauge.value());
            }
            
            // Store metrics in history
            storeMetrics(CATEGORY_INTEGRATION, metrics, timestamp);
            
            log.debug("Integration metrics collected: {} metrics", metrics.size());
        } catch (Exception e) {
            log.error("Error collecting integration metrics", e);
        }
    }
    
    /**
     * Removes old metrics data to prevent memory issues
     */
    @Scheduled(fixedRateString = "${monitoring.metrics.cleanup-rate:3600000}")
    public void cleanupOldMetrics() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(DEFAULT_METRIC_RETENTION_HOURS);
        int totalRemoved = 0;
        
        log.debug("Cleaning up metrics older than {}", cutoffTime);
        
        for (String category : metricsHistory.keySet()) {
            Map<String, List<Map<String, Object>>> categoryMetrics = metricsHistory.get(category);
            
            for (String metricName : new ArrayList<>(categoryMetrics.keySet())) {
                List<Map<String, Object>> metricHistory = categoryMetrics.get(metricName);
                
                // Remove entries older than the cutoff time
                // Note: We're assuming the list is sorted with newest first
                int originalSize = metricHistory.size();
                metricHistory.removeIf(entry -> {
                    LocalDateTime timestamp = (LocalDateTime) entry.get("timestamp");
                    return timestamp.isBefore(cutoffTime);
                });
                
                totalRemoved += originalSize - metricHistory.size();
                
                // Remove the metric entirely if all entries were removed
                if (metricHistory.isEmpty()) {
                    categoryMetrics.remove(metricName);
                }
            }
        }
        
        log.debug("Metrics cleanup completed. Removed {} entries.", totalRemoved);
    }
    
    /**
     * Stores metrics in the metrics history map
     *
     * @param category Metric category
     * @param metrics Map of metric names to values
     * @param timestamp Timestamp when metrics were collected
     */
    private void storeMetrics(String category, Map<String, Object> metrics, LocalDateTime timestamp) {
        Map<String, List<Map<String, Object>>> categoryMetrics = metricsHistory.get(category);
        
        metrics.forEach((name, value) -> {
            List<Map<String, Object>> metricHistory = categoryMetrics.computeIfAbsent(name, k -> new ArrayList<>());
            
            Map<String, Object> metricEntry = new HashMap<>();
            metricEntry.put("timestamp", timestamp);
            metricEntry.put("value", value);
            
            // Add to the beginning of the list for chronological ordering (newest first)
            metricHistory.add(0, metricEntry);
            
            // Trim the list if it exceeds the configured history size
            if (metricHistory.size() > DEFAULT_HISTORY_SIZE) {
                metricHistory.subList(DEFAULT_HISTORY_SIZE, metricHistory.size()).clear();
            }
        });
    }
    
    /**
     * Retrieves the most recent system metrics
     *
     * @return Map of system metric names to their values
     */
    public Map<String, Object> getSystemMetrics() {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<Map<String, Object>>> systemMetrics = metricsHistory.get(CATEGORY_SYSTEM);
        
        if (systemMetrics != null && !systemMetrics.isEmpty()) {
            systemMetrics.forEach((name, history) -> {
                if (!history.isEmpty()) {
                    result.put(name, history.get(0).get("value"));
                }
            });
            
            // Add timestamp
            if (!systemMetrics.values().iterator().next().isEmpty()) {
                result.put("timestamp", systemMetrics.values().iterator().next().get(0).get("timestamp"));
            }
        }
        
        return result;
    }

    /**
     * Retrieves the most recent application metrics
     *
     * @return Map of application metric names to their values
     */
    public Map<String, Object> getApplicationMetrics() {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<Map<String, Object>>> appMetrics = metricsHistory.get(CATEGORY_APPLICATION);
        
        if (appMetrics != null && !appMetrics.isEmpty()) {
            appMetrics.forEach((name, history) -> {
                if (!history.isEmpty()) {
                    result.put(name, history.get(0).get("value"));
                }
            });
            
            // Add timestamp
            if (!appMetrics.values().iterator().next().isEmpty()) {
                result.put("timestamp", appMetrics.values().iterator().next().get(0).get("timestamp"));
            }
        }
        
        return result;
    }

    /**
     * Retrieves the most recent business metrics
     *
     * @return Map of business metric names to their values
     */
    public Map<String, Object> getBusinessMetrics() {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<Map<String, Object>>> businessMetrics = metricsHistory.get(CATEGORY_BUSINESS);
        
        if (businessMetrics != null && !businessMetrics.isEmpty()) {
            businessMetrics.forEach((name, history) -> {
                if (!history.isEmpty()) {
                    result.put(name, history.get(0).get("value"));
                }
            });
            
            // Add timestamp
            if (!businessMetrics.values().iterator().next().isEmpty()) {
                result.put("timestamp", businessMetrics.values().iterator().next().get(0).get("timestamp"));
            }
        }
        
        return result;
    }

    /**
     * Retrieves the most recent database metrics
     *
     * @return Map of database metric names to their values
     */
    public Map<String, Object> getDatabaseMetrics() {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<Map<String, Object>>> dbMetrics = metricsHistory.get(CATEGORY_DATABASE);
        
        if (dbMetrics != null && !dbMetrics.isEmpty()) {
            dbMetrics.forEach((name, history) -> {
                if (!history.isEmpty()) {
                    result.put(name, history.get(0).get("value"));
                }
            });
            
            // Add timestamp
            if (!dbMetrics.values().iterator().next().isEmpty()) {
                result.put("timestamp", dbMetrics.values().iterator().next().get(0).get("timestamp"));
            }
        }
        
        return result;
    }

    /**
     * Retrieves the most recent integration metrics
     *
     * @return Map of integration metric names to their values
     */
    public Map<String, Object> getIntegrationMetrics() {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<Map<String, Object>>> integrationMetrics = metricsHistory.get(CATEGORY_INTEGRATION);
        
        if (integrationMetrics != null && !integrationMetrics.isEmpty()) {
            integrationMetrics.forEach((name, history) -> {
                if (!history.isEmpty()) {
                    result.put(name, history.get(0).get("value"));
                }
            });
            
            // Add timestamp
            if (!integrationMetrics.values().iterator().next().isEmpty()) {
                result.put("timestamp", integrationMetrics.values().iterator().next().get(0).get("timestamp"));
            }
        }
        
        return result;
    }

    /**
     * Retrieves all metrics across all categories
     *
     * @return Map of all metric categories and their metrics
     */
    public Map<String, Object> getAllMetrics() {
        Map<String, Object> result = new HashMap<>();
        
        result.put(CATEGORY_SYSTEM, getSystemMetrics());
        result.put(CATEGORY_APPLICATION, getApplicationMetrics());
        result.put(CATEGORY_BUSINESS, getBusinessMetrics());
        result.put(CATEGORY_DATABASE, getDatabaseMetrics());
        result.put(CATEGORY_INTEGRATION, getIntegrationMetrics());
        result.put("timestamp", LocalDateTime.now());
        
        return result;
    }

    /**
     * Retrieves metrics for a specific category
     *
     * @param category Category name (system, application, business, database, integration)
     * @return Map of metric names to their values for the specified category
     */
    public Map<String, Object> getMetricsByCategory(String category) {
        if (category == null || category.isEmpty()) {
            return new HashMap<>();
        }
        
        switch (category) {
            case CATEGORY_SYSTEM:
                return getSystemMetrics();
            case CATEGORY_APPLICATION:
                return getApplicationMetrics();
            case CATEGORY_BUSINESS:
                return getBusinessMetrics();
            case CATEGORY_DATABASE:
                return getDatabaseMetrics();
            case CATEGORY_INTEGRATION:
                return getIntegrationMetrics();
            default:
                log.warn("Unknown metric category: {}", category);
                return new HashMap<>();
        }
    }

    /**
     * Retrieves the current value of a specific metric
     *
     * @param metricName Name of the metric
     * @return Current value of the specified metric, or null if not found
     */
    public Object getMetricValue(String metricName) {
        if (metricName == null || metricName.isEmpty()) {
            return null;
        }
        
        // Determine the category from the metric name prefix
        String category;
        if (metricName.startsWith("system.") || metricName.startsWith("jvm.")) {
            category = CATEGORY_SYSTEM;
        } else if (metricName.startsWith("http.") || metricName.startsWith("application.")) {
            category = CATEGORY_APPLICATION;
        } else if (metricName.startsWith("business.")) {
            category = CATEGORY_BUSINESS;
        } else if (metricName.startsWith("db.")) {
            category = CATEGORY_DATABASE;
        } else if (metricName.startsWith("integration.")) {
            category = CATEGORY_INTEGRATION;
        } else {
            // Default to application category if no specific prefix
            category = CATEGORY_APPLICATION;
        }
        
        Map<String, Object> categoryMetrics = getMetricsByCategory(category);
        return categoryMetrics.get(metricName);
    }

    /**
     * Retrieves historical values for a specific metric
     *
     * @param metricName Name of the metric
     * @param limit Maximum number of historical values to return
     * @return List of historical metric values with timestamps
     */
    public List<Map<String, Object>> getMetricHistory(String metricName, int limit) {
        if (metricName == null || metricName.isEmpty()) {
            return new ArrayList<>();
        }
        
        if (limit <= 0) {
            limit = DEFAULT_HISTORY_SIZE;
        }
        
        // Determine the category from the metric name prefix
        String category;
        if (metricName.startsWith("system.") || metricName.startsWith("jvm.")) {
            category = CATEGORY_SYSTEM;
        } else if (metricName.startsWith("http.") || metricName.startsWith("application.")) {
            category = CATEGORY_APPLICATION;
        } else if (metricName.startsWith("business.")) {
            category = CATEGORY_BUSINESS;
        } else if (metricName.startsWith("db.")) {
            category = CATEGORY_DATABASE;
        } else if (metricName.startsWith("integration.")) {
            category = CATEGORY_INTEGRATION;
        } else {
            // Default to application category if no specific prefix
            category = CATEGORY_APPLICATION;
        }
        
        Map<String, List<Map<String, Object>>> categoryMetrics = metricsHistory.get(category);
        if (categoryMetrics == null) {
            return new ArrayList<>();
        }
        
        List<Map<String, Object>> history = categoryMetrics.get(metricName);
        if (history == null) {
            return new ArrayList<>();
        }
        
        // Return at most 'limit' entries
        return history.stream().limit(limit).collect(Collectors.toList());
    }

    /**
     * Calculates statistical values for a metric over a time period
     *
     * @param metricName Name of the metric
     * @param timeWindow Time window for calculating statistics
     * @return Map of statistical values (min, max, avg, median, percentiles)
     */
    public Map<String, Object> calculateMetricStatistics(String metricName, Duration timeWindow) {
        if (metricName == null || metricName.isEmpty()) {
            return new HashMap<>();
        }
        
        if (timeWindow == null) {
            timeWindow = Duration.ofHours(1); // Default to 1 hour
        }
        
        // Get all history for the metric
        List<Map<String, Object>> history = getMetricHistory(metricName, Integer.MAX_VALUE);
        
        // Filter to entries within the time window
        LocalDateTime cutoffTime = LocalDateTime.now().minus(timeWindow);
        List<Double> values = history.stream()
            .filter(entry -> ((LocalDateTime) entry.get("timestamp")).isAfter(cutoffTime))
            .map(entry -> {
                Object value = entry.get("value");
                if (value instanceof Number) {
                    return ((Number) value).doubleValue();
                }
                return null;
            })
            .filter(value -> value != null)
            .collect(Collectors.toList());
        
        if (values.isEmpty()) {
            return new HashMap<>();
        }
        
        // Calculate statistics
        Map<String, Object> statistics = new HashMap<>();
        
        // Min and max
        double min = values.stream().min(Double::compare).orElse(0.0);
        double max = values.stream().max(Double::compare).orElse(0.0);
        
        // Average
        double avg = values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        
        // Median (50th percentile)
        List<Double> sortedValues = new ArrayList<>(values);
        sortedValues.sort(Double::compare);
        double median = calculatePercentile(sortedValues, 0.5);
        
        // Other percentiles
        double p90 = calculatePercentile(sortedValues, 0.9);
        double p95 = calculatePercentile(sortedValues, 0.95);
        double p99 = calculatePercentile(sortedValues, 0.99);
        
        // Standard deviation
        double variance = values.stream()
            .mapToDouble(value -> Math.pow(value - avg, 2))
            .average()
            .orElse(0.0);
        double stdDev = Math.sqrt(variance);
        
        // Populate the statistics map
        statistics.put("min", min);
        statistics.put("max", max);
        statistics.put("avg", avg);
        statistics.put("median", median);
        statistics.put("p90", p90);
        statistics.put("p95", p95);
        statistics.put("p99", p99);
        statistics.put("stdDev", stdDev);
        statistics.put("count", values.size());
        
        return statistics;
    }
    
    /**
     * Calculates a percentile value from a sorted list
     *
     * @param sortedValues Sorted list of values
     * @param percentile Percentile to calculate (0.0 to 1.0)
     * @return Percentile value
     */
    private double calculatePercentile(List<Double> sortedValues, double percentile) {
        if (sortedValues.isEmpty()) {
            return 0.0;
        }
        
        int index = (int) Math.ceil(percentile * sortedValues.size()) - 1;
        index = Math.max(0, Math.min(sortedValues.size() - 1, index));
        return sortedValues.get(index);
    }

    /**
     * Records a custom metric with the specified name, value, and category
     *
     * @param metricName Name of the metric
     * @param value Value of the metric
     * @param category Category of the metric
     */
    public void recordCustomMetric(String metricName, Object value, String category) {
        if (metricName == null || metricName.isEmpty() || value == null) {
            return;
        }
        
        if (category == null || category.isEmpty()) {
            category = CATEGORY_APPLICATION; // Default to application category
        }
        
        // Validate category
        if (!metricsHistory.containsKey(category)) {
            log.warn("Invalid metric category: {}. Using application category instead.", category);
            category = CATEGORY_APPLICATION;
        }
        
        // Store the metric in the metrics history
        Map<String, List<Map<String, Object>>> categoryMetrics = metricsHistory.get(category);
        List<Map<String, Object>> metricHistory = categoryMetrics.computeIfAbsent(metricName, k -> new ArrayList<>());
        
        Map<String, Object> metricEntry = new HashMap<>();
        LocalDateTime timestamp = LocalDateTime.now();
        metricEntry.put("timestamp", timestamp);
        metricEntry.put("value", value);
        
        // Add to the beginning of the list for chronological ordering (newest first)
        metricHistory.add(0, metricEntry);
        
        // Trim the list if it exceeds the configured history size
        if (metricHistory.size() > DEFAULT_HISTORY_SIZE) {
            metricHistory.subList(DEFAULT_HISTORY_SIZE, metricHistory.size()).clear();
        }
        
        // Record the metric in the meter registry if it's a numeric value
        if (value instanceof Number) {
            double numericValue = ((Number) value).doubleValue();
            Gauge.builder(metricName, () -> numericValue)
                .tag("category", category)
                .register(meterRegistry);
        }
        
        log.debug("Recorded custom metric: {}={} ({})", metricName, value, category);
    }

    /**
     * Records a timing metric for measuring operation duration
     *
     * @param metricName Name of the metric
     * @param durationNanos Duration in nanoseconds
     * @param category Category of the metric
     */
    public void recordTimingMetric(String metricName, long durationNanos, String category) {
        if (metricName == null || metricName.isEmpty()) {
            return;
        }
        
        if (category == null || category.isEmpty()) {
            category = CATEGORY_APPLICATION; // Default to application category
        }
        
        // Convert duration to milliseconds for consistent units in metrics
        double durationMs = durationNanos / 1_000_000.0;
        
        // Record the timing in the meter registry
        Timer timer = Timer.builder(metricName)
            .tag("category", category)
            .register(meterRegistry);
        timer.record(durationNanos, TimeUnit.NANOSECONDS);
        
        // Record the metric in the metrics history
        recordCustomMetric(metricName + ".ms", durationMs, category);
    }

    /**
     * Measures the execution time of a runnable operation and records it as a metric
     *
     * @param metricName Name of the metric
     * @param operation Operation to measure
     * @param category Category of the metric
     * @return Execution time in nanoseconds
     */
    public long measureExecutionTime(String metricName, Runnable operation, String category) {
        if (metricName == null || metricName.isEmpty() || operation == null) {
            return 0;
        }
        
        if (category == null || category.isEmpty()) {
            category = CATEGORY_APPLICATION; // Default to application category
        }
        
        long startTime = System.nanoTime();
        try {
            operation.run();
        } finally {
            long duration = System.nanoTime() - startTime;
            recordTimingMetric(metricName, duration, category);
            return duration;
        }
    }

    /**
     * Increments a counter metric by 1
     *
     * @param metricName Name of the metric
     * @param category Category of the metric
     */
    public void incrementCounter(String metricName, String category) {
        incrementCounterBy(metricName, 1.0, category);
    }

    /**
     * Increments a counter metric by the specified amount
     *
     * @param metricName Name of the metric
     * @param amount Amount to increment by
     * @param category Category of the metric
     */
    public void incrementCounterBy(String metricName, double amount, String category) {
        if (metricName == null || metricName.isEmpty()) {
            return;
        }
        
        if (category == null || category.isEmpty()) {
            category = CATEGORY_APPLICATION; // Default to application category
        }
        
        // Get or create the counter
        Counter counter = Counter.builder(metricName)
            .tag("category", category)
            .register(meterRegistry);
        counter.increment(amount);
        
        // Record the updated count in the metrics history
        recordCustomMetric(metricName + ".count", counter.count(), category);
    }

    /**
     * Records a gauge metric value
     *
     * @param metricName Name of the metric
     * @param value Value of the metric
     * @param category Category of the metric
     */
    public void recordGaugeValue(String metricName, double value, String category) {
        if (metricName == null || metricName.isEmpty()) {
            return;
        }
        
        if (category == null || category.isEmpty()) {
            category = CATEGORY_APPLICATION; // Default to application category
        }
        
        // Record the gauge value
        Gauge.builder(metricName, () -> value)
            .tag("category", category)
            .register(meterRegistry);
        
        // Record the value in the metrics history
        recordCustomMetric(metricName, value, category);
    }

    /**
     * Checks metrics against defined thresholds and identifies breaches
     *
     * @return List of threshold breaches with metric name, threshold, and actual value
     */
    public List<Map<String, Object>> checkThresholds() {
        List<Map<String, Object>> thresholdBreaches = new ArrayList<>();
        
        // In a real implementation, thresholds would be loaded from configuration
        // This is a simplified example with hardcoded thresholds
        Map<String, Object> thresholds = new HashMap<>();
        thresholds.put("system.cpu.processLoad", 0.8); // 80% CPU usage
        thresholds.put("jvm.memory.heap.used", 0.85); // 85% heap usage (as a ratio)
        thresholds.put("business.events.processing.time.p99", 200.0); // 200ms p99 latency
        thresholds.put("integration.api.error.rate", 0.01); // 1% error rate
        
        for (Map.Entry<String, Object> threshold : thresholds.entrySet()) {
            String metricName = threshold.getKey();
            Object thresholdValue = threshold.getValue();
            Object currentValue = getMetricValue(metricName);
            
            if (currentValue != null && thresholdValue != null) {
                boolean breached = false;
                
                if (currentValue instanceof Number && thresholdValue instanceof Number) {
                    double currentNum = ((Number) currentValue).doubleValue();
                    double thresholdNum = ((Number) thresholdValue).doubleValue();
                    
                    // For metrics ending with "error.rate", "load", or "used", breach if current > threshold
                    if (metricName.endsWith("error.rate") || metricName.endsWith("load") || metricName.endsWith("used")) {
                        breached = currentNum > thresholdNum;
                    }
                    // For metrics ending with "availability" or "success.rate", breach if current < threshold
                    else if (metricName.endsWith("availability") || metricName.endsWith("success.rate")) {
                        breached = currentNum < thresholdNum;
                    }
                    // For metrics ending with "time", breach if current > threshold
                    else if (metricName.contains("time")) {
                        breached = currentNum > thresholdNum;
                    }
                    // Default: breach if current > threshold
                    else {
                        breached = currentNum > thresholdNum;
                    }
                    
                    if (breached) {
                        Map<String, Object> breach = new HashMap<>();
                        breach.put("metricName", metricName);
                        breach.put("threshold", thresholdValue);
                        breach.put("value", currentValue);
                        breach.put("timestamp", LocalDateTime.now());
                        
                        // Determine severity based on how much the threshold is breached
                        double ratio;
                        if (metricName.endsWith("availability") || metricName.endsWith("success.rate")) {
                            ratio = thresholdNum / currentNum; // For metrics where lower is worse
                        } else {
                            ratio = currentNum / thresholdNum; // For metrics where higher is worse
                        }
                        
                        String severity;
                        if (ratio > 2.0) {
                            severity = "CRITICAL";
                            log.error("CRITICAL threshold breach: {} = {} (threshold: {})", metricName, currentValue, thresholdValue);
                        } else if (ratio > 1.5) {
                            severity = "HIGH";
                            log.warn("HIGH threshold breach: {} = {} (threshold: {})", metricName, currentValue, thresholdValue);
                        } else if (ratio > 1.2) {
                            severity = "MEDIUM";
                            log.warn("MEDIUM threshold breach: {} = {} (threshold: {})", metricName, currentValue, thresholdValue);
                        } else {
                            severity = "LOW";
                            log.info("LOW threshold breach: {} = {} (threshold: {})", metricName, currentValue, thresholdValue);
                        }
                        
                        breach.put("severity", severity);
                        thresholdBreaches.add(breach);
                    }
                }
            }
        }
        
        return thresholdBreaches;
    }

    /**
     * Retrieves the threshold value for a specific metric
     *
     * @param metricName Name of the metric
     * @return Threshold value for the metric, or null if not defined
     */
    public Object getMetricThreshold(String metricName) {
        if (metricName == null || metricName.isEmpty()) {
            return null;
        }
        
        // In a real implementation, thresholds would be loaded from configuration
        // This is a simplified example with hardcoded thresholds
        Map<String, Object> thresholds = new HashMap<>();
        thresholds.put("system.cpu.processLoad", 0.8); // 80% CPU usage
        thresholds.put("jvm.memory.heap.used", 0.85); // 85% heap usage (as a ratio)
        thresholds.put("business.events.processing.time.p99", 200.0); // 200ms p99 latency
        thresholds.put("integration.api.error.rate", 0.01); // 1% error rate
        
        return thresholds.get(metricName);
    }

    /**
     * Exports metrics to Prometheus format
     *
     * @return Metrics in Prometheus text format
     */
    public String exportMetricsToPrometheus() {
        StringBuilder sb = new StringBuilder();
        Map<String, Object> allMetrics = getAllMetrics();
        
        for (String category : allMetrics.keySet()) {
            if (category.equals("timestamp")) {
                continue;
            }
            
            @SuppressWarnings("unchecked")
            Map<String, Object> categoryMetrics = (Map<String, Object>) allMetrics.get(category);
            
            for (String metricName : categoryMetrics.keySet()) {
                if (metricName.equals("timestamp")) {
                    continue;
                }
                
                Object value = categoryMetrics.get(metricName);
                if (value instanceof Number) {
                    // Convert metric name to Prometheus format (replace dots with underscores)
                    String promMetricName = category + "_" + metricName.replace('.', '_');
                    
                    // Add help text
                    sb.append("# HELP ").append(promMetricName).append(" ").append(metricName).append("\n");
                    
                    // Add type (assume gauge for simplicity)
                    sb.append("# TYPE ").append(promMetricName).append(" gauge\n");
                    
                    // Add metric value
                    sb.append(promMetricName).append(" ").append(value).append("\n");
                }
            }
        }
        
        return sb.toString();
    }

    /**
     * Exports metrics to JSON format
     *
     * @return Metrics in JSON format
     */
    public String exportMetricsToJson() {
        // In a real implementation, this would use a proper JSON serialization library
        Map<String, Object> allMetrics = getAllMetrics();
        return allMetrics.toString();
    }
}