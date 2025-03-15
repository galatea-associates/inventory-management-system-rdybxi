import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import * as d3 from 'd3'; // d3 7.8
import { Box, useTheme } from '@mui/material'; // @mui/material 5.13
import ChartContainer from './ChartContainer';
import Tooltip from '../common/Tooltip';
import { formatDateString, formatDateTimeString } from '../../utils/formatter';
import useResponsive from '../../features/responsive/hooks/useResponsive';
import { ActivityItem } from '../../types/models';

/**
 * Props for the TimelineChart component
 */
export interface TimelineChartProps {
  /**
   * Array of timeline events to display
   */
  events: ActivityItem[];
  /**
   * Title of the chart
   */
  title: string;
  /**
   * Whether the chart is in a loading state
   * @default false
   */
  loading?: boolean;
  /**
   * Any error that occurred during chart data loading
   * @default null
   */
  error?: Error | string | null;
  /**
   * Whether the chart has no data to display
   * @default false
   */
  isEmpty?: boolean;
  /**
   * The height of the chart
   * @default 200
   */
  height?: number;
  /**
   * The width of the chart
   */
  width?: number;
  /**
   * Margins around the chart
   */
  margin?: { top: number; right: number; bottom: number; left: number };
  /**
   * Time range to display on the chart
   */
  timeRange?: { start: Date; end: Date };
  /**
   * Whether to show labels on the event markers
   * @default true
   */
  showLabels?: boolean;
  /**
   * Whether to group events by category
   * @default false
   */
  groupByCategory?: boolean;
  /**
   * Function to format the tooltip content
   */
  tooltipFormat?: (event: ActivityItem) => string;
  /**
   * Function to handle event click
   */
  onEventClick?: (event: ActivityItem) => void;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Interface for events displayed on the timeline
 */
export interface TimelineEvent {
  id: string;
  timestamp: Date | string;
  title: string;
  description: string;
  eventType: string;
  category: string;
  relatedEntityType: string;
  relatedEntityId: string;
  details: Record<string, any>;
}

/**
 * Internal interface for chart dimensions
 */
interface ChartDimensions {
  width: number;
  height: number;
  chartWidth: number;
  chartHeight: number;
}

/**
 * Styled div component for timeline event tooltips
 */
export const TooltipContainer = styled.div`
  position: absolute;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  border-radius: 4px;
  pointer-events: none;
  font-size: 12px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: opacity 0.2s ease-in-out;
  opacity: 0;
  visibility: hidden;
`;

/**
 * Styled SVG component for the timeline chart
 */
const TimelineSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

/**
 * Styled circle component for timeline event markers
 */
const EventMarker = styled.circle`
  cursor: pointer;
  transition: r 0.2s ease-in-out, opacity 0.2s ease-in-out;
  &:hover {
    opacity: 0.8;
  }
`;

/**
 * Styled text component for timeline event labels
 */
const EventLabel = styled.text`
  font-size: 10px;
  font-weight: 500;
  dominant-baseline: middle;
  pointer-events: none;
  user-select: none;
`;

/**
 * Styled rect component for category lanes
 */
const CategoryLane = styled.rect`
  opacity: 0.1;
  rx: 4;
  ry: 4;
`;

/**
 * A timeline chart component for visualizing chronological events
 *
 * @param {TimelineChartProps} props - The component props
 * @returns {JSX.Element} - Rendered timeline chart component
 */
const TimelineChart = React.memo<TimelineChartProps>(({
  events: rawEvents,
  title,
  loading = false,
  error = null,
  isEmpty = false,
  height = 200,
  width,
  margin = { top: 20, right: 20, bottom: 30, left: 40 },
  timeRange,
  showLabels = true,
  groupByCategory = false,
  tooltipFormat,
  onEventClick,
  className,
}) => {
  // Refs for SVG container and tooltip elements
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get current theme colors for styling
  const theme = useTheme();

  // Set up responsive behavior using useResponsive hook
  const responsive = useResponsive();

  // Calculate chart dimensions based on container size and margins
  const dimensions: ChartDimensions = useMemo(() => {
    const chartWidth = (width || responsive.viewport.width) - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    return { width: width || responsive.viewport.width, height, chartWidth, chartHeight };
  }, [width, height, margin, responsive.viewport.width]);

  // Process and format the input events data for D3
  const processedEvents = useMemo(() => {
    return processEvents(rawEvents, groupByCategory);
  }, [rawEvents, groupByCategory]);

  // Create time scale for x-axis using d3.scaleTime
  const xScale = useMemo(() => {
    return d3.scaleTime()
      .domain(timeRange ? [timeRange.start, timeRange.end] : d3.extent(processedEvents, d => new Date(d.timestamp)))
      .range([0, dimensions.chartWidth]);
  }, [processedEvents, dimensions.chartWidth, timeRange]);

  // Create ordinal scale for y-axis categories using d3.scaleOrdinal
  const yScale = useMemo(() => {
    const categories = groupByCategory ? Array.from(new Set(processedEvents.map(d => d.category))) : [];
    return d3.scaleOrdinal()
      .domain(categories)
      .range(categories.map((_, i) => i * 30));
  }, [processedEvents, groupByCategory]);

  // Create axis generators using d3.axisBottom
  const xAxis = useMemo(() => {
    return d3.axisBottom(xScale)
      .ticks(5)
      .tickSize(-dimensions.chartHeight);
  }, [xScale, dimensions.chartHeight]);

  // Handle window resize events to make the chart responsive
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && tooltipRef.current) {
        drawTimeline(svgRef.current, tooltipRef.current, processedEvents, { xScale, yScale }, dimensions, { showLabels, groupByCategory });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [processedEvents, xScale, yScale, dimensions, showLabels, groupByCategory]);

  // Implement tooltip functionality for displaying event details on hover
  const handleTooltip = useCallback((event: React.MouseEvent<SVGCircleElement>, timelineEvent: TimelineEvent) => {
    if (tooltipRef.current) {
      const config = { showLabels, groupByCategory };
      handleTooltip(event.nativeEvent, tooltipRef.current, timelineEvent, config);
    }
  }, [showLabels, groupByCategory]);

  // Draw the timeline chart when the component mounts and when data changes
  useEffect(() => {
    if (svgRef.current && tooltipRef.current) {
      const config = { showLabels, groupByCategory };
      drawTimeline(svgRef.current, tooltipRef.current, processedEvents, { xScale, yScale }, dimensions, config);
    }
  }, [processedEvents, xScale, yScale, dimensions, showLabels, groupByCategory]);

  return (
    <ChartContainer title={title} loading={loading} error={error} isEmpty={isEmpty} height={height} className={className}>
      <TimelineSvg ref={svgRef} width={dimensions.width} height={dimensions.height} aria-label="Timeline Chart">
        <defs>
          <clipPath id="chart-area">
            <rect width={dimensions.chartWidth} height={dimensions.chartHeight} />
          </clipPath>
        </defs>
      </TimelineSvg>
      <TooltipContainer ref={tooltipRef} style={{ position: 'absolute', opacity: 0, visibility: 'hidden' }} />
    </ChartContainer>
  );
});

