import { useState, useRef, useCallback, useMemo, RefObject, CSSProperties, UIEvent } from 'react'; // React 18.2
import debounce from 'lodash/debounce'; // lodash 4.17.21
import { 
  calculateVisibleItems, 
  getVirtualContainerStyle, 
  getVirtualItemStyle, 
  createVirtualScrollHandler,
  DEFAULT_OVERSCAN,
  DEFAULT_ITEM_HEIGHT,
  DEFAULT_SCROLL_THROTTLE_MS,
  scrollIntoView,
  getContainerHeight
} from '../utils/virtualizationHelpers';
import useEventListener from '../../../hooks/useEventListener';

/**
 * Options for the virtualized list
 */
export interface VirtualizedListOptions<T = any> {
  /** Array of data items to render */
  data: T[];
  /** Height of each item in pixels (default: 40) */
  itemHeight?: number;
  /** Number of items to render above and below the visible area (default: 5) */
  overscan?: number;
  /** Throttle time for scroll events in milliseconds (default: 100) */
  scrollThrottleMs?: number;
  /** Reference to the container element (if not provided, one will be created) */
  containerRef?: RefObject<HTMLElement>;
}

/**
 * Result of the virtualized list hook
 */
export interface VirtualizedListResult<T = any> {
  /** Reference to the scrollable container element */
  containerRef: RefObject<HTMLElement>;
  /** Style to apply to the container element */
  containerStyle: CSSProperties;
  /** Function to get the style for an individual item */
  getItemStyle: (index: number) => CSSProperties;
  /** Array of items that should be rendered */
  visibleItems: T[];
  /** First visible item index */
  startIndex: number;
  /** Last visible item index */
  endIndex: number;
  /** Function to scroll to a specific index */
  scrollToIndex: (index: number, alignment?: 'start' | 'center' | 'end' | 'auto') => void;
  /** Function to scroll to the top of the list */
  scrollToTop: () => void;
  /** Function to scroll to the bottom of the list */
  scrollToBottom: () => void;
  /** Current scroll position */
  scrollTop: number;
}

/**
 * A custom React hook that implements virtualized list rendering for efficiently
 * displaying large datasets. This hook manages the calculation of visible items
 * based on scroll position, container dimensions, and item height, enabling
 * the UI to render only the items currently visible in the viewport.
 *
 * @param options - Configuration options for the virtualized list
 * @returns Object containing virtualized list state and helper functions
 * 
 * @example
 * ```tsx
 * const { 
 *   containerRef, 
 *   containerStyle, 
 *   getItemStyle, 
 *   visibleItems, 
 *   startIndex 
 * } = useVirtualizedList({
 *   data: largeDataArray,
 *   itemHeight: 50
 * });
 * 
 * return (
 *   <div ref={containerRef} style={{ height: '500px', overflow: 'auto' }}>
 *     <div style={containerStyle}>
 *       {visibleItems.map((item, i) => (
 *         <div key={startIndex + i} style={getItemStyle(startIndex + i)}>
 *           {item.name}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * );
 * ```
 */
function useVirtualizedList<T = any>(
  options: VirtualizedListOptions<T>
): VirtualizedListResult<T> {
  const {
    data = [],
    itemHeight = DEFAULT_ITEM_HEIGHT,
    overscan = DEFAULT_OVERSCAN,
    scrollThrottleMs = DEFAULT_SCROLL_THROTTLE_MS,
    containerRef: externalContainerRef
  } = options;

  // Use provided ref or create a new one
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;

  // Track scroll position
  const [scrollTop, setScrollTop] = useState(0);

  // Get the container height
  const containerHeight = useMemo(() => 
    getContainerHeight(containerRef),
  [containerRef, scrollTop]); // Re-calculate when scroll changes to catch container resizes

  // Calculate visible item range
  const { startIndex, endIndex } = useMemo(() => 
    calculateVisibleItems(
      scrollTop,
      containerHeight,
      itemHeight,
      data.length,
      overscan
    ),
  [scrollTop, containerHeight, itemHeight, data.length, overscan]);

  // Get the visible items from the data
  const visibleItems = useMemo(() => 
    data.slice(startIndex, endIndex + 1),
  [data, startIndex, endIndex]);

  // Create container style with total height
  const containerStyle = useMemo(() => 
    getVirtualContainerStyle(data.length, itemHeight),
  [data.length, itemHeight]);

  // Create function to get style for individual items
  const getItemStyle = useCallback(
    (index: number): CSSProperties => 
      getVirtualItemStyle(index, itemHeight),
    [itemHeight]
  );

  // Create scroll handler
  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  // Create throttled scroll handler
  const scrollHandler = useMemo(() => 
    createVirtualScrollHandler(handleScroll, scrollThrottleMs),
  [handleScroll, scrollThrottleMs]);

  // Attach scroll event listener
  useEventListener('scroll', scrollHandler, containerRef);

  // Handle window resize to update calculations
  const handleResize = useMemo(() => 
    debounce(() => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    }, 100),
  [containerRef]);

  useEventListener('resize', handleResize, window);

  // Initialize scroll position when component mounts
  const initializeScrollTop = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, [containerRef]);

  // Set initial scroll position
  useMemo(() => {
    initializeScrollTop();
    
    // Add MutationObserver to detect DOM changes that might affect container size
    if (typeof MutationObserver !== 'undefined' && containerRef.current) {
      const observer = new MutationObserver(initializeScrollTop);
      observer.observe(containerRef.current, { 
        childList: true, 
        subtree: true, 
        attributes: true 
      });
      return () => observer.disconnect();
    }
  }, [containerRef, initializeScrollTop]);

  // Utility function to scroll to a specific index
  const scrollToIndex = useCallback(
    (index: number, alignment: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
      scrollIntoView(containerRef, index, itemHeight, alignment);
    },
    [containerRef, itemHeight]
  );

  // Utility function to scroll to the top
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [containerRef]);

  // Utility function to scroll to the bottom
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      const maxScrollTop = data.length * itemHeight - containerHeight;
      containerRef.current.scrollTo({ 
        top: Math.max(0, maxScrollTop), 
        behavior: 'smooth' 
      });
    }
  }, [containerRef, data.length, itemHeight, containerHeight]);

  return {
    containerRef,
    containerStyle,
    getItemStyle,
    visibleItems,
    startIndex,
    endIndex,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    scrollTop
  };
}

export default useVirtualizedList;