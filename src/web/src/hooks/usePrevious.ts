import { useRef, useEffect } from 'react'; // React 18.2

/**
 * A custom React hook that allows components to access the previous value of a state or prop.
 * This is useful for comparing changes between renders, implementing animations, or
 * conditionally executing side effects based on value changes.
 *
 * @template T The type of the value to track
 * @param value The current value to track
 * @returns The previous value or undefined on first render
 * 
 * @example
 * // Track changes in a counter value
 * const count = useState(0);
 * const previousCount = usePrevious(count);
 * 
 * // Use in an effect to respond to changes
 * useEffect(() => {
 *   if (previousCount !== undefined && previousCount !== count) {
 *     console.log(`Count changed from ${previousCount} to ${count}`);
 *   }
 * }, [count, previousCount]);
 */
export function usePrevious<T>(value: T): T | undefined {
  // Create a ref using useRef to store the previous value
  // The ref will persist between renders while remaining mutable
  const ref = useRef<T | undefined>(undefined);
  
  // Use useEffect to update the ref after each render
  // This ensures we're storing the value from the previous render cycle
  useEffect(() => {
    // In the effect, assign the current value to the ref
    // This happens after the render is committed to the screen
    ref.current = value;
    
    // No cleanup function needed for this effect
  }, [value]); // Only re-run if value changes
  
  // Return the current value stored in the ref
  // On the first render, this will be undefined
  // On subsequent renders, this will be the value from the previous render
  return ref.current;
}