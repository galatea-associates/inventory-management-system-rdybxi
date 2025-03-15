# Build stage
# node:18-alpine (v18.16.0)
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Set build arguments with default values
ARG API_BASE_URL=http://localhost:8080
ARG WEBSOCKET_URL=ws://localhost:8085

# Set environment variables
ENV NODE_ENV=production
ENV REACT_APP_API_BASE_URL=${API_BASE_URL}
ENV REACT_APP_WEBSOCKET_URL=${WEBSOCKET_URL}

# Copy package.json and package-lock.json for better layer caching
COPY package*.json ./

# Install dependencies with clean install for reproducible builds
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build && \
    # Clean up to reduce image size
    rm -rf node_modules

# Production stage
# nginx:1.25-alpine (v1.25.1)
FROM nginx:1.25-alpine

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Use non-root user
USER nginx

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]