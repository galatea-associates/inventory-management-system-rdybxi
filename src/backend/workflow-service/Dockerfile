# Build stage
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Install necessary build dependencies
RUN apk add --no-cache curl bash git

# Copy gradle files for dependency resolution
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Copy source code
COPY src ./src

# Build the service
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create directories for workflow data and logs
RUN mkdir -p /data/workflows/locate /data/workflows/shortsell /logs && \
    chown -R appuser:appgroup /app /data /logs

# Copy the built JAR from build stage
COPY --from=build /app/build/libs/*.jar /app/app.jar
RUN chown -R appuser:appgroup /app

# Switch to non-root user for security
USER appuser

# Set JVM options for performance and troubleshooting
ENV JAVA_OPTS="-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+UseStringDeduplication -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVICE_NAME=workflow-service

# Expose the application port
EXPOSE 8083

# Define volumes for persistent data and logs
VOLUME ["/data", "/logs"]

# Define health check to monitor application status
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8083/api/v1/actuator/health || exit 1

# Define the command to run the application
ENTRYPOINT exec java $JAVA_OPTS -jar /app/app.jar