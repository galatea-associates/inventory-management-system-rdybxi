/// <reference types="react-scripts" />

// Allows importing SVG files as React components
declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}

// Allows importing PNG files
declare module '*.png' {
  const content: string;
  export default content;
}

// Allows importing JPG files
declare module '*.jpg' {
  const content: string;
  export default content;
}

// Allows importing JPEG files
declare module '*.jpeg' {
  const content: string;
  export default content;
}

// Allows importing GIF files
declare module '*.gif' {
  const content: string;
  export default content;
}

// Allows importing BMP files
declare module '*.bmp' {
  const content: string;
  export default content;
}

// Allows importing CSS modules
declare module '*.module.css' {
  const content: { [key: string]: string };
  export default content;
}

// Allows importing SCSS modules
declare module '*.module.scss' {
  const content: { [key: string]: string };
  export default content;
}

// Allows importing SASS modules
declare module '*.module.sass' {
  const content: { [key: string]: string };
  export default content;
}

// Allows importing CSS files
declare module '*.css' {
  const content: void;
  export default content;
}

// Allows importing SCSS files
declare module '*.scss' {
  const content: void;
  export default content;
}

// Allows importing SASS files
declare module '*.sass' {
  const content: void;
  export default content;
}

// Allows importing JSON files
declare module '*.json' {
  const content: any;
  export default content;
}

// Allows importing WebP files
declare module '*.webp' {
  const content: string;
  export default content;
}

// Allows importing MP4 files
declare module '*.mp4' {
  const content: string;
  export default content;
}

// Allows importing WebM files
declare module '*.webm' {
  const content: string;
  export default content;
}

// Allows importing OGG files
declare module '*.ogg' {
  const content: string;
  export default content;
}

// Allows importing WAV files
declare module '*.wav' {
  const content: string;
  export default content;
}

// Allows importing MP3 files
declare module '*.mp3' {
  const content: string;
  export default content;
}

// Allows importing WOFF files
declare module '*.woff' {
  const content: string;
  export default content;
}

// Allows importing WOFF2 files
declare module '*.woff2' {
  const content: string;
  export default content;
}

// Allows importing TTF files
declare module '*.ttf' {
  const content: string;
  export default content;
}

// Allows importing EOT files
declare module '*.eot' {
  const content: string;
  export default content;
}

// Allows importing OTF files
declare module '*.otf' {
  const content: string;
  export default content;
}

// Allows importing PDF files
declare module '*.pdf' {
  const content: string;
  export default content;
}

// Type definitions for environment variables defined in .env files
declare namespace NodeJS {
  interface ProcessEnv {
    // Base URL for API requests
    REACT_APP_API_BASE_URL: string;
    // API version to use for requests
    REACT_APP_API_VERSION: string;
    // Timeout in milliseconds for API requests
    REACT_APP_API_TIMEOUT: string;
    // URL for WebSocket connections
    REACT_APP_WEBSOCKET_URL: string;
    // Flag to enable/disable authentication
    REACT_APP_AUTH_ENABLED: string;
    // Default language for the application
    REACT_APP_DEFAULT_LANGUAGE: string;
    // Current environment (development, staging, production)
    REACT_APP_ENVIRONMENT: string;
    // Flag to enable/disable mock API responses
    REACT_APP_ENABLE_MOCK_API: string;
    // Flag to enable/disable analytics tracking
    REACT_APP_ENABLE_ANALYTICS: string;
    // Logging level for the application
    REACT_APP_LOG_LEVEL: string;
    // Session timeout in milliseconds
    REACT_APP_SESSION_TIMEOUT: string;
    // Interval for refreshing data in milliseconds
    REACT_APP_REFRESH_INTERVAL: string;
    // Maximum file upload size in bytes
    REACT_APP_MAX_UPLOAD_SIZE: string;
    // Flag to enable/disable locate management feature
    REACT_APP_FEATURE_LOCATE_MANAGEMENT: string;
    // Flag to enable/disable short sell approval feature
    REACT_APP_FEATURE_SHORT_SELL_APPROVAL: string;
    // Flag to enable/disable calculation rules feature
    REACT_APP_FEATURE_CALCULATION_RULES: string;
    // Flag to enable/disable analytics feature
    REACT_APP_FEATURE_ANALYTICS: string;
    // Flag to enable/disable exception management feature
    REACT_APP_FEATURE_EXCEPTION_MANAGEMENT: string;
    // Flag to enable/disable performance monitoring
    REACT_APP_PERFORMANCE_MONITORING: string;
    // Current build version of the application
    REACT_APP_BUILD_VERSION: string;
  }
}