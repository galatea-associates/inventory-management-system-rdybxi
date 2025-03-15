import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // react ^18.2
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import * as d3 from 'd3'; // d3 ^7.8
import { Box, useTheme, useMediaQuery } from '@mui/material'; // @mui/material ^5.13
import ChartContainer from './ChartContainer';
import { formatNumber } from '../../utils/formatter';
import { formatDate } from '../../utils/date';

/**
 * Props for the AreaChart component
 */
export interface AreaChartProps {
  /**
   * The data for the chart
   */
  data: any[];
  /**
   * The key for the x-axis data
   */
  xKey: string;
  /**
   * The key for the y-axis data
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
   * The margins for the chart
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
   */
  tooltipFormat?: (d: any) => string;
  /**
   * The color of the area
   * @default theme.palette.primary.main
   */
  areaColor?: string;
  /**
   * The opacity of the area
   * @default 0.2
   */
  areaOpacity?: number;
  /**
   * Whether to show the line
   * @default true
   */
  showLine?: boolean;
  /**
   * The color of the line
   * @default theme.palette.primary.main
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
   * @default theme.palette.primary.main
   */
  pointColor?: string;
  /**
   * Whether to show grid lines
   * @default true
   */
  showGrid?: boolean;
  /**
   * Whether the x-axis data is time data
   * @default true
   */
  isTimeData?: boolean;
  /**
   * The format for the time data
   * @default '%b %d'
   */
  timeFormat?: string;
  /**
   * Whether to enable zoom and pan
   * @default false
   */
  enableZoom?: boolean;
  /**
   * The curve type for the area
   * @default 'curveMonotoneX'
   */
  curveType?: string;
  /**
   * Callback function for when a data point is clicked
   */
  onPointClick?: (d: any) => void;
  /**
   * Additional CSS class name
   */
  className?: string;
}

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
 * An area chart component for visualizing time series data with filled areas
 */
const AreaChart: React.FC<AreaChartProps> = React.memo(({
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
  areaColor,
  areaOpacity = 0.2,
  showLine = true,
  lineColor,
  lineWidth = 2,
  showPoints = false,
  pointRadius = 4,
  pointColor,
  showGrid = true,
  isTimeData = true,
  timeFormat = '%b %d',
  enableZoom = false,
  curveType = 'curveMonotoneX',
  onPointClick,
  className,
}) => {
  // useRef hooks for accessing the SVG and tooltip elements
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Access the current theme for styling
  const theme = useTheme();

  // Set up responsive behavior using useMediaQuery
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Calculate chart dimensions based on container size and margins
  const dimensions: ChartDimensions = useMemo(() => {
    const calculatedWidth = width || '100%';
    const parsedWidth = typeof calculatedWidth === 'number' ? calculatedWidth : 0;
    const chartWidth = parsedWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    return {
      width: parsedWidth,
      height,
      chartWidth,
      chartHeight,
    };
  }, [width, height, margin]);

  // Process and format the input data for D3
  const processedData = useMemo(() => {
    return processData(data, xKey, yKey, isTimeData);
  }, [data, xKey, yKey, isTimeData]);

  // Create scales for x and y axes
  const scales = useMemo(() => {
    const xScale = isTimeData
      ? d3.scaleTime()
        .domain(d3.extent(processedData, (d: any) => d[xKey]) as [Date, Date])
        .range([0, dimensions.chartWidth])
      : d3.scaleLinear()
        .domain(d3.extent(processedData, (d: any) => d[xKey]) as [number, number])
        .range([0, dimensions.chartWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, (d: any) => d[yKey]) as number])
      .range([dimensions.chartHeight, 0]);

    return { xScale, yScale };
  }, [processedData, dimensions, xKey, yKey, isTimeData]);

  // Create axis generators
  const generators = useMemo(() => {
    const xAxis = d3.axisBottom(scales.xScale);
    const yAxis = d3.axisLeft(scales.yScale).ticks(5);

    return { xAxis, yAxis };
  }, [scales.xScale, scales.yScale]);

  // Create area generator
  const areaGenerator = useMemo(() => {
    const curve = (d3 as any)[curveType] || d3.curveMonotoneX;

    return d3.area()
      .x((d: any) => scales.xScale(d[xKey]))
      .y0(dimensions.chartHeight)
      .y1((d: any) => scales.yScale(d[yKey]))
      .curve(curve);
  }, [scales.xScale, scales.yScale, dimensions.chartHeight, xKey, yKey, curveType]);

  // Handle window resize events to make the chart responsive
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && tooltipRef.current) {
        drawChart(svgRef.current, tooltipRef.current, processedData, scales, {
          xKey,
          yKey,
          areaColor: theme.palette.primary.main,
          areaOpacity,
          showLine,
          lineColor: theme.palette.primary.main,
          lineWidth,
          showPoints,
          pointRadius,
          pointColor: theme.palette.primary.main,
          showGrid,
          isTimeData,
          timeFormat,
          enableZoom,
          onPointClick,
          dimensions,
          generators,
          areaGenerator,
          tooltipFormat,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call it once to initialize

    return () => window.removeEventListener('resize', handleResize);
  }, [processedData, scales, theme, xKey, yKey, areaColor, areaOpacity, showLine, lineColor, lineWidth, showPoints, pointRadius, pointColor, showGrid, isTimeData, timeFormat, enableZoom, onPointClick, dimensions, generators, areaGenerator, tooltipFormat]);

  // Implement tooltip functionality for displaying data points on hover
  const handleTooltipMemo = useCallback((event: MouseEvent, tooltipElement: HTMLDivElement) => {
    handleTooltip(event, tooltipElement, processedData, scales, {
      xKey,
      yKey,
      isTimeData,
      tooltipFormat,
    });
  }, [processedData, scales, xKey, yKey, isTimeData, tooltipFormat]);

  // Implement zoom and pan functionality if enabled
  const zoomBehavior = useMemo(() => {
    if (enableZoom && svgRef.current) {
      return setupZoom(svgRef.current, scales, dimensions, () => {
        if (svgRef.current && tooltipRef.current) {
          drawChart(svgRef.current, tooltipRef.current, processedData, scales, {
            xKey,
            yKey,
            areaColor: theme.palette.primary.main,
            areaOpacity,
            showLine,
            lineColor: theme.palette.primary.main,
            lineWidth,
            showPoints,
            pointRadius,
            pointColor: theme.palette.primary.main,
            showGrid,
            isTimeData,
            timeFormat,
            enableZoom,
            onPointClick,
            dimensions,
            generators,
            areaGenerator,
            tooltipFormat,
          });
        }
      });
    }
    return null;
  }, [enableZoom, scales, dimensions, processedData, theme, xKey, yKey, areaColor, areaOpacity, showLine, lineColor, lineWidth, showPoints, pointRadius, pointColor, showGrid, isTimeData, timeFormat, onPointClick, generators, areaGenerator, tooltipFormat]);

  // Render chart container with appropriate layout
  return (
    <ChartContainer title={title} loading={loading} error={error} isEmpty={isEmpty} height={height} className={className}>
      <ChartSvg ref={svgRef} width={dimensions.width} height={dimensions.height} >
        <g className="chart-group" transform={`translate(${margin.left},${margin.top})`}>
          {/* Axes, grid lines, and area paths will be rendered by D3 */}
        </g>
      </ChartSvg>
      <TooltipContainer ref={tooltipRef} onMouseMove={(e) => tooltipRef.current && handleTooltipMemo(e, tooltipRef.current)} onMouseLeave={() => tooltipRef.current && (tooltipRef.current.style.opacity = '0')} />
    </ChartContainer>
  );
});

