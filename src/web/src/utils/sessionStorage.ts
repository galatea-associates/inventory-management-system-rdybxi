/**
 * sessionStorage.ts
 * Utility module providing type-safe wrapper functions for browser's sessionStorage API.
 * Handles serialization/deserialization of complex objects, error handling for browser
 * storage limitations, and provides a consistent interface for storing and retrieving
 * data from sessionStorage across the application.
 * 
 * Unlike localStorage, sessionStorage data is cleared when the page session ends.
 */

import { error } from './logger';

/**
 * Stores a value in sessionStorage with the specified key.
 * Handles serialization of complex objects to JSON strings.
 * 
 * @param key - The key to store the value under
 * @param value - The value to store, can be any serializable type
 */
export function setItem(key: string, value: any): void {
  try {
    // If value is object or array, serialize it to JSON
    const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
    sessionStorage.setItem(key, valueToStore);
  } catch (e) {
    // Log error but don't throw to prevent application crashes
    error('Failed to store item in sessionStorage', { 
      key, 
      errorMessage: e instanceof Error ? e.message : String(e) 
    });
  }
}

/**
 * Retrieves a value from sessionStorage by key.
 * Handles deserialization of JSON strings back to objects.
 * 
 * @param key - The key to retrieve the value for
 * @param defaultValue - The default value to return if the key doesn't exist or an error occurs
 * @returns The retrieved value, or defaultValue if the key doesn't exist or an error occurs
 */
export function getItem<T>(key: string, defaultValue?: T): any {
  try {
    const item = sessionStorage.getItem(key);
    
    // Return defaultValue if item doesn't exist
    if (item === null) {
      return defaultValue;
    }
    
    // Try to parse the item as JSON
    try {
      return JSON.parse(item);
    } catch (parseError) {
      // If parsing fails, return the raw string value
      return item;
    }
  } catch (e) {
    // Log error and return defaultValue
    error('Failed to retrieve item from sessionStorage', { 
      key, 
      errorMessage: e instanceof Error ? e.message : String(e) 
    });
    return defaultValue;
  }
}

/**
 * Removes an item from sessionStorage by key.
 * 
 * @param key - The key of the item to remove
 */
export function removeItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    // Log error but don't throw
    error('Failed to remove item from sessionStorage', { 
      key, 
      errorMessage: e instanceof Error ? e.message : String(e) 
    });
  }
}

/**
 * Clears all items from sessionStorage.
 */
export function clear(): void {
  try {
    sessionStorage.clear();
  } catch (e) {
    // Log error but don't throw
    error('Failed to clear sessionStorage', { 
      errorMessage: e instanceof Error ? e.message : String(e) 
    });
  }
}

/**
 * Checks if an item exists in sessionStorage by key.
 * 
 * @param key - The key to check
 * @returns True if the item exists, false otherwise
 */
export function hasItem(key: string): boolean {
  try {
    return sessionStorage.getItem(key) !== null;
  } catch (e) {
    // Log error and return false
    error('Failed to check if item exists in sessionStorage', { 
      key, 
      errorMessage: e instanceof Error ? e.message : String(e) 
    });
    return false;
  }
}

/**
 * Gets all keys currently stored in sessionStorage.
 * 
 * @returns Array of all keys in sessionStorage
 */
export function getKeys(): string[] {
  try {
    return Object.keys(sessionStorage);
  } catch (e) {
    // Log error and return empty array
    error('Failed to get keys from sessionStorage', { 
      errorMessage: e instanceof Error ? e.message : String(e) 
    });
    return [];
  }
}

/**
 * Gets the current size of sessionStorage in bytes.
 * 
 * @returns Size of sessionStorage in bytes
 */
export function getSize(): number {
  try {
    let size = 0;
    for (const key of Object.keys(sessionStorage)) {
      const value = sessionStorage.getItem(key) || '';
      // Calculate size: key length + value length (in UTF-16 units, which is 2 bytes per character)
      size += (key.length + value.length) * 2;
    }
    return size;
  } catch (e) {
    // Log error and return 0
    error('Failed to calculate sessionStorage size', { 
      errorMessage: e instanceof Error ? e.message : String(e) 
    });
    return 0;
  }
}

/**
 * Checks if sessionStorage is available in the current browser environment.
 * 
 * @returns True if sessionStorage is available, false otherwise
 */
export function isAvailable(): boolean {
  try {
    // Try to set a test item
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch (e) {
    // Log error and return false
    error('sessionStorage is not available', { 
      errorMessage: e instanceof Error ? e.message : String(e) 
    });
    return false;
  }
}