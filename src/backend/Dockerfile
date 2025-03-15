# Build stage
# eclipse-temurin:17-jdk-alpine (version: 17-jdk-alpine)
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache curl bash git

# Copy gradle files first for better layer caching
COPY gradle/ gradle/
COPY gradlew build.gradle settings.gradle ./

# Download dependencies in a separate layer
RUN ./gradlew --no-daemon dependencies

# Copy source code
COPY common-lib/ common-lib/
COPY src/ src/

# Build argument for service name
ARG SERVICE_NAME

# Build the application
RUN ./gradlew ${SERVICE_NAME}:bootJar --no-daemon

# Runtime stage
# eclipse-temurin:17-jre-alpine (version: 17-jre-alpine)
FROM eclipse-temurin:17-jre-alpine

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create directories with proper permissions
RUN mkdir -p /data /logs && chown -R appuser:appgroup /app /data /logs

# Build argument for service name
ARG SERVICE_NAME

# Copy the built JAR from the build stage
COPY --from=build /app/${SERVICE_NAME}/build/libs/*.jar /app/app.jar
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# JVM optimization for high throughput & performance
ENV JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENV SPRING_PROFILES_ACTIVE=prod

# Expose application port
EXPOSE 8080

# Define volumes for persistent data
VOLUME ["/data", "/logs"]

# Health check to monitor application status
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 CMD curl -f http://localhost:8080/actuator/health || exit 1

# Define the command to run the application
ENTRYPOINT exec java $JAVA_OPTS -jar /app/app.jar