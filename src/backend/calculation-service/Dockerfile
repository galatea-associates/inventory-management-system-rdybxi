# Build stage
# Using Eclipse Temurin JDK 17 Alpine as the base image for building the application
# eclipse-temurin:17-jdk-alpine v17.0.7
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Install necessary build dependencies
RUN apk add --no-cache curl bash git

# Copy gradle files first for better layer caching
# This allows Docker to cache dependencies if they haven't changed
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Copy source code
COPY src ./src

# Build the application using Gradle
# The --no-daemon flag ensures Gradle doesn't leave a daemon running in the container
RUN ./gradlew bootJar --no-daemon

# Runtime stage
# Using Eclipse Temurin JRE 17 Alpine for a smaller runtime image
# eclipse-temurin:17-jre-alpine v17.0.7
FROM eclipse-temurin:17-jre-alpine

# Create non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create directories for data and logs with proper permissions
RUN mkdir -p /data/calculation /data/cache /logs && \
    chown -R appuser:appgroup /app /data /logs

# Copy the JAR file from build stage
COPY --from=build /app/build/libs/*.jar /app/app.jar
RUN chown -R appuser:appgroup /app

# Switch to non-root user for security
USER appuser

# Set JVM options for performance and troubleshooting
# - Xms/Xmx: Initial and maximum heap size
# - UseG1GC: Use G1 garbage collector for better performance
# - HeapDumpOnOutOfMemoryError: Create heap dump on OOM for analysis
ENV JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVICE_NAME=calculation-service

# Expose the application port
EXPOSE 8082

# Define volumes for persistent data and logs
VOLUME ["/data", "/logs"]

# Health check to verify application is running properly
# Uses Spring Boot Actuator's health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8082/actuator/health || exit 1

# Run the application
ENTRYPOINT exec java $JAVA_OPTS -jar /app/app.jar