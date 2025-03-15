/**
 * Analytics Service
 * 
 * This service provides functionality for tracking and analyzing user interactions
 * and system events in the Inventory Management System frontend. It supports
 * user behavior tracking, performance metrics, and integration with analytics providers.
 */

import { v4 as uuidv4 } from 'uuid'; // uuid ^9.0.0
import { debug, info, error } from '../utils/logger';
import { isAuthenticated, getCurrentUser } from './auth.service';
import { getEnvironmentConfig } from '../config/api';

// Configuration flags from environment variables
const ANALYTICS_ENABLED = process.env.REACT_APP_ANALYTICS_ENABLED === 'true';
const ANALYTICS_ENDPOINT = process.env.REACT_APP_ANALYTICS_ENDPOINT || '/api/analytics';
const PERFORMANCE_METRICS_ENABLED = process.env.REACT_APP_PERFORMANCE_METRICS_ENABLED === 'true';

// Analytics state
let SESSION_ID = uuidv4();
const EVENT_QUEUE: any[] = [];
const QUEUE_FLUSH_INTERVAL = 30000; // 30 seconds
const MAX_QUEUE_SIZE = 100;

// Interval reference for queue flushing
let flushIntervalId: number | null = null;

// Timing measurements storage
const timingMeasurements = new Map<string, number>();

// Performance observers
let lcpObserver: PerformanceObserver | null = null;
let fidObserver: PerformanceObserver | null = null;
let clsObserver: PerformanceObserver | null = null;
let longTaskObserver: PerformanceObserver | null = null;

/**
 * Initializes the analytics service and starts the event queue processing
 */
export function initAnalytics(): void {
    if (!ANALYTICS_ENABLED) {
        debug('Analytics disabled. Skipping initialization.');
        return;
    }
    
    // Generate a new session ID
    SESSION_ID = uuidv4();
    
    // Set up queue flush interval
    if (flushIntervalId !== null) {
        clearInterval(flushIntervalId);
    }
    
    flushIntervalId = window.setInterval(() => {
        if (EVENT_QUEUE.length > 0) {
            flushQueue();
        }
    }, QUEUE_FLUSH_INTERVAL);
    
    // Register performance observers if enabled
    if (PERFORMANCE_METRICS_ENABLED) {
        registerPerformanceObservers();
    }
    
    // Track initial page load
    trackPageView(
        document.title || 'Page Load',
        window.location.href
    );
    
    info('Analytics initialized', { sessionId: SESSION_ID });
}

/**
 * Tracks a user interaction or system event
 * 
 * @param category - Event category (e.g., 'User', 'System', 'Feature')
 * @param action - Action performed (e.g., 'Click', 'Login', 'Export')
 * @param label - Additional label for the event
 * @param properties - Additional properties to include with the event
 */
export function trackEvent(
    category: string,
    action: string,
    label?: string,
    properties?: Record<string, any>
): void {
    if (!ANALYTICS_ENABLED) {
        return;
    }
    
    const timestamp = new Date().toISOString();
    
    // Create the basic event object
    const event: Record<string, any> = {
        timestamp,
        category,
        action,
        sessionId: SESSION_ID
    };
    
    // Add label if provided
    if (label) {
        event.label = label;
    }
    
    // Add additional properties if provided
    if (properties && typeof properties === 'object') {
        event.properties = properties;
    }
    
    // Add device info
    event.device = getDeviceInfo();
    
    // Add user information if authenticated - this happens asynchronously
    // and will enrich the event object after it's already in the queue
    if (isAuthenticated()) {
        getUserContext()
            .then(userContext => {
                if (Object.keys(userContext).length > 0) {
                    event.user = userContext;
                }
            })
            .catch(err => {
                debug('Failed to get user context for event', { category, action, error: err });
            });
    }
    
    // Add to queue
    EVENT_QUEUE.push(event);
    
    // Check if we need to flush the queue
    if (EVENT_QUEUE.length >= MAX_QUEUE_SIZE) {
        flushQueue();
    }
    
    debug('Event tracked', { category, action, label });
}

