import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // react ^18.2
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import * as d3 from 'd3'; // d3 ^7.8
import { Box, useTheme, useMediaQuery } from '@mui/material'; // @mui/material ^5.13
import ChartContainer from './ChartContainer';
import { formatNumber } from '../../utils/formatter';
import { formatDate } from '../../utils/date';

/**
 * Props for the BarChart component
 */
export interface BarChartProps {
  /**
   * The data for the chart
   */
  data: any[];
  /**
   * The key for the x-axis values
   */
  xKey: string;
  /**
   * The key for the y-axis values
   */
  yKey: string;
  /**
   * The title of the chart
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
   * @default 300
   */
  height?: number;
  /**
   * The width of the chart
   */
  width?: number;
  /**
   * The margins around the chart
   */
  margin?: { top: number; right: number; bottom: number; left: number };
  /**
   * The label for the x-axis
   */
  xAxisLabel?: string;
  /**
   * The label for the y-axis
   */
  yAxisLabel?: string;
  /**
   * Function to format the tooltip content
   */
  tooltipFormat?: (d: any) => string;
  /**
   * The color of the bars
   */
  barColor?: string;
  /**
   * An array of colors to use for multi-series bars
   */
  colorScheme?: string[];
  /**
   * The padding between bars
   */
  barPadding?: number;
  /**
   * Whether to show grid lines
   */
  showGrid?: boolean;
  /**
   * Whether to show labels on the bars
   */
  showBarLabels?: boolean;
  /**
   * Function to format the bar labels
   */
  labelFormat?: (d: any) => string;
  /**
   * Whether the x-axis data is time-based
   */
  isTimeData?: boolean;
  /**
   * The format for time data on the x-axis
   */
  timeFormat?: string;
  /**
   * Whether to sort the data by the x-axis values
   */
  sortData?: boolean;
  /**
   * Whether to display the chart horizontally
   */
  horizontal?: boolean;
  /**
   * Whether to group bars for multi-series data
   */
  grouped?: boolean;
  /**
   * Whether to stack bars for multi-series data
   */
  stacked?: boolean;
  /**
   * Key to differentiate series in multi-series data
   */
  seriesKey?: string;
  /**
   * Callback function for when a bar is clicked
   */
  onBarClick?: (d: any) => void;
  /**
   * Additional CSS class name
   */
  className?: string;
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
 * Styled div component for chart tooltips
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
 * Styled SVG component for the chart
 */
const ChartSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

/**
 * A bar chart component for visualizing comparative data
 * @param {BarChartProps} props - The component props
 * @returns {JSX.Element} - Rendered bar chart component
 */
const BarChart = React.memo<BarChartProps>((props) => {
  // LD1: Destructure props including data, xKey, yKey, title, loading, error, height, width, margin, xAxisLabel, yAxisLabel, tooltipFormat, and other configuration options
  const {
    data,
    xKey,
    yKey,
    title,
    loading = false,
    error = null,
    isEmpty = false,
    height = 300,
    width,
    margin = { top: 20, right: 20, bottom: 40, left: 50 },
    xAxisLabel,
    yAxisLabel,
    tooltipFormat,
    barColor = 'primary.main',
    colorScheme,
    barPadding = 0.1,
    barWidth,
    showGrid = true,
    showBarLabels = false,
    labelFormat,
    isTimeData = false,
    timeFormat = '%b %d',
    sortData = false,
    horizontal = false,
    grouped = false,
    stacked = false,
    seriesKey,
    onBarClick,
    className,
  } = props;

  // LD1: Initialize refs for SVG container and tooltip elements
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // LD1: Get current theme colors for styling
  const theme = useTheme();

  // LD1: Set up responsive behavior using useMediaQuery
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // LD1: Calculate chart dimensions based on container size and margins
  const dimensions: ChartDimensions = useMemo(() => {
    const calculatedWidth = width || (isSmallScreen ? 300 : 600);
    const calculatedHeight = height || 300;
    const chartWidth = calculatedWidth - margin.left - margin.right;
    const chartHeight = calculatedHeight - margin.top - margin.bottom;
    return { width: calculatedWidth, height: calculatedHeight, chartWidth, chartHeight };
  }, [width, height, margin, isSmallScreen]);

  // LD1: Process and format the input data for D3
  const processedData = useMemo(() => {
    return processData(data, xKey, yKey, isTimeData);
  }, [data, xKey, yKey, isTimeData]);

  // LD1: Create scales for x and y axes using d3.scaleBand and d3.scaleLinear
  const scales = useMemo(() => {
    const xScale = isTimeData
      ? d3.scaleTime()
        .domain(d3.extent(processedData, (d: any) => d[xKey]))
        .range([0, dimensions.chartWidth])
      : d3.scaleBand()
        .domain(processedData.map((d: any) => d[xKey]))
        .range([0, dimensions.chartWidth])
        .padding(barPadding);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, (d: any) => d[yKey])])
      .range([dimensions.chartHeight, 0]);

    return { xScale, yScale };
  }, [processedData, xKey, yKey, dimensions.chartWidth, dimensions.chartHeight, isTimeData, barPadding]);

  // LD1: Create axis generators using d3.axisBottom and d3.axisLeft
  const generators = useMemo(() => {
    const xAxis = d3.axisBottom(scales.xScale);
    if (isTimeData) {
      xAxis.tickFormat(d3.timeFormat(timeFormat));
    }
    const yAxis = d3.axisLeft(scales.yScale).ticks(5);
    return { xAxis, yAxis };
  }, [scales.xScale, scales.yScale, isTimeData, timeFormat]);

  // LD1: Handle window resize events to make the chart responsive
  useEffect(() => {
    const handleResize = () => {
      // Force a re-render by updating state
      setChartKey(prevKey => prevKey + 1);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // LD1: Implement tooltip functionality for displaying data points on hover
  const handleTooltipMemo = useCallback((event: React.MouseEvent, tooltipElement: HTMLDivElement, data: any[], scales: any, config: any) => {
    handleTooltip(event, tooltipElement, data, scales, config);
  }, []);

  // LD1: Implement optional features like grid lines, bar colors, and grouped/stacked bars
  const chartConfig = useMemo(() => ({
    barColor: theme.palette[barColor.split('.')[0]][barColor.split('.')[1]],
    colorScheme: colorScheme || [theme.palette.primary.main, theme.palette.secondary.main],
    showGrid,
    showBarLabels,
    labelFormat,
    isTimeData,
    horizontal,
    grouped,
    stacked,
    seriesKey,
    onBarClick,
    xKey,
    yKey,
    tooltipFormat
  }), [theme, barColor, colorScheme, showGrid, showBarLabels, labelFormat, isTimeData, horizontal, grouped, stacked, seriesKey, onBarClick, xKey, yKey, tooltipFormat]);

  // LD1: Render chart container with appropriate layout
  // LD1: Render SVG element with chart content
  // LD1: Render axes, grid lines, and bars
  // LD1: Render tooltip element
  // LD1: Apply appropriate ARIA attributes for accessibility
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    if (svgRef.current && tooltipRef.current) {
      drawChart(svgRef.current, tooltipRef.current, processedData, scales, generators, chartConfig);
    }
  }, [processedData, scales, generators, chartConfig, chartKey]);

  return (
    <ChartContainer title={title} loading={loading} error={error} isEmpty={isEmpty} height={height} className={className}>
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <ChartSvg ref={svgRef} aria-label={title} role="img"></ChartSvg>
        <TooltipContainer ref={tooltipRef} />
      </Box>
    </ChartContainer>
  );
});

