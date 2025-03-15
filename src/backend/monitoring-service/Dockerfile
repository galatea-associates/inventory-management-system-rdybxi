# Build stage
FROM eclipse-temurin:17-jdk-alpine AS build
# eclipse-temurin version: 17-jdk-alpine

# Set working directory
WORKDIR /app

# Install necessary build dependencies
RUN apk add --no-cache curl bash git

# Copy gradle files for dependency resolution
# This is done in separate layers to leverage Docker layer caching
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Copy source code
COPY src ./src

# Build the application
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
# eclipse-temurin version: 17-jre-alpine

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Create directories for metrics data, alerts, and logs
RUN mkdir -p /data/metrics /data/alerts /logs && \
    chown -R appuser:appgroup /app /data /logs

# Copy the built JAR from the build stage
COPY --from=build /app/build/libs/*.jar /app/app.jar
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set JVM options
ENV JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVICE_NAME=monitoring-service

# Expose the application port
EXPOSE 8080

# Define volumes for persistent data and logs
VOLUME ["/data", "/logs"]

# Health check to verify the application is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT exec java $JAVA_OPTS -jar /app/app.jar