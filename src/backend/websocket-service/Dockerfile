# Build stage
# eclipse-temurin:17-jdk-alpine (v17.0.7)
FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

# Install necessary build dependencies
RUN apk add --no-cache curl bash git

# Copy gradle files for dependency resolution
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Copy source code
COPY src ./src

# Build the application
RUN ./gradlew bootJar --no-daemon

# Runtime stage
# eclipse-temurin:17-jre-alpine (v17.0.7)
FROM eclipse-temurin:17-jre-alpine

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p /logs && chown -R appuser:appgroup /app /logs

# Copy the JAR from the build stage
COPY --from=build /app/build/libs/*.jar /app/app.jar
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set JVM options for performance and troubleshooting
ENV JAVA_OPTS="-Xms512m -Xmx1g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVICE_NAME=websocket-service

# Expose the WebSocket service port
EXPOSE 8085

# Define volume for logs
VOLUME ["/logs"]

# Health check to ensure the service is running properly
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8085/api/v1/websocket/actuator/health || exit 1

# Start the application
ENTRYPOINT exec java $JAVA_OPTS -jar /app/app.jar