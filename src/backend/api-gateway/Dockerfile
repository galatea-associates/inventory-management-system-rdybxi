# Build stage
FROM eclipse-temurin:17-jdk-alpine AS build
# version: 17-jdk-alpine

WORKDIR /app

# Install necessary build dependencies
RUN apk add --no-cache curl bash git

# Copy gradle files first for better layer caching
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
COPY gradlew ./

# Download dependencies to optimize build caching
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src ./src

# Build the application
RUN ./gradlew clean bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
# version: 17-jre-alpine

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p /data /logs && chown -R appuser:appgroup /app /data /logs

# Copy the JAR file from the build stage
COPY --from=build /app/build/libs/*.jar /app/api-gateway.jar

# Set proper ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set JVM options for performance and troubleshooting
ENV JAVA_OPTS="-Xms512m -Xmx1g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVICE_JAR=api-gateway.jar

# Expose the application port
EXPOSE 8080

# Define volumes for persistent data and logs
VOLUME ["/data", "/logs"]

# Health check to verify the service is running properly
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Start the application
ENTRYPOINT exec java $JAVA_OPTS -jar $SERVICE_JAR