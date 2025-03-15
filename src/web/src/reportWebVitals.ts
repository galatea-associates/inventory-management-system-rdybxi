import { ReportHandler } from 'web-vitals'; // web-vitals ^2.1.4

/**
 * Reports web performance metrics (Web Vitals) to a specified handler or logs
 * them to the console if no handler is provided.
 * 
 * This function measures critical user-centric performance metrics that help ensure
 * the application meets the SLA requirement of <3s UI Dashboard load time.
 * 
 * Metrics reported include:
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - FID (First Input Delay): Measures interactivity
 * - FCP (First Contentful Paint): Measures perceived load speed
 * - LCP (Largest Contentful Paint): Measures perceived load speed
 * - TTFB (Time to First Byte): Measures server response time
 * 
 * @param onPerfEntry - Optional callback function to handle the metrics
 */
const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Measure and report Cumulative Layout Shift
      getCLS(onPerfEntry);
      
      // Measure and report First Input Delay
      getFID(onPerfEntry);
      
      // Measure and report First Contentful Paint
      getFCP(onPerfEntry);
      
      // Measure and report Largest Contentful Paint
      getLCP(onPerfEntry);
      
      // Measure and report Time to First Byte
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;