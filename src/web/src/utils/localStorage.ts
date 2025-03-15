/**
 * localStorage.ts
 * Type-safe wrapper functions for browser's localStorage API with enhanced functionality
 * for serialization, error handling, and consistent data access across the application.
 * 
 * This module provides utility functions to handle common localStorage operations with
 * proper error handling, serialization of complex objects, and a consistent interface.
 */

import { error } from './logger';

/**
 * Stores a value in localStorage with the specified key.
 * Handles serialization of complex objects to JSON strings.
 *
 * @param key - The key under which to store the value
 * @param value - The value to store (can be any type)
 */
export function setItem(key: string, value: any): void {
  try {
    // Handle objects and arrays by serializing to JSON
    const storageValue = typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : String(value);
    
    localStorage.setItem(key, storageValue);
  } catch (err) {
    // Log errors but don't throw to prevent application crashes
    error('Failed to store item in localStorage', { 
      key, 
      errorMessage: err instanceof Error ? err.message : String(err) 
    });
  }
}

/**
 * Retrieves a value from localStorage by key.
 * Handles deserialization of JSON strings back to objects.
 *
 * @param key - The key to retrieve
 * @param defaultValue - Value to return if key doesn't exist or an error occurs
 * @returns The retrieved value or the default value
 */
export function getItem<T>(key: string, defaultValue?: T): T | null | string {
  try {
    const value = localStorage.getItem(key);
    
    // Return defaultValue if key doesn't exist
    if (value === null) {
      return defaultValue ?? null;
    }
    
    // Try to parse as JSON, return as string if parsing fails
    try {
      return JSON.parse(value);
    } catch {
      // Not a valid JSON string, return as is
      return value;
    }
  } catch (err) {
    // Log errors and return defaultValue
    error('Failed to retrieve item from localStorage', { 
      key, 
      errorMessage: err instanceof Error ? err.message : String(err) 
    });
    return defaultValue ?? null;
  }
}

/**
 * Removes an item from localStorage by key.
 *
 * @param key - The key to remove
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    error('Failed to remove item from localStorage', { 
      key, 
      errorMessage: err instanceof Error ? err.message : String(err) 
    });
  }
}

/**
 * Clears all items from localStorage.
 */
export function clear(): void {
  try {
    localStorage.clear();
  } catch (err) {
    error('Failed to clear localStorage', { 
      errorMessage: err instanceof Error ? err.message : String(err) 
    });
  }
}

/**
 * Checks if an item exists in localStorage by key.
 *
 * @param key - The key to check
 * @returns True if the item exists, false otherwise
 */
export function hasItem(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (err) {
    error('Failed to check if item exists in localStorage', { 
      key, 
      errorMessage: err instanceof Error ? err.message : String(err) 
    });
    return false;
  }
}

/**
 * Gets all keys currently stored in localStorage.
 *
 * @returns Array of all keys in localStorage
 */
export function getKeys(): string[] {
  try {
    return Object.keys(localStorage);
  } catch (err) {
    error('Failed to get keys from localStorage', { 
      errorMessage: err instanceof Error ? err.message : String(err) 
    });
    return [];
  }
}

/**
 * Gets the current size of localStorage in bytes.
 *
 * @returns Size of localStorage in bytes
 */
export function getSize(): number {
  try {
    let size = 0;
    const keys = getKeys();
    
    for (const key of keys) {
      const value = localStorage.getItem(key) || '';
      // Calculate size: key length + value length (each character is 2 bytes in UTF-16)
      size += (key.length + value.length) * 2;
    }
    
    return size;
  } catch (err) {
    error('Failed to calculate localStorage size', { 
      errorMessage: err instanceof Error ? err.message : String(err) 
    });
    return 0;
  }
}

/**
 * Checks if localStorage is available in the current browser environment.
 * 
 * @returns True if localStorage is available, false otherwise
 */
export function isAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    error('localStorage is not available', { 
      errorMessage: err instanceof Error ? err.message : String(err) 
    });
    return false;
  }
}