AreaChart.displayName = 'AreaChart';

AreaChart.defaultProps = {
  loading: false,
  error: null,
  isEmpty: false,
  height: 300,
  margin: { top: 20, right: 20, bottom: 40, left: 50 },
  areaColor: 'primary.main',
  areaOpacity: 0.2,
  showLine: true,
  lineColor: 'primary.main',
  lineWidth: 2,
  showPoints: false,
  pointRadius: 4,
  pointColor: 'primary.main',
  showGrid: true,
  isTimeData: true,
  timeFormat: '%b %d',
  enableZoom: false,
  curveType: 'curveMonotoneX',
};

/**
 * Draws the area chart using D3.js
 */
function drawChart(
  svgElement: SVGSVGElement,
  tooltipElement: HTMLDivElement,
  data: any[],
  scales: { xScale: any; yScale: any },
  config: {
    xKey: string;
    yKey: string;
    areaColor: string;
    areaOpacity: number;
    showLine: boolean;
    lineColor: string;
    lineWidth: number;
    showPoints: boolean;
    pointRadius: number;
    pointColor: string;
    showGrid: boolean;
    isTimeData: boolean;
    timeFormat: string;
    enableZoom: boolean;
    onPointClick: (d: any) => void;
    dimensions: ChartDimensions;
    generators: { xAxis: any; yAxis: any };
    areaGenerator: any;
    tooltipFormat: (d: any) => string;
  }
) {
  // Clear any existing chart elements
  d3.select(svgElement).select('.chart-group').selectAll('*').remove();

  // Create chart group element with margins applied
  const chartGroup = d3.select(svgElement).select('.chart-group')
    .attr('transform', `translate(${config.dimensions.width / 10},${config.dimensions.height / 10})`);

  // Add clip path to prevent drawing outside chart area
  chartGroup.append('defs').append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', config.dimensions.chartWidth)
    .attr('height', config.dimensions.chartHeight);

  // Draw grid lines if enabled
  if (config.showGrid) {
    chartGroup.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${config.dimensions.chartHeight})`)
      .call(d3.axisBottom(scales.xScale)
        .tickSize(-config.dimensions.chartHeight)
        .tickFormat('')
      );

    chartGroup.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(scales.yScale)
        .tickSize(-config.dimensions.chartWidth)
        .tickFormat('')
      );
  }

  // Draw x and y axes
  chartGroup.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${config.dimensions.chartHeight})`)
    .call(config.generators.xAxis);

  chartGroup.append('g')
    .attr('class', 'y-axis')
    .call(config.generators.yAxis);

  // Draw area fill
  chartGroup.append('path')
    .datum(data)
    .attr('class', 'area')
    .attr('clip-path', 'url(#clip)')
    .attr('fill', config.areaColor)
    .attr('opacity', config.areaOpacity)
    .attr('d', config.areaGenerator);

  // Draw line on top of area if showLine is enabled
  if (config.showLine) {
    const lineGenerator = d3.line()
      .x((d: any) => scales.xScale(d[config.xKey]))
      .y((d: any) => scales.yScale(d[config.yKey]))
      .curve((d3 as any)[config.curveType] || d3.curveMonotoneX);

    chartGroup.append('path')
      .datum(data)
      .attr('class', 'line')
      .attr('clip-path', 'url(#clip)')
      .attr('fill', 'none')
      .attr('stroke', config.lineColor)
      .attr('stroke-width', config.lineWidth)
      .attr('d', lineGenerator);
  }

  // Draw data points if showPoints is enabled
  if (config.showPoints) {
    chartGroup.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', (d: any) => scales.xScale(d[config.xKey]))
      .attr('cy', (d: any) => scales.yScale(d[config.yKey]))
      .attr('r', config.pointRadius)
      .attr('fill', config.pointColor)
      .on('mouseover', function (event: any, d: any) {
        handleTooltip(event, tooltipElement, data, scales, {
          xKey: config.xKey,
          yKey: config.yKey,
          isTimeData: config.isTimeData,
          tooltipFormat: config.tooltipFormat,
        });
      })
      .on('mouseout', () => {
        tooltipElement.style.opacity = '0';
      })
      .on('click', (event: any, d: any) => {
        if (config.onPointClick) {
          config.onPointClick(d);
        }
      });
  }
}

