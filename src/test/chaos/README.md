# Chaos Testing Framework

This document describes the chaos testing framework used to validate the resilience and fault tolerance capabilities of the Inventory Management System (IMS). The framework uses Litmus Chaos and Chaos Monkey for Kubernetes to simulate various failure scenarios and verify that the system can maintain its critical functions and performance SLAs during disruptions.

## Testing Objectives

The primary objectives of chaos testing in the IMS are:

1. Validate that the system maintains 99.999% uptime during operational hours (24x6)
2. Ensure that critical workflows (locate approval, short sell validation) continue to function during failures
3. Verify that performance SLAs (200ms for event processing, 150ms for short sell approval) are maintained during disruptions
4. Confirm that data integrity and consistency are preserved during and after failure events
5. Test automatic recovery mechanisms without manual intervention
6. Validate circuit breaker and fallback implementations

## Testing Tools

The IMS chaos testing framework uses the following tools:

1. **Litmus Chaos**: An open-source chaos engineering platform for Kubernetes that provides a wide range of chaos experiments
2. **Chaos Monkey for Kubernetes (kube-monkey)**: A tool that randomly terminates pods to test system resilience
3. **Custom Chaos Scripts**: Purpose-built scripts for IMS-specific failure scenarios
4. **Prometheus and Grafana**: For monitoring system behavior during chaos experiments
5. **Data Consistency Validators**: Custom tools to verify data integrity before and after chaos tests

## Test Scenarios

The chaos testing framework includes the following categories of test scenarios:

1. **Network Failures**: Network partitions, latency injection, packet loss, and connection failures
2. **Service Failures**: Service instance failures, service restarts, and service degradation
3. **Database Failures**: Primary database failures, connection issues, query delays, and data consistency challenges
4. **Kafka Failures**: Broker failures, partition unavailability, message delays, and replication issues
5. **Pod Failures**: Pod termination, pod restarts, and pod eviction
6. **Resource Exhaustion**: CPU, memory, disk I/O, and connection pool exhaustion
7. **Node Failures**: Node crashes, node drains, and zone outages

## Test Execution

Chaos tests are executed in the following environments:

1. **Development**: Basic chaos tests during feature development
2. **Staging**: Comprehensive chaos test suite before production deployment
3. **Production**: Controlled chaos tests during maintenance windows

Tests are scheduled to run:
- Automatically as part of the CI/CD pipeline
- On a regular schedule (weekly in staging, monthly in production)
- After significant architectural changes
- As part of disaster recovery drills

## Monitoring During Chaos

During chaos experiments, the following metrics are closely monitored:

1. **Service Availability**: Uptime and error rates for all services
2. **Performance Metrics**: Response times, processing latency, and throughput
3. **Resource Utilization**: CPU, memory, disk, and network usage
4. **Circuit Breaker Status**: Open/closed state of all circuit breakers
5. **Recovery Metrics**: Time to recover after failure resolution
6. **Data Consistency**: Verification of data integrity during and after tests

## Success Criteria

Chaos tests are considered successful when:

1. No data loss or corruption occurs during failures
2. Short sell validation maintains 150ms SLA during disruptions
3. Locate approval workflow continues to function with degraded performance
4. System recovers automatically after failures are resolved
5. Circuit breakers activate appropriately during failures
6. Message delivery guarantees are maintained despite disruptions
7. Position and inventory calculations remain accurate

## Test Scenarios Directory Structure

The chaos test scenarios are organized in the following directory structure:

- `scenarios/`: Contains YAML configurations for different chaos scenarios
  - `network-failure.yaml`: Network disruption scenarios
  - `service-failure.yaml`: Service disruption scenarios
  - `database-failure.yaml`: Database failure scenarios
  - `kafka-failure.yaml`: Kafka disruption scenarios
  - `pod-failure.yaml`: Pod disruption scenarios
- `litmus/`: Contains Litmus Chaos experiment configurations
  - `experiment.yaml`: Main experiment configuration
- `chaosmonkey/`: Contains Chaos Monkey for Kubernetes configurations
  - `config.yaml`: Chaos Monkey configuration

## Running Chaos Tests

To run chaos tests:

1. **Prerequisites**:
   - Kubernetes cluster with Litmus Chaos installed
   - Prometheus and Grafana for monitoring
   - Appropriate RBAC permissions

2. **Running a specific scenario**:
   ```bash
   kubectl apply -f scenarios/network-failure.yaml
   ```

3. **Running the full test suite**:
   ```bash
   ./run-chaos-suite.sh
   ```

4. **Monitoring test execution**:
   - Access the Grafana dashboard at `http://grafana.ims.svc:3000/d/chaos-testing`
   - Check Litmus Chaos UI for experiment status

5. **Analyzing results**:
   ```bash
   ./analyze-chaos-results.sh
   ```

## Adding New Chaos Tests

To add a new chaos test scenario:

1. Create a new YAML file in the appropriate directory under `scenarios/`
2. Define the chaos experiment parameters according to Litmus Chaos documentation
3. Specify target components, duration, and expected behavior
4. Define success criteria and measurement methods
5. Add monitoring alerts for the new scenario
6. Test in development environment before adding to the test suite

## Best Practices

When conducting chaos tests, follow these best practices:

1. Start with small-scale disruptions and gradually increase scope
2. Always have monitoring in place before starting chaos experiments
3. Have a rollback plan for stopping experiments if needed
4. Document all findings, including unexpected behaviors
5. Update resilience patterns based on test results
6. Regularly review and update chaos test scenarios
7. Involve development teams in chaos test planning and execution

## References

- [Litmus Chaos Documentation](https://docs.litmuschaos.io/)
- [Chaos Monkey for Kubernetes](https://github.com/asobti/kube-monkey)
- [Chaos Engineering Principles](https://principlesofchaos.org/)
- [IMS Resilience Patterns](../docs/resilience-patterns.md)
- [IMS Monitoring Guide](../monitoring/README.md)