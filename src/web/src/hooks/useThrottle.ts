import { useState, useEffect, useRef, useCallback } from 'react'; // react version: ^18.2.0
import throttle from 'lodash/throttle'; // lodash version: ^4.17.21

/**
 * A hook that returns a throttled version of the provided value, which only
 * updates at a maximum frequency specified by the delay parameter.
 * 
 * This is useful for optimizing performance in scenarios where a value changes
 * frequently but the consuming component doesn't need to react to every change
 * (e.g., scroll position, mouse movement).
 * 
 * @param value The value to throttle
 * @param delay The minimum time in milliseconds between updates
 * @returns The throttled value that updates at most once per specified delay period
 */
export function useThrottle<T>(value: T, delay: number): T {
  // State to hold the throttled value
  const [throttledValue, setThrottledValue] = useState<T>(value);
  
  // Reference to store the timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Reference to store the last updated time
  const lastUpdatedRef = useRef<number>(Date.now());

  useEffect(() => {
    // Calculate time since last update
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdatedRef.current;
    
    // If time since last update is greater than delay, update immediately
    if (timeSinceLastUpdate >= delay) {
      setThrottledValue(value);
      lastUpdatedRef.current = now;
    } else {
      // Otherwise, schedule update after the remaining delay time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastUpdatedRef.current = Date.now();
        timeoutRef.current = null;
      }, delay - timeSinceLastUpdate);
    }
    
    // Cleanup function to clear timeout on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);
  
  return throttledValue;
}

/**
 * A hook that returns a throttled version of the provided function, which can be
 * called at most once per specified delay period.
 * 
 * This is useful for optimizing event handlers like scroll, resize, or other
 * high-frequency events that might trigger expensive operations.
 * 
 * @param fn The function to throttle
 * @param delay The minimum time in milliseconds between function invocations
 * @param leading Whether to invoke the function on the leading edge of the timeout (default: true)
 * @param trailing Whether to invoke the function on the trailing edge of the timeout (default: true)
 * @returns A throttled version of the provided function
 */
export function useThrottleFunction<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number,
  leading: boolean = true,
  trailing: boolean = true
): T {
  // Reference to store the throttled function
  const throttledFnRef = useRef<T | null>(null);
  
  // Memoize the creation of the throttled function
  const throttledFn = useCallback(
    throttle(
      (...args: Parameters<T>) => {
        return fn(...args);
      },
      delay,
      { leading, trailing }
    ) as unknown as T,
    [fn, delay, leading, trailing]
  );
  
  // Update the throttled function reference when dependencies change
  useEffect(() => {
    throttledFnRef.current = throttledFn;
    
    // Cleanup function to cancel any pending invocations
    return () => {
      const currentFn = throttledFnRef.current as unknown as { cancel?: () => void };
      if (currentFn && typeof currentFn.cancel === 'function') {
        currentFn.cancel();
      }
    };
  }, [throttledFn]);
  
  return throttledFn;
}