/**
 * Tracks a page view event
 * 
 * @param pageName - Name of the page viewed
 * @param pageUrl - URL of the page
 * @param properties - Additional properties to include with the event
 */
export function trackPageView(
    pageName: string,
    pageUrl?: string,
    properties?: Record<string, any>
): void {
    // Create properties object with page URL if provided
    const pageProperties = {
        ...(properties || {}),
        url: pageUrl || window.location.href,
        referrer: document.referrer || '',
        title: document.title || pageName
    };
    
    trackEvent('Page', 'View', pageName, pageProperties);
}

/**
 * Tracks usage of a specific feature
 * 
 * @param featureName - Name of the feature used
 * @param action - Action performed with the feature
 * @param properties - Additional properties to include with the event
 */
export function trackFeatureUsage(
    featureName: string,
    action: string,
    properties?: Record<string, any>
): void {
    trackEvent('Feature', action, featureName, properties);
}

/**
 * Tracks an error event
 * 
 * @param errorType - Type of error
 * @param errorMessage - Error message
 * @param errorDetails - Additional error details
 */
export function trackError(
    errorType: string,
    errorMessage: string,
    errorDetails?: Record<string, any>
): void {
    // Also log the error using the error logging utility
    error(`${errorType}: ${errorMessage}`, errorDetails);
    
    // Track the error as an event
    trackEvent('Error', errorType, errorMessage, errorDetails);
}

/**
 * Tracks a performance-related metric
 * 
 * @param metricName - Name of the metric
 * @param value - Numeric value of the metric
 * @param unit - Unit of measurement (e.g., 'ms', 'bytes')
 * @param properties - Additional properties to include with the event
 */
export function trackPerformance(
    metricName: string,
    value: number,
    unit: string,
    properties?: Record<string, any>
): void {
    if (!PERFORMANCE_METRICS_ENABLED) {
        return;
    }
    
    const performanceProperties = {
        ...(properties || {}),
        value,
        unit
    };
    
    trackEvent('Performance', metricName, unit, performanceProperties);
}

/**
 * Tracks the timing of an operation
 * 
 * @param category - Category of the timing measurement
 * @param variable - Variable being measured
 * @param time - Time in milliseconds
 * @param label - Optional label for the measurement
 */
export function trackTiming(
    category: string,
    variable: string,
    time: number,
    label?: string
): void {
    if (!PERFORMANCE_METRICS_ENABLED) {
        return;
    }
    
    const properties = {
        time,
        unit: 'ms'
    };
    
    trackEvent(category, variable, label, properties);
}

/**
 * Starts a timing measurement for performance tracking
 * 
 * @param measurementId - Optional identifier for the measurement
 * @returns Identifier for the measurement to use with endTimingMeasurement
 */
export function startTimingMeasurement(measurementId?: string): string {
    const id = measurementId || uuidv4();
    timingMeasurements.set(id, performance.now());
    return id;
}

/**
 * Ends a timing measurement and tracks the result
 * 
 * @param measurementId - Identifier from startTimingMeasurement
 * @param category - Category of the timing measurement
 * @param variable - Variable being measured
 * @param label - Optional label for the measurement
 * @returns The measured time in milliseconds
 */