/**
 * Draws the timeline chart using D3.js
 * @param {SVGSVGElement} svgElement - The SVG element to draw the chart in
 * @param {HTMLDivElement} tooltipElement - The tooltip element to display event details
 * @param {TimelineEvent[]} events - The events to display on the timeline
 * @param {object} scales - The D3 scales for the chart
 * @param {object} dimensions - The dimensions of the chart
 */
const drawTimeline = (
  svgElement: SVGSVGElement,
  tooltipElement: HTMLDivElement,
  events: TimelineEvent[],
  scales: { xScale: d3.ScaleTime<number, number, never>; yScale: d3.ScaleOrdinal<string, number, never> },
  dimensions: ChartDimensions,
  config: { showLabels: boolean; groupByCategory: boolean }
) => {
  const { xScale, yScale } = scales;
  const { showLabels, groupByCategory } = config;

  // Clear any existing chart elements
  d3.select(svgElement).selectAll('*').remove();

  // Create chart group element with margins applied
  const svg = d3.select(svgElement)
    .append('g')
    .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

  // Add clip path to prevent drawing outside chart area
  svg.append("clipPath")
    .attr("id", "chart-area")
    .append("rect")
    .attr("width", dimensions.chartWidth)
    .attr("height", dimensions.chartHeight);

  // Draw time axis and grid lines
  svg.append('g')
    .attr('transform', `translate(0,${dimensions.chartHeight})`)
    .call(d3.axisBottom(xScale)
      .ticks(5)
      .tickSize(-dimensions.chartHeight))
    .selectAll("line")
    .attr("stroke", "#ddd");

  // Draw category lanes if groupByCategory is true
  if (groupByCategory) {
    const categories = yScale.domain();
    svg.selectAll(".category-lane")
      .data(categories)
      .enter().append(CategoryLane as any)
      .attr("class", "category-lane")
      .attr("x", 0)
      .attr("y", d => yScale(d) - 10)
      .attr("width", dimensions.chartWidth)
      .attr("height", 20);
  }

  // Draw event markers with appropriate shapes and colors based on event type
  svg.selectAll(".event-marker")
    .data(events)
    .enter().append(EventMarker as any)
    .attr("class", "event-marker")
    .attr("cx", d => xScale(new Date(d.timestamp)))
    .attr("cy", d => groupByCategory ? yScale(d.category) : dimensions.chartHeight / 2)
    .attr("r", d => getEventMarkerStyle(d.eventType, theme).size)
    .attr("fill", d => getEventMarkerStyle(d.eventType, theme).color)
    .on("mouseover", function (event: MouseEvent, d: TimelineEvent) {
      handleTooltip(event, tooltipElement, d, config);
    })
    .on("mouseout", function () {
      d3.select(tooltipElement)
        .style("opacity", 0)
        .style("visibility", "hidden");
    });

  // Draw event labels if showLabels is true
  if (showLabels) {
    svg.selectAll(".event-label")
      .data(events)
      .enter().append(EventLabel as any)
      .attr("class", "event-label")
      .attr("x", d => xScale(new Date(d.timestamp)))
      .attr("y", d => groupByCategory ? yScale(d.category) + 15 : (dimensions.chartHeight / 2) + 15)
      .attr("text-anchor", "middle")
      .text(d => d.title);
  }
};

