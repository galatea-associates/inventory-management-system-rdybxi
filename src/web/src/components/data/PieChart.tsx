import React, { useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react'; // react ^18.2
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import * as d3 from 'd3'; // d3 ^7.8
import { Box, useTheme, useMediaQuery } from '@mui/material'; // @mui/material ^5.13
import ChartContainer from './ChartContainer';
import { formatNumber, formatPercentage } from '../../utils/formatter';

/**
 * Props for the PieChart component
 */
export interface PieChartProps {
  /**
   * The data for the pie chart
   */
  data: any[];
  /**
   * The key in the data objects that represents the name
   */
  nameKey: string;
  /**
   * The key in the data objects that represents the value
   */
  valueKey: string;
  /**
   * The title of the pie chart
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
   * The margin around the chart
   * @default { top: 20, right: 20, bottom: 20, left: 20 }
   */
  margin?: { top: number; right: number; bottom: number; left: number };
  /**
   * An array of colors to use for the pie chart segments
   */
  colors?: string[];
  /**
   * Whether to show the legend
   * @default true
   */
  showLegend?: boolean;
  /**
   * The position of the legend ('top', 'right', 'bottom', 'left')
   * @default 'right'
   */
  legendPosition?: string;
  /**
   * Whether to show labels on the pie chart segments
   * @default false
   */
  showLabels?: boolean;
  /**
   * The type of label to show ('name', 'value', 'percentage')
   * @default 'percentage'
   */
  labelType?: string;
  /**
   * Whether to display the chart as a donut chart
   * @default false
   */
  donut?: boolean;
  /**
   * The inner radius of the donut chart (as a percentage of the radius)
   * @default 0.5
   */
  innerRadius?: number;
  /**
   * The amount of padding between the pie chart segments
   * @default 0.01
   */
  padAngle?: number;
  /**
   * The corner radius of the pie chart segments
   * @default 3
   */
  cornerRadius?: number;
  /**
   * Whether to sort the data by value
   * @default true
   */
  sortByValue?: boolean;
  /**
   * Whether to show percentage values in tooltips and labels
   * @default true
   */
  showPercentage?: boolean;
  /**
   * A function to format the tooltip content
   * @param d - The data point
   * @returns The formatted tooltip content
   */
  tooltipFormat?: (d: any) => string;
  /**
   * A function to call when a segment is clicked
   * @param d - The data point
   */
  onSegmentClick?: (d: any) => void;
  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Content to display in the center of the donut chart
   */
  centerContent?: ReactNode;
  /**
   * Threshold for grouping smaller segments into an "Other" category (as a percentage of the total)
   * @default 0.05 (5%)
   */
  otherThreshold?: number;
  /**
   * Maximum number of segments to display before grouping smaller segments into "Other"
   * @default 8
   */
  maxSegments?: number;
}

/**
 * Internal interface for chart dimensions
 */
interface ChartDimensions {
  width: number;
  height: number;
  chartWidth: number;
  chartHeight: number;
  radius: number;
}

/**
 * Internal interface for processed data items
 */
interface ProcessedDataItem {
  name: string;
  value: number;
  percentage: number;
  original: any;
}

const TooltipContainer = styled.div`
  position: absolute;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  borderRadius: 4px;
  pointerEvents: none;
  fontSize: 12px;
  fontWeight: 500;
  z-index: 1000;
  boxShadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: opacity 0.2s ease-in-out;
  opacity: 0;
  visibility: hidden;
`;

const ChartSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const LegendContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  fontSize: 12px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const LegendColor = styled.div`
  width: 12px;
  height: 12px;
  borderRadius: 2px;
`;

/**
 * A pie chart component for visualizing composition data
 */
const PieChart = React.memo<PieChartProps>(({
  data,
  nameKey,
  valueKey,
  title,
  loading = false,
  error = null,
  isEmpty = false,
  height = 300,
  width,
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
  colors,
  showLegend = true,
  legendPosition = 'right',
  showLabels = false,
  labelType = 'percentage',
  donut = false,
  innerRadius = 0.5,
  padAngle = 0.01,
  cornerRadius = 3,
  sortByValue = true,
  showPercentage = true,
  tooltipFormat,
  onSegmentClick,
  className,
  centerContent,
  otherThreshold = 0.05,
  maxSegments = 8,
}) => {
  // Refs for SVG container and tooltip
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get current theme colors
  const theme = useTheme();

  // Responsive behavior
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Calculate chart dimensions
  const dimensions: ChartDimensions = useMemo(() => {
    const calculatedWidth = width || (isSmallScreen ? 300 : 400);
    const calculatedHeight = height;
    const chartWidth = calculatedWidth - margin.left - margin.right;
    const chartHeight = calculatedHeight - margin.top - margin.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2;

    return {
      width: calculatedWidth,
      height: calculatedHeight,
      chartWidth,
      chartHeight,
      radius,
    };
  }, [width, height, margin, isSmallScreen]);

  // Process data for D3
  const processedData = useMemo(() => {
    return processData(data, nameKey, valueKey, sortByValue, otherThreshold, maxSegments);
  }, [data, nameKey, valueKey, sortByValue, otherThreshold, maxSegments]);

  // Create pie layout
  const pie = useMemo(() => {
    return d3.pie<any>()
      .sort(null)
      .value(d => d.value)
      .padAngle(padAngle);
  }, [padAngle]);

  // Create arc generator
  const arc = useMemo(() => {
    const outerRadius = dimensions.radius;
    const calculatedInnerRadius = donut ? dimensions.radius * innerRadius : 0;

    return d3.arc<any, d3.PieArcDatum<any>>()
      .outerRadius(outerRadius)
      .innerRadius(calculatedInnerRadius)
      .cornerRadius(cornerRadius);
  }, [dimensions.radius, donut, innerRadius, cornerRadius]);

  // Create color scale
  const colorScale = useMemo(() => {
    return d3.scaleOrdinal<string>()
      .domain(processedData.map(d => d.name))
      .range(colors || theme.palette.categorical.main);
  }, [processedData, colors, theme.palette.categorical.main]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && tooltipRef.current) {
        drawChart(svgRef.current, tooltipRef.current, processedData, { pie, arc }, { showLabels, labelType, donut, colorScale, tooltipFormat, onSegmentClick });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [processedData, showLabels, labelType, donut, colorScale, tooltipFormat, onSegmentClick, pie, arc]);

  // Draw chart on data change
  useEffect(() => {
    if (svgRef.current && tooltipRef.current) {
      drawChart(svgRef.current, tooltipRef.current, processedData, { pie, arc }, { showLabels, labelType, donut, colorScale, tooltipFormat, onSegmentClick });
    }
  }, [processedData, showLabels, labelType, donut, colorScale, tooltipFormat, onSegmentClick, pie, arc]);

  return (
    <ChartContainer
      title={title}
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height={dimensions.height}
      className={className}
    >
      <Box position="relative" width="100%" height="100%">
        <ChartSvg ref={svgRef} width={dimensions.width} height={dimensions.height} aria-label="Pie Chart">
          <g transform={`translate(${dimensions.width / 2},${dimensions.height / 2})`}>
            {centerContent && (
              <foreignObject x={-dimensions.radius / 2} y={-dimensions.radius / 2} width={dimensions.radius} height={dimensions.radius}>
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  {centerContent}
                </Box>
              </foreignObject>
            )}
          </g>
        </ChartSvg>
        <TooltipContainer ref={tooltipRef} />
        {showLegend && (
          <LegendContainer>
            {processedData.map((d, i) => (
              <LegendItem key={i}>
                <LegendColor style={{ backgroundColor: colorScale(d.name) }} />
                <span>{d.name}</span>
              </LegendItem>
            ))}
          </LegendContainer>
        )}
      </Box>
    </ChartContainer>
  );
});

PieChart.displayName = 'PieChart';

interface ChartSvgProps {
  width: number;
  height: number;
}

interface DrawChartConfig {
  showLabels: boolean;
  labelType: string;
  donut: boolean;
  colorScale: d3.ScaleOrdinal<string, string, any>;
  tooltipFormat: ((d: any) => string) | undefined;
  onSegmentClick: ((d: any) => void) | undefined;
}

interface DrawChartLayout {
  pie: d3.Pie<any, any>;
  arc: d3.Arc<any, d3.PieArcDatum<any>, any>;
}

/**
 * Draws the pie chart using D3.js
 */
function drawChart(
  svgElement: SVGSVGElement,
  tooltipElement: HTMLDivElement,
  data: any[],
  layout: DrawChartLayout,
  config: DrawChartConfig
) {
  const { pie, arc } = layout;
  const { showLabels, labelType, donut, colorScale, tooltipFormat, onSegmentClick } = config;

  // Clear any existing chart elements
  d3.select(svgElement).selectAll('*').remove();

  // Get chart dimensions
  const width = svgElement.width.baseVal.value;
  const height = svgElement.height.baseVal.value;
  const radius = Math.min(width, height) / 2;

  // Create chart group element with margins applied
  const chartGroup = d3.select(svgElement)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  // Draw pie segments
  chartGroup.selectAll('path')
    .data(pie(data))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => colorScale(d.data.name))
    .attr('stroke', 'white')
    .style('stroke-width', '2px')
    .on('mouseover', function (event: MouseEvent, datum: any) {
      handleTooltip(event, tooltipElement, datum, config);
      d3.select(this)
        .transition()
        .duration(200)
        .style('opacity', 0.8);
    })
    .on('mouseout', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .style('opacity', 1);
      d3.select(tooltipElement)
        .style('opacity', 0)
        .style('visibility', 'hidden');
    })
    .on('click', function (event: MouseEvent, datum: any) {
      if (onSegmentClick) {
        onSegmentClick(datum.data);
      }
    })
    .transition()
    .duration(750);

  // Draw labels
  if (showLabels) {
    chartGroup.selectAll('text')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('dy', '0.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text(d => {
        switch (labelType) {
          case 'name':
            return d.data.name;
          case 'value':
            return formatNumber(d.data.value, 0);
          case 'percentage':
          default:
            return formatPercentage(d.data.percentage, 1);
        }
      });
  }

  // Apply accessibility attributes
  d3.select(svgElement)
    .attr('role', 'img')
    .attr('aria-label', 'Pie Chart');
}

