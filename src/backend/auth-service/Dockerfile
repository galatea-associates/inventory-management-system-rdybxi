# Build stage
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Install necessary build dependencies
RUN apk add --no-cache curl bash git

# Copy gradle configuration files for dependency resolution
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Copy source code
COPY src ./src

# Build the application
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

# Create a non-root user for running the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create necessary directories with appropriate permissions
RUN mkdir -p /data/auth /logs && chown -R appuser:appgroup /app /data /logs

# Copy the JAR file from the build stage
COPY --from=build /app/build/libs/*.jar /app/app.jar
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Configure environment variables
ENV JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVICE_NAME=auth-service

# Expose application port
EXPOSE 8085

# Define volumes for persistent data
VOLUME ["/data", "/logs"]

# Health check to verify the service is running correctly
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 CMD curl -f http://localhost:8085/api/v1/auth/actuator/health || exit 1

# Define the entrypoint command
ENTRYPOINT exec java $JAVA_OPTS -jar /app/app.jar