/**
 * Handles the display of tooltips on hover over event markers
 * @param {MouseEvent} event - The mouse event
 * @param {HTMLDivElement} tooltipElement - The tooltip element to display
 * @param {TimelineEvent} timelineEvent - The timeline event data
 * @param {object} config - Configuration options
 */
const handleTooltip = (
  event: MouseEvent,
  tooltipElement: HTMLDivElement,
  timelineEvent: TimelineEvent,
  config: { showLabels: boolean; groupByCategory: boolean }
) => {
  // Get mouse position from event
  const [x, y] = [event.clientX, event.clientY];

  // Format the tooltip content using the event data
  const tooltipText = config.showLabels
    ? `${timelineEvent.title}\n${formatDateTimeString(timelineEvent.timestamp)}`
    : `${timelineEvent.title}\n${timelineEvent.description}\n${formatDateTimeString(timelineEvent.timestamp)}`;

  // Position the tooltip near the event marker
  d3.select(tooltipElement)
    .style("opacity", 1)
    .style("visibility", "visible")
    .style("left", `${x}px`)
    .style("top", `${y - 28}px`)
    .text(tooltipText);
};

/**
 * Processes and formats the input events for D3
 * @param {TimelineEvent[]} rawEvents - The raw events data
 * @param {boolean} groupByCategory - Whether to group events by category
 * @returns {TimelineEvent[]} - Processed events array
 */
const processEvents = (rawEvents: ActivityItem[], groupByCategory: boolean): TimelineEvent[] => {
  // Filter out invalid events
  const validEvents = rawEvents.filter(event => event.timestamp && event.title);

  // Sort events by timestamp
  const sortedEvents = validEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Convert string timestamps to Date objects
  const convertedEvents = sortedEvents.map(event => ({
    ...event,
    timestamp: new Date(event.timestamp)
  }));

  return convertedEvents;
};

/**
 * Determines the style for event markers based on event type
 * @param {string} eventType - The type of event
 * @param {object} theme - The theme object
 * @returns {object} - Style object with shape, color, and size
 */
const getEventMarkerStyle = (eventType: string, theme: any) => {
  // Map event type to appropriate shape (circle, square, diamond, etc.)
  const shape = 'circle'; // Default shape

  // Map event type to appropriate color from theme
  const color = theme.palette.primary.main; // Default color

  // Map event type to appropriate size based on importance
  const size = 5; // Default size

  return { shape, color, size };
};

TimelineChart.displayName = 'TimelineChart';

export default TimelineChart;
export type { TimelineChartProps, TimelineEvent, TooltipContainer };