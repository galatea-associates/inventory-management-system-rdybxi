/**
 * logger.ts
 * Utility for standardized logging in the Inventory Management System frontend.
 * Provides functions for logging messages at different severity levels, with support
 * for structured logging, log filtering by environment, and integration with monitoring systems.
 */

// Enum for log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Interface for log entry structure
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlationId?: string;
  user?: {
    id?: string;
    username?: string;
  };
  browser?: {
    userAgent?: string;
    language?: string;
    platform?: string;
  };
  data?: any;
}

// Default log level based on environment
let LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

// Configuration flags
let LOG_TO_CONSOLE = true;
let LOG_TO_SERVER = process.env.NODE_ENV === 'production';
const SERVER_LOG_ENDPOINT = process.env.REACT_APP_LOG_ENDPOINT || '/api/logs';
const MAX_LOG_QUEUE_SIZE = 100;

// Queue for storing logs to be sent to the server
const logQueue: LogEntry[] = [];

/**
 * Determines if a message should be logged based on its level
 * @param level - The log level to check
 * @returns True if the message should be logged
 */
function shouldLog(level: string): boolean {
  const levelHierarchy: { [key: string]: number } = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
  };

  return levelHierarchy[level] >= levelHierarchy[LOG_LEVEL];
}

/**
 * Gets the current correlation ID for request tracing
 * @returns Current correlation ID or undefined
 */
function getCorrelationId(): string | undefined {
  // This implementation should be modified to pull the correlation ID 
  // from wherever it is stored in your application
  try {
    return localStorage.getItem('correlationId') || undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * Gets information about the current browser environment
 * @returns Browser information object
 */
function getBrowserInfo(): LogEntry['browser'] {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform
  };
}

/**
 * Helper function to get current user information
 * This should be modified based on how user info is stored in your application
 */
function getCurrentUser(): LogEntry['user'] | undefined {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        id: user.id,
        username: user.username
      };
    }
    return undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * Formats a log entry with consistent structure
 * @param level - Log level
 * @param message - Log message
 * @param data - Additional data to include
 * @returns Formatted log entry
 */
function formatLogEntry(level: string, message: string, data?: any): LogEntry {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message
  };

  // Add correlation ID for request tracing if available
  const correlationId = getCorrelationId();
  if (correlationId) {
    logEntry.correlationId = correlationId;
  }

  // Add user information if available
  const currentUser = getCurrentUser();
  if (currentUser) {
    logEntry.user = currentUser;
  }

  // Add browser information
  logEntry.browser = getBrowserInfo();

  // Add additional data if provided
  if (data) {
    logEntry.data = data;
  }

  return logEntry;
}

/**
 * Adds a log entry to the server transmission queue
 * @param logEntry - The log entry to queue
 */
function addToQueue(logEntry: LogEntry): void {
  logQueue.push(logEntry);
  
  // If queue exceeds max size, flush it
  if (logQueue.length >= MAX_LOG_QUEUE_SIZE) {
    flushQueue();
  }
}

/**
 * Sends queued log entries to the server
 * @returns Promise that resolves when logs are sent
 */
export async function flushQueue(): Promise<void> {
  if (logQueue.length === 0) {
    return;
  }
  
  // Create a copy of the current queue and clear it
  const logsToSend = [...logQueue];
  logQueue.length = 0;
  
  try {
    // Send logs to server
    await fetch(SERVER_LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ logs: logsToSend })
    });
  } catch (error) {
    // If sending fails, log to console if enabled
    if (LOG_TO_CONSOLE) {
      console.error('Failed to send logs to server:', error);
      
      // Add logs back to the queue for retry, but avoid infinite growth
      if (logQueue.length + logsToSend.length <= MAX_LOG_QUEUE_SIZE) {
        logQueue.push(...logsToSend);
      }
    }
  }
}

/**
 * Internal function that handles the actual logging
 * @param level - Log level
 * @param message - Log message
 * @param data - Additional data to include
 */
function log(level: string, message: string, data?: any): void {
  // Format the log entry
  const logEntry = formatLogEntry(level, message, data);
  
  // Log to console if enabled
  if (LOG_TO_CONSOLE) {
    // Select appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message, { ...logEntry, message: undefined });
        break;
      case LogLevel.INFO:
        console.info(message, { ...logEntry, message: undefined });
        break;
      case LogLevel.WARN:
        console.warn(message, { ...logEntry, message: undefined });
        break;
      case LogLevel.ERROR:
        console.error(message, { ...logEntry, message: undefined });
        break;
      default:
        console.log(message, { ...logEntry, message: undefined });
    }
  }
  
  // Add to server queue if server logging is enabled
  if (LOG_TO_SERVER) {
    addToQueue(logEntry);
  }
}

/**
 * Logs a debug message
 * @param message - Log message
 * @param data - Additional data to include
 */
export function debug(message: string, data?: any): void {
  if (shouldLog(LogLevel.DEBUG)) {
    log(LogLevel.DEBUG, message, data);
  }
}

/**
 * Logs an informational message
 * @param message - Log message
 * @param data - Additional data to include
 */
export function info(message: string, data?: any): void {
  if (shouldLog(LogLevel.INFO)) {
    log(LogLevel.INFO, message, data);
  }
}

/**
 * Logs a warning message
 * @param message - Log message
 * @param data - Additional data to include
 */
export function warn(message: string, data?: any): void {
  if (shouldLog(LogLevel.WARN)) {
    log(LogLevel.WARN, message, data);
  }
}

/**
 * Logs an error message
 * @param message - Log message
 * @param data - Additional data to include
 */
export function error(message: string, data?: any): void {
  if (shouldLog(LogLevel.ERROR)) {
    log(LogLevel.ERROR, message, data);
  }
}

/**
 * Sets the current logging level
 * @param level - New log level
 */
export function setLogLevel(level: LogLevel): void {
  // Validate that the level is valid
  if (Object.values(LogLevel).includes(level)) {
    LOG_LEVEL = level;
  } else {
    warn(`Invalid log level: ${level}. Using current level: ${LOG_LEVEL}`);
  }
}

/**
 * Enables or disables logging to server
 * @param enable - Whether to enable server logging
 */
export function enableServerLogging(enable: boolean): void {
  LOG_TO_SERVER = enable;
  
  // If enabling and there are queued logs, flush the queue
  if (enable && logQueue.length > 0) {
    flushQueue();
  }
}

// Event listeners to handle log flushing
if (typeof window !== 'undefined') {
  // Flush logs when page is being unloaded
  window.addEventListener('beforeunload', () => {
    if (LOG_TO_SERVER && logQueue.length > 0) {
      // Use sendBeacon if available, otherwise make a synchronous XHR request
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          SERVER_LOG_ENDPOINT,
          JSON.stringify({ logs: logQueue })
        );
      } else {
        // Fallback for browsers that don't support sendBeacon
        const xhr = new XMLHttpRequest();
        xhr.open('POST', SERVER_LOG_ENDPOINT, false); // Synchronous request
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ logs: logQueue }));
      }
      logQueue.length = 0;
    }
  });

  // Periodically flush logs (every 30 seconds)
  setInterval(() => {
    if (LOG_TO_SERVER && logQueue.length > 0) {
      flushQueue();
    }
  }, 30000);
}