export function endTimingMeasurement(
    measurementId: string,
    category: string,
    variable: string,
    label?: string
): number {
    const startTime = timingMeasurements.get(measurementId);
    if (startTime === undefined) {
        error('No timing measurement found for ID', { measurementId });
        return 0;
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Track the timing
    trackTiming(category, variable, duration, label);
    
    // Clean up
    timingMeasurements.delete(measurementId);
    
    return duration;
}

/**
 * Sends queued analytics events to the server
 */
export async function flushQueue(): Promise<void> {
    if (EVENT_QUEUE.length === 0) {
        return;
    }
    
    // Create a copy of the current queue and clear it
    const eventsToSend = [...EVENT_QUEUE];
    EVENT_QUEUE.length = 0;
    
    try {
        // Send events to analytics endpoint
        const response = await fetch(ANALYTICS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': SESSION_ID
            },
            body: JSON.stringify({
                events: eventsToSend,
                sessionId: SESSION_ID,
                timestamp: new Date().toISOString()
            }),
            // If this is closing the window, use keepalive to ensure the request completes
            keepalive: navigator.sendBeacon !== undefined
        });
        
        if (!response.ok) {
            throw new Error(`Analytics API returned ${response.status}: ${response.statusText}`);
        }
        
        debug('Analytics queue flushed', { eventCount: eventsToSend.length });
    } catch (err) {
        // Handle transmission error - add events back to queue
        error('Failed to send analytics events', err);
        
        // Add events back to the queue, but avoid growing it too large
        if (EVENT_QUEUE.length + eventsToSend.length <= MAX_QUEUE_SIZE * 2) {
            EVENT_QUEUE.push(...eventsToSend);
        } else {
            // If queue would get too large, only keep the most recent events
            const eventsToKeep = eventsToSend.slice(-MAX_QUEUE_SIZE);
            EVENT_QUEUE.push(...eventsToKeep);
            
            error('Analytics queue overflow - some events were discarded', {
                discarded: eventsToSend.length - eventsToKeep.length
            });
        }
    }
}

/**
 * Registers browser performance observers for automatic metric collection
 */
function registerPerformanceObservers(): void {
    // Check if Performance API is available
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
        debug('Performance API not available. Skipping performance observers.');
        return;
    }
    
    try {
        // Check for supportedEntryTypes before registering observers
        const supportedTypes = PerformanceObserver.supportedEntryTypes || [];
        
        // Largest Contentful Paint observer
        if (supportedTypes.includes('largest-contentful-paint')) {
            lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) {
                    trackPerformance('LargestContentfulPaint', lastEntry.startTime, 'ms', {
                        entryType: lastEntry.entryType
                    });
                }
            });
            
            try {
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            } catch (e) {
                // Fallback for browsers with different API
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            }
        }
        
        // First Input Delay observer
        if (supportedTypes.includes('first-input')) {
            fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const firstInput = entries[0];
                if (firstInput) {
                    // Need to use 'as any' because PerformanceEventTiming may not be recognized in all TS versions
                    const processingStart = (firstInput as any).processingStart || 0;
                    const startTime = firstInput.startTime || 0;
                    const delay = processingStart - startTime;
                    
                    if (delay > 0) {
                        trackPerformance('FirstInputDelay', delay, 'ms', {
                            entryType: firstInput.entryType
                        });
                    }
                }
            });
            
            try {
                fidObserver.observe({ type: 'first-input', buffered: true });
            } catch (e) {
                // Fallback for browsers with different API
                fidObserver.observe({ entryTypes: ['first-input'] });
            }
        }
        
        // Cumulative Layout Shift observer
        if (supportedTypes.includes('layout-shift')) {
            let cumulativeLayoutShift = 0;
            
            clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    // Need to use 'as any' because LayoutShift may not be recognized in all TS versions
                    const layoutShift = entry as any;
                    if (!layoutShift.hadRecentInput) {
                        cumulativeLayoutShift += layoutShift.value || 0;
                    }
                }
                
                // Report CLS every 5 seconds
                trackPerformance('CumulativeLayoutShift', cumulativeLayoutShift, 'score');
            });
            
            try {
                clsObserver.observe({ type: 'layout-shift', buffered: true });
            } catch (e) {
                // Fallback for browsers with different API
                clsObserver.observe({ entryTypes: ['layout-shift'] });
            }
        }
        
        // Long Tasks observer
        if (supportedTypes.includes('longtask')) {
            longTaskObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    trackPerformance('LongTask', entry.duration, 'ms', {
                        entryType: entry.entryType
                    });
                }
            });
            
            try {
                longTaskObserver.observe({ type: 'longtask', buffered: true });
            } catch (e) {
                // Fallback for browsers with different API
                longTaskObserver.observe({ entryTypes: ['longtask'] });
            }
        }
        
        // Navigation Timing API - collect page load metrics
        if (performance.timing) {
            // Use setTimeout to ensure the timing data is complete
            setTimeout(() => {
                const timing = performance.timing;
                
                // DNS lookup time
                const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
                if (dnsTime > 0) {
                    trackPerformance('DNSLookup', dnsTime, 'ms');
                }
                
                // TCP connection time
                const tcpTime = timing.connectEnd - timing.connectStart;
                if (tcpTime > 0) {
                    trackPerformance('TCPConnection', tcpTime, 'ms');
                }
                
                // Time to First Byte
                const ttfb = timing.responseStart - timing.requestStart;
                if (ttfb > 0) {
                    trackPerformance('TimeToFirstByte', ttfb, 'ms');
                }
                
                // DOM Content Loaded
                const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
                if (domContentLoaded > 0) {
                    trackPerformance('DOMContentLoaded', domContentLoaded, 'ms');
                }
                
                // Page Load Time
                const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
                if (pageLoadTime > 0) {
                    trackPerformance('PageLoadTime', pageLoadTime, 'ms');
                }
            }, 0);
        }
        
        debug('Performance observers registered successfully');
    } catch (err) {
        error('Failed to register performance observers', err);
    }
}

