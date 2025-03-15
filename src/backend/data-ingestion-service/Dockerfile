# Build stage
# Using eclipse-temurin JDK 17 Alpine as base image (version 17-jdk-alpine)
FROM eclipse-temurin:17-jdk-alpine AS build

# Set working directory
WORKDIR /app

# Install necessary build dependencies
RUN apk add --no-cache curl bash git

# Copy gradle files for dependency resolution
# This is done before copying the source code to leverage Docker layer caching
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Copy source code
COPY src ./src

# Build the application
# Using --no-daemon to ensure the Gradle daemon doesn't keep running in the image
RUN ./gradlew bootJar --no-daemon

# Runtime stage
# Using eclipse-temurin JRE 17 Alpine for smaller runtime image (version 17-jre-alpine)
FROM eclipse-temurin:17-jre-alpine

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Create directories for different data types and logs
# This ensures proper permissions and directory structure
RUN mkdir -p /data/reference-data/batch /data/market-data /data/trade-data/batch /data/contract-data/batch /logs && \
    chown -R appuser:appgroup /app /data /logs

# Copy the JAR file from the build stage
COPY --from=build /app/build/libs/*.jar /app/app.jar
RUN chown -R appuser:appgroup /app

# Switch to non-root user for security
USER appuser

# Set environment variables
# JVM tuning parameters for container environments
ENV JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVICE_NAME=data-ingestion-service

# Expose the application port
EXPOSE 8081

# Define volumes for persistent data and logs
VOLUME ["/data", "/logs"]

# Health check to ensure the application is running properly
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8081/api/v1/ingestion/actuator/health || exit 1

# Set the entrypoint to run the Java application
ENTRYPOINT exec java $JAVA_OPTS -jar /app/app.jar