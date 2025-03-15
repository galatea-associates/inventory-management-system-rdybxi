import React, { useRef, useEffect, useState, useMemo } from 'react'; // react ^18.2
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import * as d3 from 'd3'; // d3 ^7.8
import { Box, useTheme } from '@mui/material'; // @mui/material ^5.13

import ChartContainer from './ChartContainer';
import Typography from '../common/Typography';
import { formatNumber } from '../../utils/formatter';

/**
 * Interface for gauge threshold configuration
 */
interface GaugeThreshold {
  value: number;
  color: string;
  label?: string;
}

/**
 * Props for the Gauge component
 */
interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  thresholds?: Array<{ value: number; color: string; label?: string }>;
  format?: (value: number) => string;
  unit?: string;
  showValue?: boolean;
  showTicks?: boolean;
  tickCount?: number;
  size?: number;
  thickness?: number;
  startAngle?: number;
  endAngle?: number;
  needleStyle?: 'none' | 'arrow' | 'line';
  backgroundColor?: string;
  loading?: boolean;
  error?: Error | string | null;
  className?: string;
}

/**
 * Styled container for the gauge visualization
 */
const GaugeContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
`;

/**
 * Styled SVG element for the gauge
 */
const GaugeSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

/**
 * Styled container for the central value display
 */
const ValueDisplay = styled(Box)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

/**
 * Draws the gauge chart using D3.js
 */
const drawGauge = (
  svgElement: SVGSVGElement,
  value: number,
  scales: any,
  arcs: any,
  config: any
) => {
  // Clear any existing gauge elements
  d3.select(svgElement).selectAll('*').remove();

  // Create gauge group element centered in the SVG
  const gauge = d3.select(svgElement)
    .append('g')
    .attr('transform', `translate(${config.size / 2}, ${config.size / 2})`);

  // Draw background arc
  gauge.append('path')
    .datum({ startAngle: scales.angle(config.min), endAngle: scales.angle(config.max) })
    .style('fill', config.backgroundColor)
    .attr('d', arcs.background);

  // Draw value arc with appropriate color
  gauge.append('path')
    .datum({ startAngle: scales.angle(config.min), endAngle: scales.angle(value) })
    .style('fill', config.valueColor)
    .attr('d', arcs.value);

  // Draw tick marks and labels if enabled
  if (config.showTicks) {
    const ticks = scales.angle.ticks(config.tickCount);

    const tickGroup = gauge.append('g').attr('class', 'ticks');

    tickGroup.selectAll('line')
      .data(ticks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('y1', -config.outerRadius)
      .attr('x2', 0)
      .attr('y2', -config.outerRadius + 5)
      .attr('transform', d => `rotate(${scales.angle(d)})`)
      .style('stroke', 'black');

    tickGroup.selectAll('text')
      .data(ticks)
      .enter()
      .append('text')
      .attr('transform', d => `rotate(${scales.angle(d)}) translate(0, ${-config.outerRadius + 20})`)
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .text(d => d);
  }

  // Add needle indicator if needleStyle is not 'none'
  if (config.needleStyle !== 'none') {
    // Implement needle drawing logic here based on needleStyle
  }

  // Apply transitions for smooth animation
  gauge.transition()
    .duration(750)
    .attrTween('transform', () => d3.interpolateString('translate(0,0)', 'translate(0,0)'));
};

/**
 * Determines the color for the current value based on thresholds
 */
const getColorForValue = (value: number, thresholds: any[], theme: any): string => {
  const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value);

  for (const threshold of sortedThresholds) {
    if (value <= threshold.value) {
      return threshold.color;
    }
  }

  return theme.palette.grey[500]; // Default color
};

/**
 * Creates arc generators for the gauge
 */
const createArcGenerators = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
  const backgroundArc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(startAngle)
    .endAngle(endAngle);

  const valueArc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(startAngle)
    .endAngle(startAngle); // Dynamic end angle

  return {
    background: backgroundArc,
    value: valueArc
  };
};

/**
 * A gauge chart component for visualizing single metric values with thresholds
 */
const Gauge = React.memo<GaugeProps>(({
  value,
  min = 0,
  max = 100,
  title = '',
  thresholds = [{ value: 33, color: 'success.main', label: 'Low' }, { value: 66, color: 'warning.main', label: 'Medium' }, { value: 100, color: 'error.main', label: 'High' }],
  format = (val: number) => formatNumber(val, 0),
  unit = '',
  showValue = true,
  showTicks = true,
  tickCount = 5,
  size = 200,
  thickness = 20,
  startAngle = -135,
  endAngle = 135,
  needleStyle = 'arrow',
  backgroundColor = 'grey.300',
  loading = false,
  error = null,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const theme = useTheme();

  const outerRadius = size / 2;
  const innerRadius = outerRadius - thickness;

  const scales = useMemo(() => ({
    angle: d3.scaleLinear()
      .domain([min, max])
      .range([startAngle * Math.PI / 180, endAngle * Math.PI / 180])
  }), [min, max, startAngle, endAngle, size]);

  const valueColor = useMemo(() => getColorForValue(value, thresholds, theme), [value, thresholds, theme]);

  const arcs = useMemo(() => createArcGenerators(innerRadius, outerRadius, startAngle * Math.PI / 180, endAngle * Math.PI / 180), [innerRadius, outerRadius, startAngle, endAngle]);

  const formattedValue = useMemo(() => format(value), [value, format]);

  useEffect(() => {
    if (svgRef.current) {
      const config = {
        size,
        min,
        max,
        outerRadius,
        innerRadius,
        backgroundColor: theme.palette.grey[300],
        valueColor,
        showTicks,
        tickCount,
        needleStyle
      };
      drawGauge(svgRef.current, value, scales, arcs, config);
    }
  }, [value, scales, arcs, theme, size, min, max, outerRadius, innerRadius, showTicks, tickCount]);

  return (
    <ChartContainer title={title} loading={loading} error={error} className={className}>
      <GaugeContainer>
        <GaugeSvg ref={svgRef} width={size} height={size} aria-label={`Gauge chart showing ${title}`} />
        {showValue && (
          <ValueDisplay>
            <Typography variant="h5">{formattedValue}</Typography>
            {unit && <Typography variant="caption">{unit}</Typography>}
          </ValueDisplay>
        )}
      </GaugeContainer>
    </ChartContainer>
  );
});

Gauge.displayName = 'Gauge';

export default Gauge;

export interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  thresholds?: Array<{ value: number; color: string; label?: string }>;
  format?: (value: number) => string;
  unit?: string;
  showValue?: boolean;
  showTicks?: boolean;
  tickCount?: number;
  size?: number;
  thickness?: number;
  startAngle?: number;
  endAngle?: number;
  needleStyle?: 'none' | 'arrow' | 'line';
  backgroundColor?: string;
  loading?: boolean;
  error?: Error | string | null;
  className?: string;
}

interface GaugeThreshold {
  value: number;
  color: string;
  label?: string;
}

export const GaugeContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
`;