/**
 * Gets the current user context for analytics events
 * 
 * @returns User context object with relevant user data
 */
async function getUserContext(): Promise<Record<string, any>> {
    if (!isAuthenticated()) {
        return {};
    }
    
    try {
        const user = await getCurrentUser();
        
        // Extract only the information needed for analytics
        return {
            id: user.id,
            role: user.roles?.[0] || 'unknown',
            permissions: user.permissions?.length || 0
        };
    } catch (err) {
        error('Failed to get user context for analytics', err);
        return {};
    }
}

/**
 * Gets information about the user's device and browser
 * 
 * @returns Device and browser information
 */
function getDeviceInfo(): Record<string, any> {
    const deviceInfo: Record<string, any> = {};
    
    try {
        const { userAgent, language, platform } = navigator;
        
        deviceInfo.userAgent = userAgent;
        deviceInfo.language = language;
        deviceInfo.platform = platform;
        
        // Determine browser name and version
        if (userAgent.includes('Firefox/')) {
            deviceInfo.browser = 'Firefox';
            const version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1];
            if (version) deviceInfo.browserVersion = version;
        } else if (userAgent.includes('Edge/') || userAgent.includes('Edg/')) {
            deviceInfo.browser = 'Edge';
            const version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || userAgent.match(/Edg\/([0-9.]+)/)?.[1];
            if (version) deviceInfo.browserVersion = version;
        } else if (userAgent.includes('Chrome/')) {
            deviceInfo.browser = 'Chrome';
            const version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1];
            if (version) deviceInfo.browserVersion = version;
        } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
            deviceInfo.browser = 'Safari';
            const version = userAgent.match(/Version\/([0-9.]+)/)?.[1];
            if (version) deviceInfo.browserVersion = version;
        } else if (userAgent.includes('MSIE ') || userAgent.includes('Trident/')) {
            deviceInfo.browser = 'Internet Explorer';
            const version = userAgent.match(/MSIE ([0-9.]+)/)?.[1] || userAgent.match(/rv:([0-9.]+)/)?.[1];
            if (version) deviceInfo.browserVersion = version;
        } else {
            deviceInfo.browser = 'Unknown';
        }
        
        // Determine device type
        if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            if (/iPad|Tablet/i.test(userAgent)) {
                deviceInfo.deviceType = 'tablet';
            } else {
                deviceInfo.deviceType = 'mobile';
            }
        } else {
            deviceInfo.deviceType = 'desktop';
        }
        
        // Determine operating system
        if (/Windows NT/.test(userAgent)) {
            deviceInfo.os = 'Windows';
            const version = userAgent.match(/Windows NT ([0-9.]+)/)?.[1];
            if (version) deviceInfo.osVersion = version;
        } else if (/Macintosh/.test(userAgent)) {
            deviceInfo.os = 'MacOS';
            const version = userAgent.match(/Mac OS X ([0-9_.]+)/)?.[1]?.replace(/_/g, '.');
            if (version) deviceInfo.osVersion = version;
        } else if (/Linux/.test(userAgent) && !/Android/.test(userAgent)) {
            deviceInfo.os = 'Linux';
        } else if (/Android/.test(userAgent)) {
            deviceInfo.os = 'Android';
            const version = userAgent.match(/Android ([0-9.]+)/)?.[1];
            if (version) deviceInfo.osVersion = version;
        } else if (/iPhone|iPad|iPod/.test(userAgent)) {
            deviceInfo.os = 'iOS';
            const version = userAgent.match(/OS ([0-9_]+)/)?.[1]?.replace(/_/g, '.');
            if (version) deviceInfo.osVersion = version;
        } else {
            deviceInfo.os = 'Unknown';
        }
        
        // Add screen information if available
        if (window.screen) {
            deviceInfo.screen = {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth,
                pixelRatio: window.devicePixelRatio || 1
            };
        }
        
        // Add viewport information
        deviceInfo.viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        // Add connection information if available
        if (navigator.connection) {
            const connection = navigator.connection as any;
            deviceInfo.connection = {
                type: connection.effectiveType || connection.type,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }
    } catch (err) {
        // If we encounter any errors, return a minimal device info object
        error('Error getting device info', err);
        return {
            userAgent: navigator.userAgent,
            error: 'Failed to determine detailed device information'
        };
    }
    
    return deviceInfo;
}

