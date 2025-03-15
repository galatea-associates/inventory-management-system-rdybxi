import { useState, useEffect, useCallback } from 'react';
import { setItem, getItem, removeItem, isAvailable } from '../utils/sessionStorage';

/**
 * A custom React hook that provides a stateful interface to the browser's sessionStorage API.
 * This hook allows components to read from and write to sessionStorage while maintaining
 * the value in React state. Unlike localStorage, sessionStorage data is cleared when the
 * page session ends.
 * 
 * @param key - The key to store the value under in sessionStorage
 * @param initialValue - The initial value to use if no value exists in sessionStorage
 * @returns A tuple containing [currentValue, setValue, removeValue]
 *          - currentValue: The current value from sessionStorage or initialValue
 *          - setValue: Function to update the value in both state and sessionStorage
 *          - removeValue: Function to remove the item from sessionStorage and reset state
 */
const useSessionStorage = <T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, () => void] => {
  // Check if sessionStorage is available in the current environment
  const storageAvailable = isAvailable();
  
  // Initialize state with value from sessionStorage or fallback to initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!storageAvailable) {
      return initialValue;
    }
    
    return getItem<T>(key, initialValue);
  });
  
  // Function to update both the React state and sessionStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((prevValue) => {
      // Handle both direct value updates and functional updates
      const newValue = value instanceof Function ? value(prevValue) : value;
      
      // Update sessionStorage if available
      if (storageAvailable) {
        setItem(key, newValue);
      }
      
      return newValue;
    });
  }, [key, storageAvailable]);
  
  // Function to remove the item from sessionStorage and reset state
  const removeValue = useCallback(() => {
    if (storageAvailable) {
      removeItem(key);
    }
    
    setStoredValue(initialValue);
  }, [key, initialValue, storageAvailable]);
  
  // Listen for changes to this key in other tabs/windows
  useEffect(() => {
    if (!storageAvailable) {
      return;
    }
    
    // Handle storage events (for syncing between tabs)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea === sessionStorage && event.key === key) {
        // If the key was removed
        if (event.newValue === null) {
          setStoredValue(initialValue);
        } else {
          // Try to parse the new value
          try {
            const newValue = JSON.parse(event.newValue);
            setStoredValue(newValue);
          } catch (error) {
            // If parsing fails, use the raw value
            setStoredValue(event.newValue as unknown as T);
          }
        }
      }
    };
    
    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [initialValue, key, storageAvailable]);
  
  return [storedValue, setValue, removeValue];
};

export default useSessionStorage;