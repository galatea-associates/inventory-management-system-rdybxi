import { useState, useEffect } from 'react'; // react 18.2.0

/**
 * A custom hook that implements debouncing functionality. This hook delays the processing
 * of a rapidly changing value until the changes have stopped for a specified delay period.
 * 
 * Particularly useful for:
 * - Search inputs that trigger API calls
 * - Form validation that should only run after user stops typing
 * - Resizing or scrolling event handlers
 * - Any scenario where you want to limit the rate of function calls
 * 
 * @template T The type of the value being debounced
 * @param {T} value The value to debounce
 * @param {number} delay The delay in milliseconds before updating the debounced value
 * @returns {T} The debounced value that updates only after the specified delay has passed without changes
 */
function useDebounce<T>(value: T, delay: number): T {
  // State to hold the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay has passed,
    // or if the component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]); // Re-run effect if value or delay changes

  return debouncedValue;
}

export default useDebounce;