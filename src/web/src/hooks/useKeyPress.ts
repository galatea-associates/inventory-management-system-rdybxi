import { useState, useCallback, useEffect } from 'react'; // ^18.2.0
import { useEventListener } from './useEventListener';

/**
 * A hook that detects when a specific key or set of keys is pressed on the keyboard.
 * 
 * @param targetKey - The key(s) to detect. Can be a single key string or array of key strings.
 * @returns A boolean indicating whether the target key is currently pressed.
 * 
 * @example
 * // Track when the Escape key is pressed
 * const isEscapePressed = useKeyPress('Escape');
 * 
 * @example
 * // Track when either Enter or Space is pressed
 * const isActionKeyPressed = useKeyPress(['Enter', ' ']);
 */
export function useKeyPress(targetKey: string | string[]): boolean {
  // State to track whether the key is pressed
  const [isKeyPressed, setIsKeyPressed] = useState<boolean>(false);
  
  // Convert to array if it's a string
  const keys = Array.isArray(targetKey) ? targetKey : [targetKey];
  
  // Event handler for keydown event
  const keyDownHandler = useCallback(
    (event: KeyboardEvent) => {
      if (keys.includes(event.key)) {
        setIsKeyPressed(true);
      }
    },
    [keys]
  );
  
  // Event handler for keyup event
  const keyUpHandler = useCallback(
    (event: KeyboardEvent) => {
      if (keys.includes(event.key)) {
        setIsKeyPressed(false);
      }
    },
    [keys]
  );
  
  // Add event listeners to window
  useEventListener('keydown', keyDownHandler);
  useEventListener('keyup', keyUpHandler);
  
  return isKeyPressed;
}