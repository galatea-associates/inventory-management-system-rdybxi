package com.ims.monitoring.controller;

import com.ims.monitoring.service.AlertService;
import com.ims.monitoring.service.MetricsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller responsible for exposing metrics endpoints for the Inventory Management System.
 * Provides access to system, application, business, database, and integration metrics for
 * monitoring, performance analysis, and capacity planning.
 */
@RestController
@RequestMapping("/api/metrics")
@Slf4j
public class MetricsController {

    @Autowired
    private MetricsService metricsService;

    @Autowired
    private AlertService alertService;

    /**
     * Retrieves all metrics across all categories
     * 
     * @return HTTP response containing all metrics
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllMetrics() {
        log.info("Received request for all metrics");
        Map<String, Object> metrics = metricsService.getAllMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Retrieves system-level metrics including CPU, memory, disk, and network utilization
     * 
     * @return HTTP response containing system metrics
     */
    @GetMapping("/system")
    public ResponseEntity<Map<String, Object>> getSystemMetrics() {
        log.info("Received request for system metrics");
        Map<String, Object> metrics = metricsService.getSystemMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Retrieves application-level metrics including request rates, response times, error rates, and queue depths
     * 
     * @return HTTP response containing application metrics
     */
    @GetMapping("/application")
    public ResponseEntity<Map<String, Object>> getApplicationMetrics() {
        log.info("Received request for application metrics");
        Map<String, Object> metrics = metricsService.getApplicationMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Retrieves business-level metrics including event processing rates, calculation times, and inventory utilization
     * 
     * @return HTTP response containing business metrics
     */
    @GetMapping("/business")
    public ResponseEntity<Map<String, Object>> getBusinessMetrics() {
        log.info("Received request for business metrics");
        Map<String, Object> metrics = metricsService.getBusinessMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Retrieves database-level metrics including query performance, connection counts, and storage utilization
     * 
     * @return HTTP response containing database metrics
     */
    @GetMapping("/database")
    public ResponseEntity<Map<String, Object>> getDatabaseMetrics() {
        log.info("Received request for database metrics");
        Map<String, Object> metrics = metricsService.getDatabaseMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Retrieves integration-level metrics including API call volumes, integration latency, and error rates
     * 
     * @return HTTP response containing integration metrics
     */
    @GetMapping("/integration")
    public ResponseEntity<Map<String, Object>> getIntegrationMetrics() {
        log.info("Received request for integration metrics");
        Map<String, Object> metrics = metricsService.getIntegrationMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Retrieves metrics for a specific category
     * 
     * @param category The category of metrics to retrieve
     * @return HTTP response containing metrics for the specified category
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<Map<String, Object>> getMetricsByCategory(@PathVariable String category) {
        log.info("Received request for metrics in category: {}", category);
        Map<String, Object> metrics = metricsService.getMetricsByCategory(category);
        
        if (metrics.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(metrics);
    }

    /**
     * Retrieves the current value of a specific metric
     * 
     * @param metricName The name of the metric to retrieve
     * @return HTTP response containing the metric value
     */
    @GetMapping("/value/{metricName}")
    public ResponseEntity<Object> getMetricValue(@PathVariable String metricName) {
        log.info("Received request for metric value: {}", metricName);
        Object value = metricsService.getMetricValue(metricName);
        
        if (value == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(value);
    }

    /**
     * Retrieves historical values for a specific metric
     * 
     * @param metricName The name of the metric to retrieve history for
     * @param limit Optional maximum number of historical values to return (default 100)
     * @return HTTP response containing historical metric values
     */
    @GetMapping("/history/{metricName}")
    public ResponseEntity<List<Map<String, Object>>> getMetricHistory(
            @PathVariable String metricName,
            @RequestParam(required = false) Integer limit) {
        
        log.info("Received request for metric history: {}, limit: {}", metricName, limit);
        
        if (limit == null) {
            limit = 100; // Default limit
        }
        
        List<Map<String, Object>> history = metricsService.getMetricHistory(metricName, limit);
        
        if (history.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(history);
    }

    /**
     * Calculates statistical values for a metric over a time period
     * 
     * @param metricName The name of the metric to calculate statistics for
     * @param hours Optional time window in hours for the calculation (default 24)
     * @return HTTP response containing statistical values
     */
    @GetMapping("/statistics/{metricName}")
    public ResponseEntity<Map<String, Object>> calculateMetricStatistics(
            @PathVariable String metricName,
            @RequestParam(required = false) Integer hours) {
        
        log.info("Received request for metric statistics: {}, hours: {}", metricName, hours);
        
        if (hours == null) {
            hours = 24; // Default to 24 hours
        }
        
        Duration duration = Duration.ofHours(hours);
        Map<String, Object> statistics = metricsService.calculateMetricStatistics(metricName, duration);
        
        if (statistics.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(statistics);
    }

    /**
     * Records a custom metric with the specified name, value, and category
     * 
     * @param metricData Map containing metric information (metricName, value, and optional category)
     * @return HTTP response indicating success or failure
     */
    @PostMapping("/custom")
    public ResponseEntity<Void> recordCustomMetric(@RequestBody Map<String, Object> metricData) {
        log.info("Received request to record custom metric: {}", metricData);
        
        String metricName = (String) metricData.get("metricName");
        Object value = metricData.get("value");
        String category = (String) metricData.get("category");
        
        if (metricName == null || metricName.isEmpty() || value == null) {
            log.warn("Invalid metric data: metricName and value are required");
            return ResponseEntity.badRequest().build();
        }
        
        metricsService.recordCustomMetric(metricName, value, category);
        return ResponseEntity.ok().build();
    }

    /**
     * Checks metrics against defined thresholds and identifies breaches
     * 
     * @return HTTP response containing threshold breaches
     */
    @GetMapping("/thresholds")
    public ResponseEntity<List<Map<String, Object>>> checkThresholds() {
        log.info("Received request to check thresholds");
        List<Map<String, Object>> thresholdBreaches = metricsService.checkThresholds();
        return ResponseEntity.ok(thresholdBreaches);
    }

    /**
     * Creates alerts based on metric threshold breaches
     * 
     * @return HTTP response containing alert creation results
     */
    @PostMapping("/thresholds/alerts")
    public ResponseEntity<Map<String, Object>> createAlertFromThresholdBreach() {
        log.info("Received request to create alerts from threshold breaches");
        List<Map<String, Object>> thresholdBreaches = metricsService.checkThresholds();
        
        Map<String, Object> result = new HashMap<>();
        result.put("alertsCreated", alertService.createAlertFromMetricThreshold());
        
        return ResponseEntity.ok(result);
    }

    /**
     * Exports metrics in Prometheus text format
     * 
     * @return HTTP response containing metrics in Prometheus format
     */
    @GetMapping(value = "/prometheus", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> exportMetricsToPrometheus() {
        log.info("Received request to export metrics in Prometheus format");
        String prometheusMetrics = metricsService.exportMetricsToPrometheus();
        return ResponseEntity.ok(prometheusMetrics);
    }

    /**
     * Exports metrics in JSON format
     * 
     * @return HTTP response containing metrics in JSON format
     */
    @GetMapping(value = "/json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> exportMetricsToJson() {
        log.info("Received request to export metrics in JSON format");
        String jsonMetrics = metricsService.exportMetricsToJson();
        return ResponseEntity.ok(jsonMetrics);
    }
}