/**
 * Handles the display of tooltips on hover
 */
function handleTooltip(
  event: MouseEvent,
  tooltipElement: HTMLDivElement,
  data: any[],
  scales: { xScale: any; yScale: any },
  config: {
    xKey: string;
    yKey: string;
    isTimeData: boolean;
    tooltipFormat: (d: any) => string;
  }
) {
  const bisect = d3.bisector((d: any) => d[config.xKey]).left;
  const xCoord = (scales.xScale as any).invert(event.clientX - (event.target as HTMLDivElement).getBoundingClientRect().left);
  const i = bisect(data, xCoord);
  const d = data[i];

  if (d) {
    const x = scales.xScale(d[config.xKey]);
    const y = scales.yScale(d[config.yKey]);

    tooltipElement.style.opacity = '1';
    tooltipElement.style.visibility = 'visible';
    tooltipElement.style.left = `${event.clientX}px`;
    tooltipElement.style.top = `${event.clientY}px`;

    let tooltipContent = `<strong>${config.xKey}:</strong> ${config.isTimeData ? formatDate(d[config.xKey], 'MMM DD, YYYY') : d[config.xKey]}<br/>`;
    tooltipContent += `<strong>${config.yKey}:</strong> ${config.tooltipFormat ? config.tooltipFormat(d[config.yKey]) : d[config.yKey]}`;
    tooltipElement.innerHTML = tooltipContent;
  }
}

/**
 * Processes and formats the input data for D3
 */
function processData(rawData: any[], xKey: string, yKey: string, isTimeData: boolean): any[] {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  const filteredData = rawData.filter(d => d[xKey] !== null && d[xKey] !== undefined && d[yKey] !== null && d[yKey] !== undefined);

  const sortedData = filteredData.sort((a, b) => d3.ascending(a[xKey], b[xKey]));

  const processedData = sortedData.map(d => {
    const processedX = isTimeData ? new Date(d[xKey]) : d[xKey];
    const processedY = typeof d[yKey] === 'string' ? parseFloat(d[yKey]) : d[yKey];

    return {
      ...d,
      [xKey]: processedX,
      [yKey]: processedY,
    };
  });

  return processedData;
}

/**
 * Sets up zoom and pan functionality for the chart
 */
function setupZoom(
  svgElement: SVGSVGElement,
  scales: { xScale: any; yScale: any },
  dimensions: ChartDimensions,
  redrawFunction: () => void
) {
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [dimensions.chartWidth, dimensions.chartHeight]])
    .on('zoom', (event) => {
      const newXScale = event.transform.rescaleX(scales.xScale);
      const newYScale = event.transform.rescaleY(scales.yScale);

      scales.xScale = newXScale;
      scales.yScale = newYScale;

      redrawFunction();
    });

  d3.select(svgElement)
    .call(zoom);

  return zoom;
}

export default AreaChart;