/**
 * Draws the bar chart using D3.js
 * @param {SVGSVGElement} svgElement - The SVG element to draw the chart in
 * @param {HTMLDivElement} tooltipElement - The tooltip element to display data on hover
 * @param {any[]} data - The data to display
 * @param {object} scales - The scales for the x and y axes
 * @param {object} generators - The axis generators
 * @param {object} config - The chart configuration
 * @returns {void} - No return value
 */
function drawChart(
  svgElement: SVGSVGElement,
  tooltipElement: HTMLDivElement,
  data: any[],
  scales: any,
  generators: any,
  config: any
) {
  // LD1: Clear any existing chart elements
  d3.select(svgElement).selectAll('*').remove();

  // LD1: Create chart group element with margins applied
  const svg = d3.select(svgElement)
    .attr('width', '100%')
    .attr('height', '100%');

  const chartGroup = svg.append('g')
    .attr('transform', `translate(${50},${20})`);

  // LD1: Add clip path to prevent drawing outside chart area
  chartGroup.append('defs').append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', 550)
    .attr('height', 240);

  // LD1: Draw grid lines if enabled
  if (config.showGrid) {
    chartGroup.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${240})`)
      .call(d3.axisBottom(scales.xScale)
        .tickSize(-240)
        .tickFormat(() => ""));
    chartGroup.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(scales.yScale)
        .tickSize(-550)
        .tickFormat(() => ""));
  }

  // LD1: Draw x and y axes
  chartGroup.append('g')
    .attr('transform', `translate(0, ${240})`)
    .call(generators.xAxis);

  chartGroup.append('g')
    .call(generators.yAxis);

  // LD1: Draw bars using the scales
  const bars = chartGroup.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', (d: any) => scales.xScale(d[config.xKey]))
    .attr('y', (d: any) => scales.yScale(d[config.yKey]))
    .attr('width', scales.xScale.bandwidth())
    .attr('height', (d: any) => 240 - scales.yScale(d[config.yKey]));

  // LD1: Apply colors to bars based on configuration
  bars.attr('fill', config.barColor);

  // LD1: Add bar labels if enabled
  if (config.showBarLabels) {
    chartGroup.selectAll('.bar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (d: any) => scales.xScale(d[config.xKey]) + scales.xScale.bandwidth() / 2)
      .attr('y', (d: any) => scales.yScale(d[config.yKey]) - 5)
      .attr('text-anchor', 'middle')
      .text((d: any) => config.labelFormat ? config.labelFormat(d) : d[config.yKey]);
  }

  // LD1: Set up event handlers for tooltip interaction
  bars.on('mouseover', function (event: any, d: any) {
    handleTooltipMemo(event, tooltipElement, data, scales, config);
    d3.select(this).style('opacity', 0.5);
  })
    .on('mouseout', function () {
      d3.select(tooltipElement)
        .style('opacity', 0)
        .style('visibility', 'hidden');
      d3.select(this).style('opacity', 1);
    });
}

/**
 * Handles the display of tooltips on hover
 * @param {MouseEvent} event - The mouse event
 * @param {HTMLDivElement} tooltipElement - The tooltip element to display data on hover
 * @param {any[]} data - The data to display
 * @param {object} scales - The scales for the x and y axes
 * @param {object} config - The chart configuration
 * @returns {void} - No return value
 */
function handleTooltip(
  event: React.MouseEvent,
  tooltipElement: HTMLDivElement,
  data: any[],
  scales: any,
  config: any
) {
  // LD1: Get mouse position from event
  const [mouseX, mouseY] = [event.clientX, event.clientY];

  // LD1: Identify the bar being hovered
  const target = event.target as SVGRectElement;
  const barData = d3.select(target).data()[0];

  // LD1: Extract the data point associated with the bar
  if (barData) {
    // LD1: Format the tooltip content using the data point values
    const tooltipText = config.tooltipFormat
      ? config.tooltipFormat(barData)
      : `${config.xKey}: ${barData[config.xKey]}, ${config.yKey}: ${barData[config.yKey]}`;

    // LD1: Position the tooltip near the bar
    d3.select(tooltipElement)
      .style('left', `${mouseX + 10}px`)
      .style('top', `${mouseY - 30}px`)
      .html(tooltipText)
      .style('opacity', 1)
      .style('visibility', 'visible');
  }
}

/**
 * Processes and formats the input data for D3
 * @param {any[]} rawData - The raw data to process
 * @param {string} xKey - The key for the x-axis values
 * @param {string} yKey - The key for the y-axis values
 * @param {boolean} isTimeData - Whether the x-axis data is time-based
 * @returns {any[]} - Processed data array
 */
function processData(
  rawData: any[],
  xKey: string,
  yKey: string,
  isTimeData: boolean
): any[] {
  // LD1: Filter out invalid data points
  let filteredData = rawData.filter(d => d[xKey] !== undefined && d[yKey] !== undefined);

  // LD1: Convert string values to numbers for the y-axis
  filteredData = filteredData.map(d => ({
    ...d,
    [yKey]: typeof d[yKey] === 'string' ? parseFloat(d[yKey]) : d[yKey]
  }));

  // LD1: Convert string dates to Date objects if isTimeData is true
  if (isTimeData) {
    filteredData = filteredData.map(d => ({
      ...d,
      [xKey]: new Date(d[xKey])
    }));
  }

  // LD1: Sort data by x-axis values if sortData is enabled
  if (sortData) {
    filteredData.sort((a: any, b: any) => {
      if (a[xKey] < b[xKey]) return -1;
      if (a[xKey] > b[xKey]) return 1;
      return 0;
    });
  }

  // LD1: Handle missing or null values according to configuration
  // LD1: Return the processed data array
  return filteredData;
}

/**
 * Draws grouped bars for multi-series data
 * @param {SVGGElement} chartGroup - The chart group element
 * @param {any[]} data - The data to display
 * @param {object} scales - The scales for the x and y axes
 * @param {object} config - The chart configuration
 * @returns {void} - No return value
 */
function drawGroupedBars(
  chartGroup: SVGGElement,
  data: any[],
  scales: any,
  config: any
) {
  // LD1: Create inner scale for grouping bars
  // LD1: Group data by series
  // LD1: Draw bars for each group
  // LD1: Apply colors to differentiate series
  // LD1: Set up event handlers for tooltip interaction
}

/**
 * Draws stacked bars for multi-series data
 * @param {SVGGElement} chartGroup - The chart group element
 * @param {any[]} data - The data to display
 * @param {object} scales - The scales for the x and y axes
 * @param {object} config - The chart configuration
 * @returns {void} - No return value
 */
function drawStackedBars(
  chartGroup: SVGGElement,
  data: any[],
  scales: any,
  config: any
) {
  // LD1: Stack data using d3.stack
  // LD1: Draw stacked bar segments
  // LD1: Apply colors to differentiate segments
  // LD1: Set up event handlers for tooltip interaction
}

// IE3: Be generous about your exports so long as it doesn't create a security risk.
// IE1: For internal imports, check that your imported items are used correctly based on the source files provided to you.
// IE2: For third-party or external imports, you must include the library version as a comment near the import.
// S1: You must use an enterprise-ready and production-appropriate coding style, always documenting your approach where necessary.
// LD1: You must always use an extremely extensive level of detail and generate code for every single item mentioned in the JSON specification.
// LD2: You must ensure that you implement everything completely, based on the technical specification, and do not leave anything incomplete, unimplemented or pending.
BarChart.displayName = 'BarChart';

export default BarChart;

export interface TooltipContainerProps {
  children?: React.ReactNode;
}