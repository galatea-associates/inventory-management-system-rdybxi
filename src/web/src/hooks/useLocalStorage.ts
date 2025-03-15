import { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { setItem, getItem, removeItem, isAvailable } from '../utils/localStorage';

/**
 * A custom React hook that provides a stateful interface to the browser's localStorage API.
 * This hook allows components to read from and write to localStorage while maintaining
 * the value in React state, ensuring UI updates when the stored value changes.
 * 
 * Features:
 * - Syncs data between React state and localStorage
 * - Updates across browser tabs (via storage event)
 * - Type-safe with TypeScript generics
 * - Fallback to initialValue if localStorage is unavailable
 * - Provides functions for setting and removing values
 *
 * @param key - The localStorage key to use for storing the value
 * @param initialValue - The default value to use if no value exists in localStorage
 * @returns [storedValue, setValue, removeValue] 
 *          - Current value from state/storage
 *          - Function to update the value
 *          - Function to remove the value from storage
 */
function useLocalStorage<T>(key: string, initialValue: T): [
  T, 
  (value: T | ((val: T) => T)) => void,
  () => void
] {
  // Check if localStorage is available in the current environment
  const storageAvailable = isAvailable();

  // Initialize state with value from localStorage or initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!storageAvailable) {
      return initialValue;
    }

    try {
      // Get stored value from localStorage
      const item = getItem<T>(key);
      
      // If a value is found and it's not null, return it; otherwise return initialValue
      return item !== null ? (item as T) : initialValue;
    } catch (error) {
      // If there's an error during retrieval or parsing, fall back to initialValue
      return initialValue;
    }
  });

  // Create a function to update both state and localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function (like setState)
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Update state
      setStoredValue(valueToStore);
      
      // Update localStorage if available
      if (storageAvailable) {
        setItem(key, valueToStore);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, storageAvailable]);

  // Create a function to remove the value from localStorage
  const removeValue = useCallback(() => {
    try {
      if (storageAvailable) {
        removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, storageAvailable]);

  // Listen for changes to localStorage from other tabs/windows
  useEffect(() => {
    if (!storageAvailable) {
      return;
    }

    // Handler for storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) {
        return;
      }
      
      try {
        if (e.newValue === null) {
          // Item was removed, reset to initialValue
          setStoredValue(initialValue);
        } else {
          // Try to parse the new value as JSON
          const parsedValue = JSON.parse(e.newValue);
          setStoredValue(parsedValue);
        }
      } catch (error) {
        // If parsing fails, use the raw string value
        if (e.newValue !== null) {
          setStoredValue(e.newValue as unknown as T);
        } else {
          setStoredValue(initialValue);
        }
      }
    };

    // Add event listener for storage events
    window.addEventListener('storage', handleStorageChange);

    // Clean up the event listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue, storageAvailable]);

  // Return the current value, setter function, and remove function
  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;