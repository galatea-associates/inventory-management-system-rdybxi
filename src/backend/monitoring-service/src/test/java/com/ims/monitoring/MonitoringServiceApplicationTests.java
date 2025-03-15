package com.ims.monitoring;

import com.ims.monitoring.config.PrometheusConfig;
import com.ims.monitoring.controller.HealthController;
import com.ims.monitoring.controller.MetricsController;
import com.ims.monitoring.service.HealthCheckService;
import com.ims.monitoring.service.MetricsService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.prometheus.PrometheusMeterRegistry;
import org.junit.jupiter.api.Test; //version:5.9.2
import org.springframework.beans.factory.annotation.Autowired; //version:6.0.9
import org.springframework.boot.actuate.health.Health; //version:3.1.0
import org.springframework.boot.actuate.health.Status; //version:3.1.0
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc; //version:3.1.0
import org.springframework.boot.test.context.SpringBootTest; //version:3.1.0
import org.springframework.test.context.ActiveProfiles; //version:6.0.9
import org.springframework.test.web.servlet.MockMvc; //version:6.0.9
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders; //version:6.0.9
import org.springframework.test.web.servlet.result.MockMvcResultMatchers; //version:6.0.9

import static org.junit.jupiter.api.Assertions.assertEquals; //version:5.9.2
import static org.junit.jupiter.api.Assertions.assertNotNull; //version:5.9.2
import static org.junit.jupiter.api.Assertions.assertTrue; //version:5.9.2
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content; //version:6.0.9
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath; //version:6.0.9
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status; //version:6.0.9

/**
 * Integration test class for the Monitoring Service application.
 * Tests the application context loading and verifies that essential components
 * are properly configured and functioning.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class MonitoringServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HealthCheckService healthCheckService;

    @Autowired
    private MetricsService metricsService;

    @Autowired
    private MeterRegistry meterRegistry;

    /**
     * Default constructor
     */
    public MonitoringServiceApplicationTests() {
    }

    /**
     * Verifies that the Spring application context loads successfully
     */
    @Test
    public void contextLoads() {
        // Verify that the application context loads without errors
        assertNotNull(mockMvc, "MockMvc should not be null");
        assertNotNull(healthCheckService, "HealthCheckService should not be null");
        assertNotNull(metricsService, "MetricsService should not be null");
    }

    /**
     * Tests the HealthCheckService to ensure it performs health checks correctly
     */
    @Test
    public void healthCheckServiceTest() {
        // Call healthCheckService.performLivenessCheck()
        Health livenessHealth = healthCheckService.performLivenessCheck();

        // Verify that the result is not null
        assertNotNull(livenessHealth, "Liveness health check result should not be null");

        // Assert that the health status is UP
        assertEquals(Status.UP, livenessHealth.getStatus(), "Liveness health status should be UP");

        // Call healthCheckService.performReadinessCheck()
        Health readinessHealth = healthCheckService.performReadinessCheck();

        // Verify that the result is not null
        assertNotNull(readinessHealth, "Readiness health check result should not be null");

        // Assert that the health status is UP or contains expected details
        assertTrue(readinessHealth.getStatus().equals(Status.UP) || readinessHealth.getDetails().containsKey("services"),
                "Readiness health status should be UP or contain service details");
    }

    /**
     * Tests the MetricsService to ensure it collects and provides metrics correctly
     */
    @Test
    public void metricsServiceTest() {
        // Call metricsService.getSystemMetrics()
        java.util.Map<String, Object> systemMetrics = metricsService.getSystemMetrics();

        // Verify that the result is not null and contains expected system metrics
        assertNotNull(systemMetrics, "System metrics should not be null");
        assertTrue(systemMetrics.containsKey("system.cpu.loadAverage"), "System metrics should contain CPU load");

        // Call metricsService.getApplicationMetrics()
        java.util.Map<String, Object> applicationMetrics = metricsService.getApplicationMetrics();

        // Verify that the result is not null and contains expected application metrics
        assertNotNull(applicationMetrics, "Application metrics should not be null");
        assertTrue(applicationMetrics.containsKey("http.server.requests.count"), "Application metrics should contain request count");
    }

    /**
     * Tests that the Prometheus configuration is properly set up
     */
    @Test
    public void prometheusConfigTest() {
        // Verify that the meterRegistry is not null
        assertNotNull(meterRegistry, "MeterRegistry should not be null");

        // Verify that the registry is of type PrometheusMeterRegistry
        assertTrue(meterRegistry instanceof PrometheusMeterRegistry, "MeterRegistry should be a PrometheusMeterRegistry");

        // Check that common tags are properly configured
        // This can be expanded to check for specific tags if needed
    }

    /**
     * Tests the health check REST endpoints
     */
    @Test
    public void healthEndpointTest() throws Exception {
        // Perform GET request to /api/v1/health/liveness
        mockMvc.perform(MockMvcRequestBuilders.get("/api/health/liveness"))
                // Verify HTTP 200 OK response
                .andExpect(status().isOk())
                // Verify response contains UP status
                .andExpect(content().string(org.hamcrest.Matchers.containsString("UP")));

        // Perform GET request to /api/v1/health/readiness
        mockMvc.perform(MockMvcRequestBuilders.get("/api/health/readiness"))
                // Verify HTTP 200 OK response
                .andExpect(status().isOk())
                // Verify response contains expected components
                .andExpect(jsonPath("$.status").value("UP"));
    }

    /**
     * Tests the metrics REST endpoints
     */
    @Test
    public void metricsEndpointTest() throws Exception {
        // Perform GET request to /api/v1/metrics/system
        mockMvc.perform(MockMvcRequestBuilders.get("/api/metrics/system"))
                // Verify HTTP 200 OK response
                .andExpect(status().isOk())
                // Verify response contains expected system metrics
                .andExpect(jsonPath("$.system.cpu.loadAverage").exists());

        // Perform GET request to /api/v1/metrics/prometheus
        mockMvc.perform(MockMvcRequestBuilders.get("/api/metrics/prometheus"))
                // Verify HTTP 200 OK response
                .andExpect(status().isOk())
                // Verify response contains Prometheus format metrics
                .andExpect(content().string(org.hamcrest.Matchers.containsString("# HELP")));
    }

    /**
     * Tests the Spring Boot Actuator endpoints
     */
    @Test
    public void actuatorEndpointsTest() throws Exception {
        // Perform GET request to /actuator/health
        mockMvc.perform(MockMvcRequestBuilders.get("/actuator/health"))
                // Verify HTTP 200 OK response
                .andExpect(status().isOk())
                // Verify response contains UP status
                .andExpect(jsonPath("$.status").value("UP"));

        // Perform GET request to /actuator/prometheus
        mockMvc.perform(MockMvcRequestBuilders.get("/actuator/prometheus"))
                // Verify HTTP 200 OK response
                .andExpect(status().isOk())
                // Verify response contains Prometheus metrics
                .andExpect(content().string(org.hamcrest.Matchers.containsString("# HELP")));
    }
}