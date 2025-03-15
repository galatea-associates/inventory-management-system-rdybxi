import { RefObject, useRef, useCallback } from 'react'; // ^18.2.0
import { useEventListener } from './useEventListener';

/**
 * A hook that detects clicks outside of a specified element and calls a handler function when detected.
 * 
 * This is useful for implementing dismissible UI components like dropdowns, modals, and popovers that
 * should close when a user clicks outside of them.
 * 
 * @param ref - React ref object pointing to the element to detect clicks outside of
 * @param handler - Function to call when a click outside is detected
 * 
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * useClickOutside(dropdownRef, () => {
 *   if (isOpen) setIsOpen(false);
 * });
 * 
 * return (
 *   <div>
 *     <button onClick={() => setIsOpen(!isOpen)}>Toggle Dropdown</button>
 *     {isOpen && (
 *       <div ref={dropdownRef} className="dropdown">
 *         Dropdown content
 *       </div>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  // Use useCallback to memoize the event handler to prevent unnecessary re-renders
  const handleClickOutside = useCallback(
    (event: MouseEvent | TouchEvent) => {
      // Make sure the ref is attached to an element and the event target is a Node
      if (!ref.current || !(event.target instanceof Node)) {
        return;
      }
      
      // Call the handler only if the click was outside the element
      if (!ref.current.contains(event.target)) {
        handler(event);
      }
    },
    [ref, handler]
  );

  // Use our custom useEventListener hook to listen for mousedown and touchstart events
  useEventListener('mousedown', handleClickOutside as EventListener);
  useEventListener('touchstart', handleClickOutside as EventListener);
}