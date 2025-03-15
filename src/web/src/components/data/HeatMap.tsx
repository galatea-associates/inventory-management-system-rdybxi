import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // react ^18.2
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import * as d3 from 'd3'; // d3 ^7.8
import { Box, useTheme, useMediaQuery } from '@mui/material'; // @mui/material ^5.13
import ChartContainer from './ChartContainer';
import { formatNumber } from '../../utils/formatter';

/**
 * Props for the HeatMap component
 */
export interface HeatMapProps {
  /**
   * The data for the heat map
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
   * The key for the cell values
   */
  valueKey: string;
  /**
   * The title of the chart
   */
  title?: string;
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
   * @default 300
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
   * The color scheme for the heat map
   */
  colorScheme?: string | string[];
  /**
   * The scale type for the color scale
   */
  scaleType?: string;
  /**
   * The minimum value for the color scale
   */
  minValue?: number | null;
  /**
   * The maximum value for the color scale
   */
  maxValue?: number | null;
  /**
   * Whether to show grid lines
   * @default true
   */
  showGrid?: boolean;
  /**
   * Whether to show cell borders
   * @default true
   */
  showBorder?: boolean;
  /**
   * The color of the cell borders
   * @default '#ffffff'
   */
  borderColor?: string;
  /**
   * The padding around the cells
   * @default 1
   */
  cellPadding?: number;
  /**
   * The position of the legend
   * @default 'bottom'
   */
  legendPosition?: string;
  /**
   * The title of the legend
   */
  legendTitle?: string;
  /**
   * The width of the legend
   */
  legendWidth?: number;
  /**
   * Callback function for cell click events
   */
  onCellClick?: (d: any) => void;
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
  borderRadius: 4px;
  pointer-events: none;
  fontSize: 12px;
  fontWeight: 500;
  z-index: 1000;
  boxShadow: 0 2px 5px rgba(0, 0, 0, 0.2);
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
 * A heat map component for visualizing density and correlation data
 */
const HeatMap = React.memo<HeatMapProps>((props) => {
  // LD1: Destructure props including data, xKey, yKey, valueKey, title, loading, error, height, width, margin, colorScale, tooltipFormat, and other configuration options
  const {
    data,
    xKey,
    yKey,
    valueKey,
    title,
    loading = false,
    error = null,
    isEmpty = false,
    height = 300,
    width = 300,
    margin = { top: 20, right: 20, bottom: 50, left: 50 },
    xAxisLabel,
    yAxisLabel,
    tooltipFormat = (d: any) => `Value: ${d[valueKey]}`,
    colorScheme = 'interpolateViridis',
    scaleType = 'sequential',
    minValue = null,
    maxValue = null,
    showGrid = true,
    showBorder = true,
    borderColor = '#ffffff',
    cellPadding = 1,
    legendPosition = 'bottom',
    legendTitle,
    legendWidth = 200,
    onCellClick,
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
  const dimensions = useMemo<ChartDimensions>(() => {
    const calculatedWidth = width === undefined ? 300 : width;
    const calculatedHeight = height === undefined ? 300 : height;
    const calculatedChartWidth = calculatedWidth - margin.left - margin.right;
    const calculatedChartHeight = calculatedHeight - margin.top - margin.bottom;

    return {
      width: calculatedWidth,
      height: calculatedHeight,
      chartWidth: calculatedChartWidth,
      chartHeight: calculatedChartHeight,
    };
  }, [width, height, margin]);

  // LD1: Process and format the input data for D3
  const processedData = useMemo(() => processData(data, xKey, yKey, valueKey), [data, xKey, yKey, valueKey]);

  // LD1: Create scales for x and y axes using d3.scaleBand
  const xScale = useMemo(() => d3.scaleBand().domain(processedData.map(d => d[xKey])).range([0, dimensions.chartWidth]).padding(0), [processedData, xKey, dimensions.chartWidth]);
  const yScale = useMemo(() => d3.scaleBand().domain(processedData.map(d => d[yKey])).range([0, dimensions.chartHeight]).padding(0), [processedData, yKey, dimensions.chartHeight]);

  // LD1: Create color scale using d3.scaleSequential or d3.scaleQuantize based on configuration
  const colorScale = useMemo(() => createColorScale(processedData, valueKey, colorScheme, scaleType, minValue, maxValue), [processedData, valueKey, colorScheme, scaleType, minValue, maxValue]);

  // LD1: Handle window resize events to make the chart responsive
  const handleResize = useCallback(() => {
    if (svgRef.current && tooltipRef.current) {
      drawChart(svgRef.current, tooltipRef.current, processedData, { xScale, yScale, colorScale }, {
        xKey,
        yKey,
        valueKey,
        tooltipFormat,
        showGrid,
        showBorder,
        borderColor,
        cellPadding,
        onCellClick,
      });
    }
  }, [processedData, xScale, yScale, colorScale, xKey, yKey, valueKey, tooltipFormat, showGrid, showBorder, borderColor, cellPadding, onCellClick]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // LD1: Implement tooltip functionality for displaying cell data on hover
  const tooltipHandler = useCallback((event: MouseEvent, data: any) => {
    if (tooltipRef.current && xScale && yScale) {
      handleTooltip(event, tooltipRef.current, data, { xScale, yScale }, {
        xKey,
        yKey,
        valueKey,
        tooltipFormat,
        showBorder,
        borderColor,
        cellPadding,
        onCellClick,
      });
    }
  }, [xScale, yScale, xKey, yKey, valueKey, tooltipFormat, showBorder, borderColor, cellPadding, onCellClick]);

  // LD1: Render chart container with appropriate layout
  return (
    <ChartContainer title={title} loading={loading} error={error} isEmpty={isEmpty} height={height} className={className}>
      <Box position="relative" width="100%" height="100%">
        {/* LD1: Render SVG element with chart content */}
        <ChartSvg ref={svgRef} width={dimensions.width} height={dimensions.height}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* LD1: Render axes, grid lines, and heat map cells */}
          </g>
        </ChartSvg>

        {/* LD1: Render color legend for the heat map */}
        {colorScale && (
          <g>
            {drawLegend(d3.select(svgRef.current), colorScale, dimensions, {
              legendPosition,
              legendTitle,
              legendWidth,
            })}
          </g>
        )}

        {/* LD1: Render tooltip element */}
        <TooltipContainer ref={tooltipRef} />
      </Box>
    </ChartContainer>
  );
});

/**
 * Draws the heat map using D3.js
 */
function drawChart(
  svgElement: SVGSVGElement,
  tooltipElement: HTMLDivElement,
  data: any[],
  scales: { xScale: d3.ScaleBand<any>, yScale: d3.ScaleBand<any>, colorScale: d3.ScaleSequential<string> | d3.ScaleQuantize<string> },
  config: { xKey: string, yKey: string, valueKey: string, tooltipFormat: (d: any) => string, showGrid: boolean, showBorder: boolean, borderColor: string, cellPadding: number, onCellClick: (d: any) => void }
): void {
  // LD1: Clear any existing chart elements
  const svg = d3.select(svgElement);
  svg.selectAll('*').remove();

  // LD1: Create chart group element with margins applied
  const chart = svg.append('g').attr('transform', `translate(${50},${20})`);

  // LD1: Add clip path to prevent drawing outside chart area
  chart.append('defs').append('clipPath').attr('id', 'clip')
    .append('rect')
    .attr('width', 300 - 50 - 20)
    .attr('height', 300 - 20 - 50);

  // LD1: Draw x and y axes
  const xAxis = d3.axisBottom(scales.xScale);
  chart.append('g')
    .attr('transform', `translate(0,${300 - 20 - 50})`)
    .call(xAxis);

  const yAxis = d3.axisLeft(scales.yScale);
  chart.append('g').call(yAxis);

  // LD1: Draw grid lines if enabled
  if (config.showGrid) {
    chart.selectAll('.grid')
      .data(scales.xScale.range())
      .enter().append('line')
      .attr('class', 'grid')
      .attr('x1', d => d)
      .attr('x2', d => d)
      .attr('y1', 0)
      .attr('y2', 300 - 20 - 50)
      .attr('stroke', '#ddd');
  }

  // LD1: Draw heat map cells using the data and scales
  chart.append('g')
    .attr('clip-path', 'url(#clip)')
    .selectAll()
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => scales.xScale(d[config.xKey]))
    .attr('y', d => scales.yScale(d[config.yKey]))
    .attr('width', scales.xScale.bandwidth() - config.cellPadding * 2)
    .attr('height', scales.yScale.bandwidth() - config.cellPadding * 2)
    .style('stroke-width', config.showBorder ? 1 : 0)
    .style('stroke', config.borderColor)
    .on('mousemove', function (event: MouseEvent, d: any) {
      handleTooltip(event, tooltipElement, d, scales, config);
    })
    .on('mouseleave', function () {
      d3.select(tooltipElement)
        .style('opacity', 0)
        .style('visibility', 'hidden');
    })
    .on('click', function (event: MouseEvent, d: any) {
      if (config.onCellClick) {
        config.onCellClick(d);
      }
    });

  // LD1: Apply colors to cells based on the color scale
  chart.selectAll('rect')
    .transition()
    .duration(750)
    .style('fill', d => scales.colorScale(d[config.valueKey]));
}

/**
 * Handles the display of tooltips on hover
 */
function handleTooltip(
  event: MouseEvent,
  tooltipElement: HTMLDivElement,
  data: any,
  scales: { xScale: d3.ScaleBand<any>, yScale: d3.ScaleBand<any> },
  config: { xKey: string, yKey: string, valueKey: string, tooltipFormat: (d: any) => string, showBorder: boolean, borderColor: string, cellPadding: number, onCellClick: (d: any) => void }
): void {
  // LD1: Get mouse position from event
  const [x, y] = d3.pointer(event);

  // LD1: Identify the cell being hovered
  // LD1: Extract the data associated with the cell
  // LD1: Format the tooltip content using the cell data
  const tooltipText = config.tooltipFormat(data);

  // LD1: Position the tooltip near the cell
  d3.select(tooltipElement)
    .style('left', `${event.clientX}px`)
    .style('top', `${event.clientY}px`)
    .html(tooltipText);

  // LD1: Show the tooltip with appropriate styling
  d3.select(tooltipElement)
    .transition()
    .duration(200)
    .style('opacity', 1)
    .style('visibility', 'visible');

  // LD1: Highlight the corresponding cell on the chart
}

/**
 * Creates a color scale for the heat map
 */
function createColorScale(
  data: any[],
  valueKey: string,
  colorScheme: string | string[],
  scaleType: string,
  minValue: number | null,
  maxValue: number | null
): d3.ScaleSequential<string> | d3.ScaleQuantize<string> {
  // LD1: Extract all values from the data using the valueKey
  const values = data.map(d => d[valueKey]);

  // LD1: Determine the minimum and maximum values if not provided
  const min = minValue !== null ? minValue : d3.min(values) as number;
  const max = maxValue !== null ? maxValue : d3.max(values) as number;

  let scale: d3.ScaleSequential<string> | d3.ScaleQuantize<string>;

  // LD1: Create appropriate color scale based on scaleType (sequential, diverging, or quantized)
  if (scaleType === 'sequential') {
    scale = d3.scaleSequential<string>(d3[colorScheme as string]).domain([min, max]);
  } else if (scaleType === 'quantized') {
    scale = d3.scaleQuantize<string>().domain([min, max]).range(colorScheme as string[]);
  } else {
    scale = d3.scaleSequential<string>(d3.interpolateViridis).domain([min, max]);
  }

  // LD1: Return the configured color scale
  return scale;
}

/**
 * Draws a color legend for the heat map
 */
function drawLegend(
  svg: d3.Selection<SVGSVGElement, any, any, any>,
  colorScale: d3.ScaleSequential<string> | d3.ScaleQuantize<string>,
  dimensions: { width: number; height: number; chartWidth: number; chartHeight: number },
  config: { legendPosition: string; legendTitle: string; legendWidth: number }
): void {
  // LD1: Create a group element for the legend
  const legend = svg.append('g').attr('class', 'legend');

  // LD1: Position the legend based on configuration (bottom, right, etc.)
  const legendX = config.legendPosition === 'right' ? dimensions.width - config.legendWidth : 50;
  const legendY = config.legendPosition === 'bottom' ? dimensions.height - 30 : 20;

  legend.attr('transform', `translate(${legendX}, ${legendY})`);

  // LD1: Create color gradient or discrete color blocks based on scale type
  const gradient = legend.append('defs')
    .append('linearGradient')
    .attr('id', 'gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');

  gradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', (colorScale as d3.ScaleSequential<string>).domain()[0])
    .attr('stop-opacity', 1);

  gradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', (colorScale as d3.ScaleSequential<string>).domain()[1])
    .attr('stop-opacity', 1);

  legend.append('rect')
    .attr('width', config.legendWidth)
    .attr('height', 10)
    .style('fill', 'url(#gradient)');

  // LD1: Add axis ticks and labels to the legend
  const legendAxis = d3.axisBottom(d3.scaleLinear().range([0, config.legendWidth]).domain((colorScale as d3.ScaleSequential<string>).domain()))
    .ticks(5);

  legend.append('g')
    .attr('transform', 'translate(0,10)')
    .call(legendAxis);

  // LD1: Add legend title if provided
  if (config.legendTitle) {
    legend.append('text')
      .attr('x', config.legendWidth / 2)
      .attr('y', -15)
      .style('text-anchor', 'middle')
      .text(config.legendTitle);
  }

  // LD1: Apply styling to the legend elements
}

/**
 * Processes and formats the input data for D3
 */
function processData(
  rawData: any[],
  xKey: string,
  yKey: string,
  valueKey: string
): any[] {
  // LD1: Filter out invalid data points
  const filteredData = rawData.filter(d => d && d[xKey] && d[yKey] && d[valueKey] !== undefined);

  // LD1: Ensure all data points have the required keys (xKey, yKey, valueKey)
  const validData = filteredData.map(d => ({
    [xKey]: d[xKey],
    [yKey]: d[yKey],
    [valueKey]: d[valueKey],
  }));

  // LD1: Convert string values to numbers for the valueKey
  const numberData = validData.map(d => ({
    ...d,
    [valueKey]: typeof d[valueKey] === 'string' ? parseFloat(d[valueKey]) : d[valueKey],
  }));

  // LD1: Handle missing or null values according to configuration
  const processedData = numberData.map(d => ({
    ...d,
    [valueKey]: d[valueKey] === null || d[valueKey] === undefined ? 0 : d[valueKey],
  }));

  // LD1: Return the processed data array
  return processedData;
}

// Set display name for debugging
HeatMap.displayName = 'HeatMap';

// LD1: Export styled container for the tooltip
export interface ChartDimensions {
  width: number;
  height: number;
  chartWidth: number;
  chartHeight: number;
}

// LD1: Export type definition for heat map properties
export interface HeatMapProps {
  data: any[];
  xKey: string;
  yKey: string;
  valueKey: string;
  title?: string;
  loading?: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  height?: number;
  width?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  xAxisLabel?: string;
  yAxisLabel?: string;
  tooltipFormat?: (d: any) => string;
  colorScheme?: string | string[];
  scaleType?: string;
  minValue?: number | null;
  maxValue?: number | null;
  showGrid?: boolean;
  showBorder?: boolean;
  borderColor?: string;
  cellPadding?: number;
  legendPosition?: string;
  legendTitle?: string;
  legendWidth?: number;
  onCellClick?: (d: any) => void;
  className?: string;
}

// LD1: Export styled container for the tooltip
export const TooltipContainer = styled.div`
  position: absolute;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  borderRadius: 4px;
  pointer-events: none;
  fontSize: 12px;
  fontWeight: 500;
  z-index: 1000;
  boxShadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: opacity 0.2s ease-in-out;
  opacity: 0;
  visibility: hidden;
`;

export default HeatMap;