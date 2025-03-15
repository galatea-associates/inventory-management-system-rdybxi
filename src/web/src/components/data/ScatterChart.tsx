import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import * as d3 from 'd3'; // d3 ^7.8
import { Box, useTheme, useMediaQuery } from '@mui/material'; // @mui/material ^5.13
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
 * Props for the ScatterChart component
 */
export interface ScatterChartProps {
  /**
   * The data for the scatter chart
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
   */
  width?: number;
  /**
   * The margin of the chart
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
   * The format for the tooltip
   */
  tooltipFormat?: (d: any) => string;
  /**
   * The radius of the data points
   * @default 5
   */
  pointRadius?: number;
  /**
   * The color of the data points
   * @default 'primary.main'
   */
  pointColor?: string;
  /**
   * The opacity of the data points
   * @default 0.7
   */
  pointOpacity?: number;
  /**
   * Whether to show grid lines
   * @default true
   */
  showGrid?: boolean;
  /**
   * Whether to show a trend line
   * @default false
   */
  showTrendLine?: boolean;
  /**
   * The color of the trend line
   * @default 'secondary.main'
   */
  trendLineColor?: string;
  /**
   * The width of the trend line
   * @default 2
   */
  trendLineWidth?: number;
  /**
   * Whether to show quadrant divisions
   * @default false
   */
  showQuadrants?: boolean;
  /**
   * The colors for the quadrants
   * @default ['rgba(200, 200, 200, 0.1)', 'rgba(200, 200, 200, 0.2)', 'rgba(200, 200, 200, 0.1)', 'rgba(200, 200, 200, 0.2)']
   */
  quadrantColors?: string[];
  /**
   * Whether the x-axis data is time data
   * @default false
   */
  xTimeData?: boolean;
  /**
   * Whether the y-axis data is time data
   * @default false
   */
  yTimeData?: boolean;
  /**
   * The format for the time data
   */
  timeFormat?: string;
  /**
   * Whether to enable zoom and pan
   * @default false
   */
  enableZoom?: boolean;
  /**
   * Callback function for point click events
   */
  onPointClick?: (d: any) => void;
  /**
   * Additional CSS class name
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
 * A scatter chart component for visualizing correlation between two variables
 */
const ScatterChart: React.FC<ScatterChartProps> = React.memo(({
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
  pointRadius = 5,
  pointColor = 'primary.main',
  pointOpacity = 0.7,
  showGrid = true,
  showTrendLine = false,
  trendLineColor = 'secondary.main',
  trendLineWidth = 2,
  showQuadrants = false,
  quadrantColors = ['rgba(200, 200, 200, 0.1)', 'rgba(200, 200, 200, 0.2)', 'rgba(200, 200, 200, 0.1)', 'rgba(200, 200, 200, 0.2)'],
  xTimeData = false,
  yTimeData = false,
  timeFormat = '%b %d',
  enableZoom = false,
  onPointClick,
  className,
}) => {
  // Refs for SVG container and tooltip
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get theme colors
  const theme = useTheme();
  const resolvedPointColor = theme.palette[pointColor?.split('.')[0] as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.[pointColor?.split('.')[1] as 'main' | 'light' | 'dark' | 'contrastText'] || pointColor;
  const resolvedTrendLineColor = theme.palette[trendLineColor?.split('.')[0] as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.[trendLineColor?.split('.')[1] as 'main' | 'light' | 'dark' | 'contrastText'] || trendLineColor;

  // Responsive behavior
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  // Calculate chart dimensions
  const dimensions = useMemo(() => {
    const chartWidth = (width || (isXs ? 300 : 600)) - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    return { width: width || (isXs ? 300 : 600), height, chartWidth, chartHeight };
  }, [width, height, margin, isXs]);

  // Process data
  const processedData = useMemo(() => processData(data, xKey, yKey, xTimeData || yTimeData), [data, xKey, yKey, xTimeData, yTimeData]);

  // Create scales
  const scales = useMemo(() => {
    const xScale = xTimeData ? d3.scaleTime() : d3.scaleLinear();
    const yScale = yTimeData ? d3.scaleTime() : d3.scaleLinear();

    xScale.range([0, dimensions.chartWidth]);
    yScale.range([dimensions.chartHeight, 0]);

    if (processedData.length > 0) {
      xScale.domain(xTimeData ? d3.extent(processedData, d => d.x) : [d3.min(processedData, d => d.x), d3.max(processedData, d => d.x)]);
      yScale.domain(yTimeData ? d3.extent(processedData, d => d.y) : [d3.min(processedData, d => d.y), d3.max(processedData, d => d.y)]);
    }

    return { xScale, yScale };
  }, [processedData, dimensions.chartWidth, dimensions.chartHeight, xTimeData, yTimeData]);

  // Create axis generators
  const generators = useMemo(() => {
    const xAxis = d3.axisBottom(scales.xScale).ticks(5).tickSize(-dimensions.chartHeight);
    const yAxis = d3.axisLeft(scales.yScale).ticks(5).tickSize(-dimensions.chartWidth);
    return { xAxis, yAxis };
  }, [scales.xScale, scales.yScale, dimensions.chartWidth, dimensions.chartHeight]);

  // Draw chart function
  const drawChart = useCallback((svgElement: SVGSVGElement, tooltipElement: HTMLDivElement, data: any[], scales: any, generators: any, config: any) => {
    d3.select(svgElement).selectAll('*').remove();

    const svg = d3.select(svgElement)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add clip path to prevent drawing outside chart area
    chartGroup.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", dimensions.chartWidth)
      .attr("height", dimensions.chartHeight);

    // Draw grid lines
    if (config.showGrid) {
      chartGroup.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${dimensions.chartHeight})`)
        .call(generators.xAxis
          .tickSize(-dimensions.chartHeight)
          .tickFormat("" as any)
        );

      chartGroup.append("g")
        .attr("class", "grid")
        .call(generators.yAxis
          .tickSize(-dimensions.chartWidth)
          .tickFormat("" as any)
        );
    }

    // Draw x and y axes
    chartGroup.append("g")
      .attr("transform", `translate(0,${dimensions.chartHeight})`)
      .call(generators.xAxis)
      .append("text")
      .attr("x", dimensions.chartWidth)
      .attr("y", margin.bottom - 10)
      .style("text-anchor", "end")
      .text(config.xAxisLabel);

    chartGroup.append("g")
      .call(generators.yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 10)
      .attr("x", -margin.top)
      .style("text-anchor", "end")
      .text(config.yAxisLabel);

    // Draw trend line
    if (config.showTrendLine && data.length > 1) {
      const trend = calculateTrendLine(data, xKey, yKey);
      const x1 = scales.xScale(d3.min(data, d => d.x));
      const y1 = scales.yScale(trend.slope * d3.min(data, d => d.x) + trend.intercept);
      const x2 = scales.xScale(d3.max(data, d => d.x));
      const y2 = scales.yScale(trend.slope * d3.max(data, d => d.x) + trend.intercept);

      chartGroup.append("line")
        .attr("class", "trendline")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .style("stroke", config.trendLineColor)
        .style("stroke-width", config.trendLineWidth);
    }

    // Draw quadrant divisions
    if (config.showQuadrants) {
      const midX = scales.xScale(d3.mean(data, d => d.x));
      const midY = scales.yScale(d3.mean(data, d => d.y));

      chartGroup.append("rect")
        .attr("class", "quadrant")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", midX)
        .attr("height", midY)
        .attr("fill", config.quadrantColors[0]);

      chartGroup.append("rect")
        .attr("class", "quadrant")
        .attr("x", midX)
        .attr("y", 0)
        .attr("width", dimensions.chartWidth - midX)
        .attr("height", midY)
        .attr("fill", config.quadrantColors[1]);

      chartGroup.append("rect")
        .attr("class", "quadrant")
        .attr("x", 0)
        .attr("y", midY)
        .attr("width", midX)
        .attr("height", dimensions.chartHeight - midY)
        .attr("fill", config.quadrantColors[2]);

      chartGroup.append("rect")
        .attr("class", "quadrant")
        .attr("x", midX)
        .attr("y", midY)
        .attr("width", dimensions.chartWidth - midX)
        .attr("height", dimensions.chartHeight - midY)
        .attr("fill", config.quadrantColors[3]);
    }

    // Draw data points
    chartGroup.selectAll(".dot")
      .data(data)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => scales.xScale(d.x))
      .attr("cy", d => scales.yScale(d.y))
      .attr("r", config.pointRadius)
      .style("fill", config.pointColor)
      .style("opacity", config.pointOpacity)
      .on("mouseover", function (event: any, d: any) {
        handleTooltip(event, tooltipElement, data, scales, config);
        d3.select(this)
          .style("stroke", "black")
          .style("stroke-width", 2);
      })
      .on("mouseout", function () {
        d3.select(this)
          .style("stroke", "none");
        d3.select(tooltipElement)
          .style("opacity", 0)
          .style("visibility", "hidden");
      })
      .on("click", function (event: any, d: any) {
        if (config.onPointClick) {
          config.onPointClick(d);
        }
      });

    // Setup zoom behavior
    if (config.enableZoom) {
      const zoom = setupZoom(svgElement, scales, dimensions, () => {
        drawChart(svgElement, tooltipElement, data, scales, generators, config);
      });
      svg.call(zoom);
    }
  }, [dimensions, margin, xKey, yKey]);

  // Handle tooltip
  const handleTooltip = useCallback((event: any, tooltipElement: HTMLDivElement, data: any[], scales: any, config: any) => {
    const [x, y] = d3.pointer(event);
    const xValue = scales.xScale.invert(x - margin.left);
    const yValue = scales.yScale.invert(y - margin.top);

    let closestDataPoint = null;
    let minDistance = Infinity;

    data.forEach(d => {
      const distance = Math.sqrt(Math.pow(d.x - xValue, 2) + Math.pow(d.y - yValue, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestDataPoint = d;
      }
    });

    if (closestDataPoint) {
      const tooltipText = config.tooltipFormat
        ? config.tooltipFormat(closestDataPoint)
        : `X: ${formatNumber(closestDataPoint.x, 2)}, Y: ${formatNumber(closestDataPoint.y, 2)}`;

      d3.select(tooltipElement)
        .transition()
        .duration(200)
        .style("opacity", .9)
        .style("visibility", "visible");

      d3.select(tooltipElement)
        .html(tooltipText)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    }
  }, [margin]);

  // Process data function
  const processData = useCallback((rawData: any[], xKey: string, yKey: string, isTimeData: boolean) => {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    return rawData.filter(d => d[xKey] != null && d[yKey] != null)
      .map(d => ({
        x: isTimeData && typeof d[xKey] === 'string' ? new Date(d[xKey]) : +d[xKey],
        y: isTimeData && typeof d[yKey] === 'string' ? new Date(d[yKey]) : +d[yKey]
      }));
  }, []);

  // Calculate trend line function
  const calculateTrendLine = useCallback((data: any[], xKey: string, yKey: string) => {
    const xMean = d3.mean(data, d => d.x);
    const yMean = d3.mean(data, d => d.y);

    let numerator = 0;
    let denominator = 0;

    data.forEach(d => {
      numerator += (d.x - xMean) * (d.y - yMean);
      denominator += (d.x - xMean) ** 2;
    });

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    return { slope, intercept };
  }, []);

  // Setup zoom function
  const setupZoom = useCallback((svgElement: SVGSVGElement, scales: any, dimensions: any, redrawFunction: () => void) => {
    const zoom = d3.zoom()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [dimensions.chartWidth, dimensions.chartHeight]])
      .on("zoom", (event) => {
        const newXScale = event.transform.rescaleX(scales.xScale);
        const newYScale = event.transform.rescaleY(scales.yScale);
        scales.xScale = newXScale;
        scales.yScale = newYScale;
        redrawFunction();
      });

    return zoom;
  }, []);

  // Effect to draw chart on data change
  useEffect(() => {
    if (processedData.length > 0 && svgRef.current && tooltipRef.current) {
      drawChart(svgRef.current, tooltipRef.current, processedData, scales, generators, {
        showGrid,
        showTrendLine,
        trendLineColor: resolvedTrendLineColor,
        trendLineWidth,
        showQuadrants,
        quadrantColors,
        xAxisLabel,
        yAxisLabel,
        pointRadius,
        pointColor: resolvedPointColor,
        pointOpacity,
        enableZoom,
        onPointClick
      });
    }
  }, [processedData, drawChart, scales, generators, showGrid, showTrendLine, resolvedTrendLineColor, trendLineWidth, showQuadrants, quadrantColors, xAxisLabel, yAxisLabel, pointRadius, resolvedPointColor, pointOpacity, enableZoom, onPointClick]);

  return (
    <ChartContainer title={title} loading={loading} error={error} isEmpty={isEmpty} height={height} className={className}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <ChartSvg ref={svgRef} />
        <TooltipContainer ref={tooltipRef} />
      </Box>
    </ChartContainer>
  );
});

ScatterChart.displayName = 'ScatterChart';

export default ScatterChart;

/**
 * Styled container for the tooltip
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