interface HandleTooltipConfig {
  tooltipFormat: ((d: any) => string) | undefined;
}

/**
 * Handles the display of tooltips on hover
 */
function handleTooltip(
  event: MouseEvent,
  tooltipElement: HTMLDivElement,
  datum: any,
  config: HandleTooltipConfig
) {
  const { tooltipFormat } = config;

  // Get mouse position
  const x = event.clientX;
  const y = event.clientY;

  // Format the tooltip content
  let tooltipText = `${datum.data.name}: ${formatNumber(datum.data.value, 0)}`;
  if (tooltipFormat) {
    tooltipText = tooltipFormat(datum.data);
  }

  // Position the tooltip
  d3.select(tooltipElement)
    .style('left', x + 'px')
    .style('top', y + 'px')
    .html(tooltipText)
    .style('opacity', 1)
    .style('visibility', 'visible');
}

interface ProcessDataConfig {
  sortByValue: boolean;
  otherThreshold: number;
  maxSegments: number;
}

/**
 * Processes and formats the input data for D3
 */
function processData(
  rawData: any[],
  nameKey: string,
  valueKey: string,
  sortByValue: boolean,
  otherThreshold: number,
  maxSegments: number
): any[] {
  // Filter out invalid data points
  const validData = rawData.filter(d => d[nameKey] && typeof d[valueKey] === 'number' && !isNaN(d[valueKey]));

  // Calculate total value
  const totalValue = d3.sum(validData, d => d[valueKey]);

  // Format data into objects with name, value, and percentage
  let processedData = validData.map(d => ({
    name: d[nameKey],
    value: d[valueKey],
    percentage: d[valueKey] / totalValue,
    original: d,
  }));

  // Sort data by value
  if (sortByValue) {
    processedData.sort((a, b) => b.value - a.value);
  }

  // Handle "Other" category aggregation
  if (processedData.length > maxSegments) {
    const otherSegments = processedData.slice(maxSegments - 1);
    const otherValue = d3.sum(otherSegments, d => d.value);
    const otherPercentage = otherValue / totalValue;

    processedData = processedData.slice(0, maxSegments - 1);
    processedData.push({
      name: 'Other',
      value: otherValue,
      percentage: otherPercentage,
      original: otherSegments,
    });
  }

  return processedData;
}

interface RenderLegendConfig {
}

/**
 * Renders the chart legend
 */
function renderLegend(
  svgElement: SVGSVGElement,
  data: any[],
  colorScale: d3.ScaleOrdinal<string, string, any>,
  dimensions: ChartDimensions,
  config: RenderLegendConfig
) {
  // Calculate legend position
  const legendX = dimensions.width - 100;
  const legendY = dimensions.height / 2;

  // Create legend group element
  const legendGroup = d3.select(svgElement)
    .append('g')
    .attr('transform', `translate(${legendX},${legendY})`);

  // Draw legend items
  const legendItems = legendGroup.selectAll('.legend-item')
    .data(data)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0,${i * 20})`);

  legendItems.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 12)
    .attr('height', 12)
    .attr('fill', d => colorScale(d.name));

  legendItems.append('text')
    .attr('x', 20)
    .attr('y', 10)
    .attr('dy', '0.32em')
    .text(d => `${d.name} (${formatNumber(d.value, 0)})`);
}

export default PieChart;