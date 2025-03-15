import { useRef, useEffect, RefObject } from 'react'; // ^18.2.0

/**
 * A custom React hook that provides a declarative way to add event listeners to DOM elements
 * or window with proper cleanup.
 * 
 * This hook simplifies the process of managing event listeners in React components and
 * ensures they are properly removed when the component unmounts, preventing memory leaks
 * and improving performance.
 * 
 * @param eventName - The name of the event to listen for
 * @param handler - The event handler function to be called when the event occurs
 * @param element - Optional ref to a DOM element or window object (defaults to window)
 * 
 * @example
 * // Listen for window resize events
 * useEventListener('resize', handleResize);
 * 
 * @example
 * // Listen for clicks on a specific DOM element
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * useEventListener('click', handleClick, buttonRef);
 */
function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: RefObject<HTMLElement> | Window | null
): void;

function useEventListener<
  K extends keyof HTMLElementEventMap,
  T extends HTMLElement = HTMLDivElement
>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  element: RefObject<T>
): void;

function useEventListener<K extends string>(
  eventName: K,
  handler: EventListener,
  element?: RefObject<HTMLElement> | Window | null | undefined
): void {
  // Create a reference to store the handler function to avoid unnecessary re-renders
  const savedHandler = useRef<EventListener>();
  
  // Update the handler reference when the handler changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Define the target element (defaulting to window if no element is provided)
    const targetElement: Window | HTMLElement | null =
      element && 'current' in element
        ? element.current
        : element instanceof Window
          ? element
          : window;

    // Ensure the target element exists and can have event listeners
    if (!(targetElement && targetElement.addEventListener)) {
      return;
    }

    // Create an event listener that calls our saved handler
    const eventListener: EventListener = (event) => {
      if (savedHandler.current) {
        savedHandler.current(event);
      }
    };

    // Add the event listener to the target element
    targetElement.addEventListener(eventName, eventListener);

    // Return a cleanup function that removes the event listener
    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]); // Re-run the effect when the eventName, element, or handler changes
}

export default useEventListener;