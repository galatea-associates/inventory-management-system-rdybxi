import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // react ^18.2
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import * as d3 from 'd3'; // d3 ^7.8
import { Box, useTheme, useMediaQuery } from '@mui/material'; // @mui/material ^5.13

import ChartContainer from './ChartContainer';
import { formatNumber, formatCurrency, formatShortCurrency } from '../../utils/formatter';

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
 * Internal interface for hierarchy node data
 */
interface HierarchyNode {
  id: string;
  name: string;
  value: number;
  depth: number;
  height: number;
  children?: HierarchyNode[];
  parent?: HierarchyNode;
  data: any;
}

/**
 * Props for the TreeMap component
 */
export interface TreeMapProps {
  /**
   * The data for the treemap
   */
  data: any;
  /**
   * Key to access the unique identifier for each node
   */
  idKey: string;
  /**
   * Key to access the value for each node
   */
  valueKey: string;
  /**
   * Key to access the name for each node
   */
  nameKey: string;
  /**
   * Key to access the children for each node
   */
  childrenKey: string;
  /**
   * The title of the treemap
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
   * The margin around the chart
   */
  margin?: { top: number; right: number; bottom: number; left: number };
  /**
   * An array of colors to use for the treemap
   */
  colors?: string[];
  /**
   * The field to color the treemap by
   */
  colorBy?: string;
  /**
   * Whether to show labels on the treemap
   * @default true
   */
  showLabels?: boolean;
  /**
   * The minimum size of a node to show a label
   */
  labelMinSize?: number;
  /**
   * Function to format the label text
   */
  labelFormat?: (d: any) => string;
  /**
   * Function to format the tooltip text
   */
  tooltipFormat?: (d: any) => string;
  /**
   * Padding between treemap nodes
   */
  padding?: number;
  /**
   * Border width of treemap nodes
   */
  borderWidth?: number;
  /**
   * Border color of treemap nodes
   */
  borderColor?: string;
  /**
   * Maximum depth to display in the treemap
   */
  maxDepth?: number;
  /**
   * Tiling method for the treemap
   */
  tiling?: string;
  /**
   * Callback function for when a node is clicked
   */
  onNodeClick?: (d: any) => void;
  /**
   * Additional CSS class name
   */
  className?: string;
    /**
   * Currency code for formatting values
   */
  currencyCode?: string;
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
export const ChartSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

/**
 * Styled text component for node labels
 */
export const NodeLabel = styled.text<{ fill: string }>`
  font-size: 12px;
  font-weight: 500;
  fill: ${props => props.fill || '#ffffff'};
  pointer-events: none;
  user-select: none;
`;

/**
 * A treemap component for visualizing hierarchical data
 * @param {TreeMapProps} props - The component props
 * @returns {JSX.Element} Rendered treemap component
 */
const TreeMap: React.FC<TreeMapProps> = React.memo((props) => {
  // Destructure props including data, idKey, valueKey, nameKey, childrenKey, title, loading, error, height, width, margin, colors, tooltipFormat, and other configuration options
  const {
    data,
    idKey = 'id',
    valueKey = 'value',
    nameKey = 'name',
    childrenKey = 'children',
    title,
    loading = false,
    error = null,
    isEmpty = false,
    height = 300,
    width,
    margin = { top: 10, right: 10, bottom: 10, left: 10 },
    colors,
    colorBy = 'depth',
    showLabels = true,
    labelMinSize = 30,
    labelFormat,
    tooltipFormat,
    padding = 1,
    borderWidth = 1,
    borderColor = '#ffffff',
    maxDepth = 2,
    tiling = 'squarify',
    onNodeClick,
    className,
    currencyCode = 'USD'
  } = props;

  // Initialize refs for SVG container and tooltip elements
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get current theme colors for styling
  const theme = useTheme();

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

  // Process and format the input data for D3 hierarchical layout
  const hierarchyData = useMemo(() => {
    return processData(data, idKey, valueKey, nameKey, childrenKey);
  }, [data, idKey, valueKey, nameKey, childrenKey]);

  // Create treemap layout using d3.treemap
  const treemapLayout = useMemo(() => {
    return (d3.treemap()
      .size([dimensions.chartWidth, dimensions.chartHeight])
      .padding(padding)
      .tile(d3[tiling as keyof typeof d3] || d3.treemapSquarify)
    );
  }, [dimensions.chartWidth, dimensions.chartHeight, padding, tiling]);

  // Create color scale using d3.scaleOrdinal and provided colors or theme palette
  const colorScale = useMemo(() => {
    return createColorScale(hierarchyData, colors, colorBy, maxDepth);
  }, [hierarchyData, colors, colorBy, maxDepth]);

  // Handle window resize events to make the chart responsive
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && tooltipRef.current) {
        drawChart(svgRef.current, tooltipRef.current, hierarchyData, dimensions, {
          colorScale,
          showLabels,
          labelMinSize,
          labelFormat,
          tooltipFormat,
          borderWidth,
          borderColor,
          onNodeClick,
          currencyCode
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial draw

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [dimensions, hierarchyData, colorScale, showLabels, labelMinSize, labelFormat, tooltipFormat, borderWidth, borderColor, onNodeClick, currencyCode]);

  // Implement tooltip functionality for displaying node data on hover
  const handleTooltip = useCallback((event: React.MouseEvent, datum: any) => {
    if (tooltipRef.current) {
      drawChart(svgRef.current!, tooltipRef.current, hierarchyData, dimensions, {
        colorScale,
        showLabels,
        labelMinSize,
        labelFormat,
        tooltipFormat,
        borderWidth,
        borderColor,
        onNodeClick,
        currencyCode
      });
      handleTooltip(event, tooltipRef.current, datum, { tooltipFormat, currencyCode });
    }
  }, [hierarchyData, dimensions, colorScale, showLabels, labelMinSize, labelFormat, tooltipFormat, borderWidth, borderColor, onNodeClick, currencyCode]);

  // Render chart container with appropriate layout
  return (
    <ChartContainer
      title={title}
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      height={height}
      className={className}
    >
      <Box position="relative" width="100%" height="100%">
        <ChartSvg ref={svgRef} width={dimensions.width} height={dimensions.height} aria-label="Treemap">
        </ChartSvg>
        <TooltipContainer ref={tooltipRef} />
      </Box>
    </ChartContainer>
  );
});

/**
 * Draws the treemap using D3.js
 * @param {SVGSVGElement} svgElement - The SVG element to draw the chart on
 * @param {HTMLDivElement} tooltipElement - The tooltip element to display data
 * @param {any} hierarchyData - The hierarchical data for the treemap
 * @param {object} dimensions - The dimensions of the chart
 * @param {object} config - Configuration options for the chart
 */
const drawChart = (
  svgElement: SVGSVGElement,
  tooltipElement: HTMLDivElement,
  hierarchyData: any,
  dimensions: ChartDimensions,
  config: any
) => {
  // Clear any existing chart elements
  d3.select(svgElement).selectAll('*').remove();

  // Create chart group element with margins applied
  const svg = d3.select(svgElement)
    .attr('width', dimensions.width)
    .attr('height', dimensions.height);

  const chart = svg.append('g')
    .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

  // Create treemap layout with appropriate size and padding
  const treemap = d3.treemap()
    .size([dimensions.chartWidth, dimensions.chartHeight])
    .padding(config.padding);

  // Process hierarchical data with d3.hierarchy
  const root = d3.hierarchy(hierarchyData).sum(d => d.value);

  // Apply treemap layout to the hierarchy data
  treemap(root);

  // Create color scale for nodes
  const color = config.colorScale;

  // Draw treemap cells with appropriate colors
  chart.selectAll('rect')
    .data(root.leaves())
    .enter()
    .append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('fill', d => color(d.data))
    .attr('stroke', config.borderColor)
    .attr('stroke-width', config.borderWidth)
    .on('mousemove', (event: MouseEvent, d: any) => {
      handleTooltip(event, tooltipElement, d, config);
    })
    .on('mouseleave', () => {
      d3.select(tooltipElement)
        .style('opacity', 0)
        .style('visibility', 'hidden');
    })
    .on('click', (event: MouseEvent, d: any) => {
      if (config.onNodeClick) {
        config.onNodeClick(d.data);
      }
    });

  // Draw labels if enabled
  if (config.showLabels) {
    chart.selectAll('text')
      .data(root.leaves())
      .enter()
      .append('text')
      .attr('x', d => (d.x0 + d.x1) / 2)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .text(d => {
        if (d.x1 - d.x0 > config.labelMinSize && d.y1 - d.y0 > config.labelMinSize) {
          return config.labelFormat ? config.labelFormat(d.data) : d.data.name;
        }
        return '';
      })
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', d => getContrastColor(color(d.data)))
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .style('user-select', 'none');
  }

  // Apply accessibility attributes to chart elements
  svg.attr('role', 'img')
    .attr('aria-label', 'Treemap visualization');

  chart.selectAll('rect')
    .attr('tabindex', 0)
    .attr('aria-label', d => `${d.data.name}: ${d.value}`);
};

/**
 * Handles the display of tooltips on hover
 * @param {MouseEvent} event - The mouse event
 * @param {HTMLDivElement} tooltipElement - The tooltip element to display data
 * @param {any} datum - The data for the hovered node
 * @param {object} config - Configuration options for the chart
 */
const handleTooltip = (
  event: MouseEvent,
  tooltipElement: HTMLDivElement,
  datum: any,
  config: any
) => {
  // Get mouse position from event
  const [x, y] = [event.clientX, event.clientY];

  // Format the tooltip content using the node data
  const tooltipText = config.tooltipFormat
    ? config.tooltipFormat(datum.data)
    : `${datum.data.name}: ${formatCurrency(datum.value, config.currencyCode)}`;

  // Position the tooltip near the node
  d3.select(tooltipElement)
    .style('left', (x + 10) + 'px')
    .style('top', (y - 20) + 'px')
    .html(tooltipText)
    .style('opacity', 1)
    .style('visibility', 'visible');
};

/**
 * Processes and formats the input data for D3 hierarchical layout
 * @param {any} rawData - The raw data for the treemap
 * @param {string} idKey - The key for the unique identifier
 * @param {string} valueKey - The key for the value
 * @param {string} nameKey - The key for the name
 * @param {string} childrenKey - The key for the children
 * @returns {any} Processed hierarchical data
 */
const processData = (
  rawData: any,
  idKey: string,
  valueKey: string,
  nameKey: string,
  childrenKey: string
): any => {
  if (!rawData) return null;

  // Ensure all nodes have unique IDs
  const ensureUniqueIds = (data: any[]): void => {
    const idSet = new Set();
    data.forEach(node => {
      if (!node[idKey]) {
        node[idKey] = `node-${Math.random().toString(36).substring(2, 15)}`;
      }
      if (idSet.has(node[idKey])) {
        node[idKey] = `${node[idKey]}-duplicate`;
      }
      idSet.add(node[idKey]);
      if (node[childrenKey] && Array.isArray(node[childrenKey])) {
        ensureUniqueIds(node[childrenKey]);
      }
    });
  };

  // Calculate values for parent nodes based on children if not provided
  const calculateParentValues = (data: any[]): number => {
    let totalValue = 0;
    data.forEach(node => {
      if (node[childrenKey] && Array.isArray(node[childrenKey])) {
        node[valueKey] = calculateParentValues(node[childrenKey]);
      }
      totalValue += node[valueKey];
    });
    return totalValue;
  };

  // Validate input data structure
  if (!Array.isArray(rawData)) {
    console.error('TreeMap data must be an array.');
    return null;
  }

  // Ensure all required keys are present
  const hasRequiredKeys = rawData.every(item => item[idKey] !== undefined && item[valueKey] !== undefined && item[nameKey] !== undefined);
  if (!hasRequiredKeys) {
    console.error('TreeMap data must have idKey, valueKey, and nameKey.');
    return null;
  }

  // Ensure all nodes have unique IDs
  ensureUniqueIds(rawData);

  // Calculate values for parent nodes based on children if not provided
  calculateParentValues(rawData);

  return {
    id: 'root',
    name: 'Root',
    children: rawData,
  };
};

/**
 * Creates a color scale for the treemap nodes
 * @param {any} hierarchyData - The hierarchical data for the treemap
 * @param {string[]} colors - The array of colors to use
 * @param {string} colorBy - The field to color the treemap by
 * @param {number} depth - The maximum depth to display in the treemap
 * @returns {d3.ScaleOrdinal} Color scale function
 */
const createColorScale = (
  hierarchyData: any,
  colors: string[],
  colorBy: string,
  depth: number
): d3.ScaleOrdinal<any, string, never> => {
  // Extract domain values based on colorBy parameter (parent, depth, value, etc.)
  let domainValues: any[];
  if (colorBy === 'parent') {
    domainValues = Array.from(new Set(d3.hierarchy(hierarchyData).leaves().map(d => d.parent?.data?.name)));
  } else if (colorBy === 'depth') {
    domainValues = Array.from({ length: depth + 1 }, (_, i) => i);
  } else if (colorBy === 'value') {
    domainValues = d3.extent(d3.hierarchy(hierarchyData).leaves(), d => d.value);
  } else {
    domainValues = Array.from(new Set(d3.hierarchy(hierarchyData).leaves().map(d => d.data[colorBy])));
  }

  // Use provided colors or generate colors from theme palette
  const colorRange = colors || d3.schemeCategory10;

  // Create ordinal scale mapping domain values to colors
  const color = d3.scaleOrdinal()
    .domain(domainValues)
    .range(colorRange);

  return color;
};

// Set default props for the TreeMap component
TreeMap.defaultProps = {
  loading: false,
  error: null,
  isEmpty: false,
  height: 300,
  margin: { top: 10, right: 10, bottom: 10, left: 10 },
  idKey: 'id',
  valueKey: 'value',
  nameKey: 'name',
  childrenKey: 'children',
  colorBy: 'depth',
  showLabels: true,
  labelMinSize: 30,
  padding: 1,
  borderWidth: 1,
  borderColor: '#ffffff',
  maxDepth: 2,
  tiling: 'squarify',
  currencyCode: 'USD'
};

// Export the TreeMap component
export default TreeMap;

// Export the TreeMapProps interface
export type { TreeMapProps };

// Export the TooltipContainer styled component
export { TooltipContainer };