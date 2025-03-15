# Inventory Management System - Backend

## Overview

The Inventory Management System (IMS) backend is a state-of-the-art enterprise application designed to provide comprehensive inventory aggregation and distribution capabilities for a licensed prime broker operating across all global jurisdictions. The system collects, processes, and analyzes massive amounts of data to perform real-time and on-demand calculations of global inventory positions.

This backend implementation follows an event-driven microservices architecture to achieve the high throughput (300,000+ events per second), low latency (sub-200ms end-to-end), and high availability (99.999% uptime) required by the business.

## Architecture

The IMS backend employs the following architectural patterns:

- **Event-Driven Architecture**: Using Apache Kafka as the central message bus
- **Command Query Responsibility Segregation (CQRS)**: Separating read and write operations
- **Domain-Driven Design**: Organizing services around business domains
- **Polyglot Persistence**: Using specialized databases for different data types

### Core Components

| Component | Description | Technology |
| --- | --- | --- |
| Data Ingestion Services | Consume and normalize data from external sources | Spring Boot, Kafka |
| Calculation Engine | Perform inventory calculations | Java, Hazelcast |
| Position Service | Maintain real-time position data | Spring Boot, Cassandra |
| Inventory Service | Calculate availability across different categories | Spring Boot, Redis |
| Workflow Engine | Manage locate and short sell approval processes | Camunda BPM, Spring Boot |
| Message Bus | Facilitate asynchronous communication | Apache Kafka |
| API Gateway | Provide unified access point for external systems | Spring Cloud Gateway |
| WebSocket Service | Support real-time data streaming | Spring WebFlux, WebSocket |
| Monitoring Service | System health and metrics | Prometheus, Micrometer |
| Auth Service | Authentication and authorization | Spring Security, OAuth2 |

## Technology Stack

### Programming Languages

- **Java 17 LTS**: Primary language for backend services
- **Kotlin 1.8**: Used for real-time processing components
- **Scala 2.13**: Used for data processing components

### Frameworks & Libraries

- **Spring Boot 3.1**: Application framework
- **Spring Cloud**: Microservices ecosystem
- **Akka 2.7**: Actor model implementation
- **Apache Kafka 3.4**: Distributed messaging
- **Hazelcast 5.3**: In-memory data grid
- **Project Reactor 3.5**: Reactive programming
- **Camunda BPM**: Workflow engine

### Databases

- **PostgreSQL 15.3**: Primary relational database
- **TimescaleDB 2.10**: Time-series data
- **InfluxDB 2.7**: Tick database for market data
- **Redis 7.0**: Caching and pub/sub
- **Cassandra 4.1**: Distributed NoSQL for position data

## Project Structure

```
src/backend/
├── common-lib/                # Shared library for common code
├── data-ingestion-service/    # Data ingestion microservice
├── calculation-service/       # Calculation engine microservice
├── workflow-service/          # Workflow management microservice
├── api-gateway/               # API Gateway service
├── websocket-service/         # WebSocket service
├── monitoring-service/        # Monitoring and health check service
├── auth-service/              # Authentication service
├── kubernetes/                # Kubernetes deployment configurations
├── gradle/                    # Gradle wrapper and configuration
└── docker-compose.yml         # Docker Compose for local development
```

## Getting Started

### Prerequisites

- JDK 17 or higher
- Docker and Docker Compose
- Kubernetes CLI (kubectl) for deployment
- Gradle 8.1 or higher

### Local Development Setup

1. Clone the repository

```bash
git clone <repository-url>
cd src/backend
```

2. Build the project

```bash
./gradlew clean build
```

3. Start the local development environment

```bash
docker-compose up -d
```

4. Access the services

- API Gateway: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- Kafka UI: http://localhost:9000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

### Running Individual Services

To run a specific service:

```bash
./gradlew :<service-name>:bootRun
```

For example:

```bash
./gradlew :data-ingestion-service:bootRun
```

## Development Guidelines

### Code Style

This project follows the Google Java Style Guide. Code style is enforced using Checkstyle, PMD, and SpotBugs.

```bash
./gradlew checkstyleMain checkstyleTest pmdMain pmdTest spotbugsMain spotbugsTest
```

### Testing

The project uses JUnit 5 for unit tests, Testcontainers for integration tests, and various tools for performance testing.

```bash
# Run unit tests
./gradlew test

# Run integration tests
./gradlew integrationTest

# Run all tests
./gradlew check
```

### Continuous Integration

The project uses GitHub Actions for CI/CD. The following workflows are available:

- `build.yml`: Builds and tests the code
- `deploy-dev.yml`: Deploys to the development environment
- `deploy-staging.yml`: Deploys to the staging environment
- `deploy-prod.yml`: Deploys to the production environment

## Performance Considerations

The IMS backend is designed to handle high-throughput, low-latency operations:

- Process 300,000+ events per second
- End-to-end latency under 200ms
- Short sell approval time under 150ms

Key performance optimizations include:

- In-memory processing with Hazelcast
- Reactive programming with Project Reactor
- Optimized data structures with Eclipse Collections
- Efficient message processing with Kafka Streams
- Database query optimization and connection pooling

## Monitoring and Operations

The system includes comprehensive monitoring:

- Health checks for all services
- Prometheus metrics for performance monitoring
- Grafana dashboards for visualization
- Distributed tracing with OpenTelemetry
- Centralized logging with ELK stack

## Deployment

The system is deployed using Kubernetes with Helm charts:

```bash
# Deploy to development
kubectl apply -k kubernetes/overlays/dev

# Deploy to staging
kubectl apply -k kubernetes/overlays/staging

# Deploy to production
kubectl apply -k kubernetes/overlays/production
```

## Contributing

1. Create a feature branch from `develop`
2. Implement your changes with tests
3. Ensure all tests pass and code style is correct
4. Submit a pull request to `develop`

## License

[Proprietary] - Copyright © 2023 [Company Name]