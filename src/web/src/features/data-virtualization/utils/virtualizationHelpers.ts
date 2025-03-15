import { CSSProperties, UIEvent, RefObject } from 'react'; // React 18.2
import throttle from 'lodash/throttle'; // lodash 4.17.21

// Default values for virtualization
export const DEFAULT_OVERSCAN = 5;
export const DEFAULT_ITEM_HEIGHT = 40;
export const DEFAULT_SCROLL_THROTTLE_MS = 100;

/**
 * Calculates the range of items that should be visible in the viewport based on scroll position
 * 
 * @param scrollTop - Current scroll position
 * @param containerHeight - Height of the viewport container
 * @param itemHeight - Height of each item
 * @param totalItems - Total number of items in the dataset
 * @param overscan - Number of additional items to render above and below the visible area
 * @returns Object containing start and end indices of the visible range
 */
export const calculateVisibleItems = (
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = DEFAULT_OVERSCAN
): { startIndex: number, endIndex: number } => {
  // Calculate the first visible item index
  const startIndex = Math.floor(scrollTop / itemHeight);
  
  // Calculate how many items can fit in the viewport
  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  
  // Apply overscan to render additional items above and below
  const firstItem = Math.max(0, startIndex - overscan);
  const lastItem = Math.min(totalItems - 1, startIndex + visibleItemCount + overscan);
  
  return {
    startIndex: firstItem,
    endIndex: lastItem
  };
};

/**
 * Calculates the position of an item in the virtual list
 * 
 * @param index - Index of the item
 * @param itemHeight - Height of each item
 * @returns Top position of the item in pixels
 */
export const calculateItemPosition = (
  index: number,
  itemHeight: number
): number => {
  return index * itemHeight;
};

/**
 * Generates the CSS style for the virtual container element
 * 
 * @param totalItems - Total number of items in the dataset
 * @param itemHeight - Height of each item
 * @returns CSS properties for the virtual container
 */
export const getVirtualContainerStyle = (
  totalItems: number,
  itemHeight: number
): CSSProperties => {
  return {
    position: 'relative',
    height: `${totalItems * itemHeight}px`,
  };
};

/**
 * Generates the CSS style for a virtual item element
 * 
 * @param index - Index of the item
 * @param itemHeight - Height of each item
 * @returns CSS properties for the virtual item
 */
export const getVirtualItemStyle = (
  index: number,
  itemHeight: number
): CSSProperties => {
  const top = calculateItemPosition(index, itemHeight);
  
  return {
    position: 'absolute',
    top: `${top}px`,
    left: 0,
    width: '100%',
    height: `${itemHeight}px`,
  };
};

/**
 * Creates a throttled scroll handler function for virtual scrolling
 * 
 * @param onScroll - Function to call with the new scrollTop value
 * @param throttleMs - Throttle time in milliseconds
 * @returns Throttled scroll event handler
 */
export const createVirtualScrollHandler = (
  onScroll: (scrollTop: number) => void,
  throttleMs: number = DEFAULT_SCROLL_THROTTLE_MS
): (event: UIEvent<HTMLElement>) => void => {
  const handleScroll = (event: UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    onScroll(target.scrollTop);
  };
  
  return throttle(handleScroll, throttleMs);
};

/**
 * Calculates the optimal item height based on content and container dimensions
 * 
 * @param data - Array of data items
 * @param containerHeight - Height of the container
 * @param minItemHeight - Minimum allowed item height
 * @param maxItemHeight - Maximum allowed item height
 * @returns The calculated optimal item height
 */
export const calculateDynamicItemHeight = (
  data: any[],
  containerHeight: number,
  minItemHeight: number = DEFAULT_ITEM_HEIGHT,
  maxItemHeight?: number
): number => {
  // If we have no data, return the default height
  if (!data.length) {
    return minItemHeight;
  }
  
  // Calculate an optimal height based on container size and data length
  // Aim to show a reasonable number of items without making them too small
  const optimalItemCount = Math.min(data.length, Math.max(5, Math.floor(containerHeight / 100)));
  let itemHeight = Math.floor(containerHeight / optimalItemCount);
  
  // Ensure the height is at least the minimum
  itemHeight = Math.max(itemHeight, minItemHeight);
  
  // If a maximum height is specified, ensure we don't exceed it
  if (maxItemHeight !== undefined) {
    itemHeight = Math.min(itemHeight, maxItemHeight);
  }
  
  return itemHeight;
};

/**
 * Gets the height of the container element from a ref
 * 
 * @param containerRef - React ref to the container element
 * @returns The height of the container element or 0 if not available
 */
export const getContainerHeight = (
  containerRef: RefObject<HTMLElement>
): number => {
  if (containerRef && containerRef.current) {
    return containerRef.current.clientHeight;
  }
  return 0;
};

/**
 * Scrolls the container to bring the specified item into view
 * 
 * @param containerRef - React ref to the container element
 * @param index - Index of the item to scroll to
 * @param itemHeight - Height of each item
 * @param alignment - Where to align the item ('start', 'center', 'end', or 'auto')
 */
export const scrollIntoView = (
  containerRef: RefObject<HTMLElement>,
  index: number,
  itemHeight: number,
  alignment: 'start' | 'center' | 'end' | 'auto' = 'auto'
): void => {
  if (!containerRef || !containerRef.current) {
    return;
  }
  
  const container = containerRef.current;
  const itemTop = calculateItemPosition(index, itemHeight);
  const containerHeight = container.clientHeight;
  
  let scrollTop;
  
  switch (alignment) {
    case 'start':
      scrollTop = itemTop;
      break;
    case 'center':
      scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
      break;
    case 'end':
      scrollTop = itemTop - containerHeight + itemHeight;
      break;
    case 'auto':
    default:
      // Only scroll if the item is not fully visible
      const containerScrollTop = container.scrollTop;
      const itemBottom = itemTop + itemHeight;
      const containerBottom = containerScrollTop + containerHeight;
      
      if (itemTop < containerScrollTop) {
        // Item is above the visible area
        scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        // Item is below the visible area
        scrollTop = itemBottom - containerHeight;
      } else {
        // Item is already visible, no need to scroll
        return;
      }
      break;
  }
  
  // Ensure scrollTop is not negative
  scrollTop = Math.max(0, scrollTop);
  
  container.scrollTo({
    top: scrollTop,
    behavior: 'smooth'
  });
};