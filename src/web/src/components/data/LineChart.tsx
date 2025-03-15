import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // react v18.2
import styled from '@emotion/styled'; // @emotion/styled v11.10.6
import * as d3 from 'd3'; // d3 v7.8
import { Box, useTheme, useMediaQuery } from '@mui/material'; // @mui/material v5.13
import ChartContainer from './ChartContainer';
import { formatNumber } from '../../utils/formatter';
import { formatDate } from '../../utils/date';

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
 * Props for the LineChart component
 */
export interface LineChartProps {
  /**
   * The data for the line chart
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
   * @default undefined (100% of container)
   */
  width?: number;
  /**
   * The margins around the chart
   * @default { top: 20, right: 20, bottom: 40, left: 50 }
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
   * @param d - The data point
   * @returns Formatted tooltip string
   */
  tooltipFormat?: (d: any) => string;
  /**
   * The color of the line
   * @default 'primary.main'
   */
  lineColor?: string;
  /**
   * The width of the line
   * @default 2
   */
  lineWidth?: number;
  /**
   * Whether to show data points
   * @default false
   */
  showPoints?: boolean;
  /**
   * The radius of the data points
   * @default 4
   */
  pointRadius?: number;
  /**
   * The color of the data points
   * @default 'primary.main'
   */
  pointColor?: string;
  /**
   * Whether to show grid lines
   * @default true
   */
  showGrid?: boolean;
  /**
   * Whether to show area fill under the line
   * @default false
   */
  showArea?: boolean;
  /**
   * The opacity of the area fill
   * @default 0.1
   */
  areaOpacity?: number;
  /**
   * Whether the x-axis data is time-based
   * @default true
   */
  isTimeData?: boolean;
  /**
   * The format for time data on the x-axis
   * @default '%b %d'
   */
  timeFormat?: string;
  /**
   * Whether to enable zoom and pan functionality
   * @default false
   */
  enableZoom?: boolean;
  /**
   * The curve type for the line
   * @default 'curveMonotoneX'
   */
  curveType?: string;
  /**
   * Callback function for when a data point is clicked
   * @param d - The data point
   */
  onPointClick?: (d: any) => void;
  /**
   * Optional CSS class name
   */
  className?: string;
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
 * A line chart component for visualizing time series data
 */
const LineChart = React.memo<LineChartProps>(({
  data,
  xKey,
  yKey,
  title,
  loading = false,
  error,
  isEmpty = false,
  height = 300,
  width,
  margin = { top: 20, right: 20, bottom: 40, left: 50 },
  xAxisLabel,
  yAxisLabel,
  tooltipFormat,
  lineColor = 'primary.main',
  lineWidth = 2,
  showPoints = false,
  pointRadius = 4,
  pointColor,
  showGrid = true,
  showArea = false,
  areaOpacity = 0.1,
  isTimeData = true,
  timeFormat = '%b %d',
  enableZoom = false,
  curveType = 'curveMonotoneX',
  onPointClick,
  className,
}) => {
  // Refs for SVG container and tooltip elements
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get current theme colors for styling
  const theme = useTheme();
  const resolvedLineColor = theme.palette[lineColor.split('.')[0] as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'] ? theme.palette[lineColor.split('.')[0] as 'primary' | 'secondary' | 'error' | 'warning' | 'info'][lineColor.split('.')[1] as 'main' | 'light' | 'dark' | 'contrastText'] : lineColor;
  const resolvedPointColor = pointColor ? (theme.palette[pointColor.split('.')[0] as 'primary' | 'secondary' | 'error' | 'warning' | 'info'] ? theme.palette[pointColor.split('.')[0] as 'primary' | 'secondary' | 'error' | 'warning' | 'info'][pointColor.split('.')[1] as 'main' | 'light' | 'dark' | 'contrastText'] : pointColor) : resolvedLineColor;

  // Set up responsive behavior using useMediaQuery
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Calculate chart dimensions based on container size and margins
  const dimensions = useMemo<ChartDimensions>(() => {
    const calculatedWidth = width || (isSmallScreen ? 300 : 600);
    const calculatedHeight = height || 300;
    const chartWidth = calculatedWidth - margin.left - margin.right;
    const chartHeight = calculatedHeight - margin.top - margin.bottom;

    return {
      width: calculatedWidth,
      height: calculatedHeight,
      chartWidth,
      chartHeight,
    };
  }, [width, height, margin, isSmallScreen]);

  // Process and format the input data for D3
  const processedData = useMemo(() => {
    return processData(data, xKey, yKey, isTimeData);
  }, [data, xKey, yKey, isTimeData]);

  // Create scales for x and y axes
  const scales = useMemo(() => {
    const xScale = isTimeData ? d3.scaleTime() : d3.scaleLinear();
    const yScale = d3.scaleLinear();

    xScale.range([0, dimensions.chartWidth]);
    yScale.range([dimensions.chartHeight, 0]);

    if (processedData.length > 0) {
      xScale.domain(isTimeData
        ? d3.extent(processedData, (d: any) => d[xKey]) as [Date, Date]
        : [d3.min(processedData, (d: any) => d[xKey]) as number, d3.max(processedData, (d: any) => d[xKey]) as number]
      );
      yScale.domain([0, d3.max(processedData, (d: any) => d[yKey]) as number]);
    }

    return { xScale, yScale };
  }, [processedData, xKey, yKey, dimensions, isTimeData]);

  // Create axis generators
  const generators = useMemo(() => {
    const xAxis = d3.axisBottom(scales.xScale);
    const yAxis = d3.axisLeft(scales.yScale).ticks(5);

    return { xAxis, yAxis };
  }, [scales.xScale, scales.yScale]);

  // Create line generator
  const line = useMemo(() => {
    let curve;
    switch (curveType) {
      case 'curveLinear':
        curve = d3.curveLinear;
        break;
      case 'curveStep':
        curve = d3.curveStep;
        break;
      case 'curveBasis':
        curve = d3.curveBasis;
        break;
      case 'curveCardinal':
        curve = d3.curveCardinal;
        break;
      case 'curveCatmullRom':
        curve = d3.curveCatmullRom;
        break;
      default:
        curve = d3.curveMonotoneX;
    }

    return d3.line()
      .x((d: any) => scales.xScale(d[xKey]))
      .y((d: any) => scales.yScale(d[yKey]))
      .curve(curve);
  }, [scales.xScale, scales.yScale, xKey, yKey, curveType]);

  // Implement tooltip functionality
  const handleTooltip = useCallback((event: React.MouseEvent, tooltipElement: HTMLDivElement, data: any[], scales: any, config: any) => {
    const { xScale, yScale } = scales;
    const { xKey, yKey, tooltipFormat, isTimeData } = config;

    // Get mouse position
    const [xCoord, yCoord] = d3.pointer(event);

    // Find the closest data point
    const bisect = d3.bisector((d: any) => d[xKey]).center;
    const index = bisect(data, isTimeData ? xScale.invert(xCoord) : xScale.invert(xCoord));
    const dataPoint = data[index];

    if (dataPoint) {
      // Format the tooltip content
      const tooltipText = tooltipFormat
        ? tooltipFormat(dataPoint)
        : `${xAxisLabel || xKey}: ${isTimeData ? formatDate(dataPoint[xKey], timeFormat) : dataPoint[xKey]}\n${yAxisLabel || yKey}: ${formatNumber(dataPoint[yKey], 2)}`;

      // Position the tooltip
      tooltipElement.style.opacity = '1';
      tooltipElement.style.visibility = 'visible';
      tooltipElement.innerHTML = tooltipText;

      const tooltipWidth = tooltipElement.offsetWidth;
      const tooltipHeight = tooltipElement.offsetHeight;
      const chartWidth = dimensions.width;

      let tooltipX = xCoord + margin.left;
      let tooltipY = yCoord + margin.top;

      // Adjust tooltip position to prevent overflow
      if (tooltipX + tooltipWidth > chartWidth) {
        tooltipX = chartWidth - tooltipWidth - margin.right;
      }
      if (tooltipY + tooltipHeight > height) {
        tooltipY = height - tooltipHeight - margin.bottom;
      }

      tooltipElement.style.left = `${tooltipX}px`;
      tooltipElement.style.top = `${tooltipY}px`;
    }
  }, [xAxisLabel, yAxisLabel, timeFormat, margin, dimensions]);

  // Clear tooltip
  const clearTooltip = useCallback((tooltipElement: HTMLDivElement) => {
    tooltipElement.style.opacity = '0';
    tooltipElement.style.visibility = 'hidden';
  }, []);

  // Function to redraw the chart
  const redrawChart = useCallback(() => {
    if (svgRef.current && tooltipRef.current) {
      drawChart(svgRef.current, tooltipRef.current, processedData, { xScale: scales.xScale, yScale: scales.yScale }, generators, {
        xKey,
        yKey,
        tooltipFormat,
        isTimeData,
        lineColor: resolvedLineColor,
        lineWidth,
        showPoints,
        pointRadius,
        pointColor: resolvedPointColor,
        showGrid,
        showArea,
        areaOpacity,
        timeFormat,
        onPointClick,
        margin,
        dimensions,
      });
    }
  }, [processedData, scales, generators, xKey, yKey, tooltipFormat, isTimeData, resolvedLineColor, lineWidth, showPoints, pointRadius, resolvedPointColor, showGrid, showArea, areaOpacity, timeFormat, onPointClick, margin, dimensions]);

  // Set up zoom behavior
  const zoomBehavior = useRef<any>(null);
  const setupZoom = useCallback(() => {
    if (svgRef.current) {
      zoomBehavior.current = setupZoomFn(svgRef.current, scales, dimensions, redrawChart);
    }
  }, [scales, dimensions, redrawChart]);

  // Handle window resize events to make the chart responsive
  useEffect(() => {
    const handleResize = () => {
      redrawChart();
      if (enableZoom) {
        setupZoom();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on mount

    return () => window.removeEventListener('resize', handleResize);
  }, [redrawChart, enableZoom, setupZoom]);

  // Initial chart drawing and zoom setup
  useEffect(() => {
    if (svgRef.current && tooltipRef.current) {
      drawChart(svgRef.current, tooltipRef.current, processedData, { xScale: scales.xScale, yScale: scales.yScale }, generators, {
        xKey,
        yKey,
        tooltipFormat,
        isTimeData,
        lineColor: resolvedLineColor,
        lineWidth,
        showPoints,
        pointRadius,
        pointColor: resolvedPointColor,
        showGrid,
        showArea,
        areaOpacity,
        timeFormat,
        onPointClick,
        margin,
        dimensions,
      });
      if (enableZoom) {
        setupZoom();
      }
    }
  }, [processedData, scales, generators, xKey, yKey, tooltipFormat, isTimeData, resolvedLineColor, lineWidth, showPoints, pointRadius, resolvedPointColor, showGrid, showArea, areaOpacity, timeFormat, enableZoom, setupZoom, margin, dimensions]);

  return (
    <ChartContainer title={title} loading={loading} error={error} isEmpty={isEmpty} height={height} className={className}>
      <Box position="relative" width="100%" height="100%">
        <ChartSvg ref={svgRef} width={dimensions.width} height={dimensions.height} aria-label="Line Chart" />
        <TooltipContainer ref={tooltipRef} />
      </Box>
    </ChartContainer>
  );
});

LineChart.displayName = 'LineChart';

LineChart.defaultProps = {
  loading: false,
  error: null,
  isEmpty: false,
  height: 300,
  margin: { top: 20, right: 20, bottom: 40, left: 50 },
  lineColor: 'primary.main',
  lineWidth: 2,
  showPoints: false,
  pointRadius: 4,
  showGrid: true,
  showArea: false,
  areaOpacity: 0.1,
  isTimeData: true,
  timeFormat: '%b %d',
  enableZoom: false,
  curveType: 'curveMonotoneX'
};

/**
 * Draws the line chart using D3.js
 */
function drawChart(
  svgElement: SVGSVGElement,
  tooltipElement: HTMLDivElement,
  data: any[],
  scales: { xScale: any; yScale: any },
  generators: { xAxis: any; yAxis: any },
  config: any
) {
  const { xScale, yScale } = scales;
  const { xAxis, yAxis } = generators;
  const { xKey, yKey, tooltipFormat, isTimeData, lineColor, lineWidth, showPoints, pointRadius, pointColor, showGrid, showArea, areaOpacity, timeFormat, onPointClick, margin, dimensions } = config;

  // Clear any existing chart elements
  d3.select(svgElement).selectAll('*').remove();

  // Create chart group element with margins applied
  const svg = d3.select(svgElement)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Add clip path to prevent drawing outside chart area
  svg.append('defs').append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', dimensions.chartWidth)
    .attr('height', dimensions.chartHeight);

  // Draw grid lines if enabled
  if (showGrid) {
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${dimensions.chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-dimensions.chartHeight)
        .tickFormat('')
      );

    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-dimensions.chartWidth)
        .tickFormat('')
      );
  }

  // Draw x and y axes
  svg.append('g')
    .attr('transform', `translate(0,${dimensions.chartHeight})`)
    .call(xAxis);

  svg.append('g')
    .call(yAxis);

  // Draw area fill if enabled
  if (showArea) {
    const area = d3.area()
      .x((d: any) => xScale(d[xKey]))
      .y0(dimensions.chartHeight)
      .y1((d: any) => yScale(d[yKey]))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('class', 'area')
      .attr('d', area)
      .attr('fill', lineColor)
      .attr('opacity', areaOpacity)
      .attr('clip-path', 'url(#clip)');
  }

  // Draw line
  svg.append('path')
    .datum(data)
    .attr('class', 'line')
    .attr('d', line)
    .attr('stroke', lineColor)
    .attr('stroke-width', lineWidth)
    .attr('fill', 'none')
    .attr('clip-path', 'url(#clip)');

  // Draw data points if enabled
  if (showPoints) {
    svg.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', (d: any) => xScale(d[xKey]))
      .attr('cy', (d: any) => yScale(d[yKey]))
      .attr('r', pointRadius)
      .attr('fill', pointColor)
      .on('mouseover', function (event: any, d: any) {
        handleTooltip(event, tooltipElement, data, scales, { xKey, yKey, tooltipFormat, isTimeData });
        d3.select(this)
          .attr('stroke', 'black')
          .attr('stroke-width', 2);
      })
      .on('mouseout', function () {
        clearTooltip(tooltipElement);
        d3.select(this)
          .attr('stroke', null)
          .attr('stroke-width', null);
      })
      .on('click', function (event: any, d: any) {
        if (onPointClick) {
          onPointClick(d);
        }
      });
  }

  // Set up event handlers for tooltip interaction
  d3.select(svgElement)
    .on('mousemove', (event: any) => {
      handleTooltip(event, tooltipElement, data, scales, { xKey, yKey, tooltipFormat, isTimeData });
    })
    .on('mouseleave', () => {
      clearTooltip(tooltipElement);
    });
}

/**
 * Handles the display of tooltips on hover
 */
function handleTooltip(event: MouseEvent, tooltipElement: HTMLDivElement, data: any[], scales: any, config: any) {
  const { xScale, yScale } = scales;
  const { xKey, yKey, tooltipFormat, isTimeData, timeFormat, margin, dimensions } = config;

  // Get mouse position
  const [xCoord, yCoord] = d3.pointer(event);

  // Find the closest data point
  const bisect = d3.bisector((d: any) => d[xKey]).center;
  const index = bisect(data, isTimeData ? xScale.invert(xCoord) : xScale.invert(xCoord));
  const dataPoint = data[index];

  if (dataPoint) {
    // Format the tooltip content
    const tooltipText = tooltipFormat
      ? tooltipFormat(dataPoint)
      : `${xKey}: ${isTimeData ? formatDate(dataPoint[xKey], timeFormat) : dataPoint[xKey]}<br>${yKey}: ${formatNumber(dataPoint[yKey], 2)}`;

    // Position the tooltip
    tooltipElement.style.opacity = '1';
    tooltipElement.style.visibility = 'visible';
    tooltipElement.innerHTML = tooltipText;

    const tooltipWidth = tooltipElement.offsetWidth;
    const tooltipHeight = tooltipElement.offsetHeight;
    const chartWidth = dimensions.width;
    const height = dimensions.height;

    let tooltipX = xCoord + margin.left;
    let tooltipY = yCoord + margin.top;

    // Adjust tooltip position to prevent overflow
    if (tooltipX + tooltipWidth > chartWidth) {
      tooltipX = chartWidth - tooltipWidth - margin.right;
    }
    if (tooltipY + tooltipHeight > height) {
      tooltipY = height - tooltipHeight - margin.bottom;
    }

    tooltipElement.style.left = `${tooltipX}px`;
    tooltipElement.style.top = `${tooltipY}px`;
  }
}

/**
 * Processes and formats the input data for D3
 */
function processData(rawData: any[], xKey: string, yKey: string, isTimeData: boolean): any[] {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  // Filter out invalid data points
  const filteredData = rawData.filter(d => d[xKey] !== null && d[xKey] !== undefined && d[yKey] !== null && d[yKey] !== undefined);

  // Sort data by x-axis values
  const sortedData = [...filteredData].sort((a: any, b: any) => d3.ascending(a[xKey], b[xKey]));

  // Convert string dates to Date objects if isTimeData is true
  const processedData = sortedData.map((d: any) => ({
    ...d,
    [xKey]: isTimeData ? new Date(d[xKey]) : d[xKey],
    [yKey]: typeof d[yKey] === 'string' ? parseFloat(d[yKey]) : d[yKey]
  }));

  return processedData;
}

/**
 * Sets up zoom and pan functionality for the chart
 */
function setupZoomFn(
  svgElement: SVGSVGElement,
  scales: any,
  dimensions: any,
  redrawFunction: () => void
) {
  const { xScale, yScale } = scales;

  // Create zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [dimensions.chartWidth, dimensions.chartHeight]])
    .on('zoom', (event: any) => {
      // Update scales based on zoom transform
      const newXScale = event.transform.rescaleX(xScale);
      const newYScale = event.transform.rescaleY(yScale);

      // Update scales
      scales.xScale = newXScale;
      scales.yScale = newYScale;

      // Redraw chart with updated scales
      redrawFunction();
    });

  // Apply zoom behavior to SVG element
  d3.select(svgElement).call(zoom);

  return zoom;
}

export default LineChart;