/**
 * Enables or disables analytics collection
 * 
 * @param enabled - Whether analytics should be enabled
 */
export function setAnalyticsEnabled(enabled: boolean): void {
    // We need to update the global variable so that it's consistent across the application
    (window as any).ANALYTICS_ENABLED = enabled;
    
    if (enabled === ANALYTICS_ENABLED) {
        return; // No change needed
    }
    
    if (enabled) {
        // Initialize analytics if enabling
        initAnalytics();
    } else {
        // Clear the queue and stop the flush interval if disabling
        EVENT_QUEUE.length = 0;
        
        if (flushIntervalId !== null) {
            clearInterval(flushIntervalId);
            flushIntervalId = null;
        }
        
        // Clean up performance observers
        if (lcpObserver) lcpObserver.disconnect();
        if (fidObserver) fidObserver.disconnect();
        if (clsObserver) clsObserver.disconnect();
        if (longTaskObserver) longTaskObserver.disconnect();
    }
    
    info(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Checks if analytics collection is currently enabled
 * 
 * @returns True if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
    return ANALYTICS_ENABLED;
}

// Set up unload listener to send any queued events when the page is closed
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (ANALYTICS_ENABLED && EVENT_QUEUE.length > 0) {
            // Try to use sendBeacon for more reliable delivery during page unload
            if (navigator.sendBeacon) {
                const payload = JSON.stringify({
                    events: EVENT_QUEUE,
                    sessionId: SESSION_ID,
                    timestamp: new Date().toISOString()
                });
                
                navigator.sendBeacon(ANALYTICS_ENDPOINT, payload);
                EVENT_QUEUE.length = 0;
            } else {
                // Fall back to synchronous XHR if sendBeacon is not available
                flushQueue();
            }
        }
    });
}