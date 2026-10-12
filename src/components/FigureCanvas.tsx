import React from 'react';
import type {
  AllowedChart,
  FigurePaletteId,
  FigureStyleConfig,
  FullAnalysisResult,
} from '../lib/contracts';
import { studentTCritical95 } from '../lib/scientificEngine';

interface FigureCanvasProps {
  svgRef?: React.RefObject<SVGSVGElement | null>;
  chartKind: AllowedChart;
  result: FullAnalysisResult;
  styleConfig: FigureStyleConfig;
  datasetName: string;
  sha256Short: string;
}

const PALETTES: Record<
  FigurePaletteId,
  { primary: string; secondary: string; accent: string; line: string }
> = {
  navy_teal: {
    primary: '#10233F',
    secondary: '#0F766E',
    accent: '#2563EB',
    line: '#0F766E',
  },
  slate_gold: {
    primary: '#1E293B',
    secondary: '#B45309',
    accent: '#475569',
    line: '#B45309',
  },
  monochrome_ink: {
    primary: '#111827',
    secondary: '#4B5563',
    accent: '#374151',
    line: '#111827',
  },
};

function deterministicJitter(sampleId: string, index: number): number {
  let hash = 2166136261 ^ index;
  for (let i = 0; i < sampleId.length; i++) {
    hash ^= sampleId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = ((hash >>> 0) % 1000) / 1000;
  return (normalized - 0.5) * 34; // [-17px, +17px]
}

export const FigureCanvas: React.FC<FigureCanvasProps> = ({
  svgRef,
  chartKind,
  result,
  styleConfig,
  datasetName,
  sha256Short,
}) => {
  const width = 760;
  const height = 460;
  const margin = { top: 68, right: 44, bottom: 78, left: 78 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const palette = PALETTES[styleConfig.palette] ?? PALETTES.navy_teal;
  const points = result.points;

  const yValues = points.map((p) => p.yValue);
  const rawYMin = yValues.length > 0 ? Math.min(...yValues) : 0;
  const rawYMax = yValues.length > 0 ? Math.max(...yValues) : 10;
  const ySpan = rawYMax - rawYMin || Math.abs(rawYMax) * 0.2 || 1;

  const defaultYMin = rawYMin - ySpan * 0.14;
  const defaultYMax = rawYMax + ySpan * 0.16;

  const yMin =
    styleConfig.yAxisMin !== undefined &&
    styleConfig.yAxisMin !== null &&
    Number.isFinite(styleConfig.yAxisMin)
      ? styleConfig.yAxisMin
      : defaultYMin;
  const yMax =
    styleConfig.yAxisMax !== undefined &&
    styleConfig.yAxisMax !== null &&
    Number.isFinite(styleConfig.yAxisMax) &&
    styleConfig.yAxisMax > yMin
      ? styleConfig.yAxisMax
      : defaultYMax;

  const truncatedPointCount = points.filter(
    (p) => p.yValue < yMin || p.yValue > yMax
  ).length;

  const scaleY = (val: number): number => {
    const ratio = (val - yMin) / (yMax - yMin || 1);
    const clamped = Math.max(0, Math.min(1, ratio));
    return margin.top + plotH - clamped * plotH;
  };

  const yTicks = Array.from({ length: 6 }, (_, i) => {
    const v = yMin + ((yMax - yMin) * i) / 5;
    return { value: v, y: scaleY(v) };
  });

  const groupColors = [palette.primary, palette.secondary, palette.accent];

  // Numeric X values for scatter / time_series
  const numericXPoints = points.map((p, idx) => ({
    ...p,
    numX:
      typeof p.xValue === 'number' && Number.isFinite(p.xValue)
        ? p.xValue
        : idx + 1,
  }));
  const xVals = numericXPoints.map((p) => p.numX);
  const rawXMin = xVals.length > 0 ? Math.min(...xVals) : 0;
  const rawXMax = xVals.length > 0 ? Math.max(...xVals) : 10;
  const xSpan = rawXMax - rawXMin || 1;
  const xMin = rawXMin - xSpan * 0.08;
  const xMax = rawXMax + xSpan * 0.08;

  const scaleXNumeric = (val: number): number => {
    const ratio = (val - xMin) / (xMax - xMin || 1);
    return margin.left + Math.max(0, Math.min(1, ratio)) * plotW;
  };

  const xTicksNumeric = Array.from({ length: 6 }, (_, i) => {
    const v = xMin + ((xMax - xMin) * i) / 5;
    return { value: v, x: scaleXNumeric(v) };
  });

  // Compute linear regression line for scatter if >= 2 points
  let regressionSegment: { x1: number; y1: number; x2: number; y2: number } | null =
    null;
  if (chartKind === 'scatter' && numericXPoints.length >= 2) {
    const n = numericXPoints.length;
    const meanX = xVals.reduce((a, b) => a + b, 0) / n;
    const meanY = yValues.reduce((a, b) => a + b, 0) / n;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (xVals[i] - meanX) ** 2;
      sxy += (xVals[i] - meanX) * (yValues[i] - meanY);
    }
    if (sxx > 0) {
      const slope = sxy / sxx;
      const intercept = meanY - slope * meanX;
      const rx1 = rawXMin;
      const rx2 = rawXMax;
      regressionSegment = {
        x1: scaleXNumeric(rx1),
        y1: scaleY(intercept + slope * rx1),
        x2: scaleXNumeric(rx2),
        y2: scaleY(intercept + slope * rx2),
      };
    }
  }

  const orderedPoints =
    chartKind === 'time_series'
      ? [...numericXPoints].sort((a, b) => a.numX - b.numX)
      : numericXPoints;

  const yAxisTitle = styleConfig.unit
    ? `${styleConfig.yLabel} (${styleConfig.unit})`
    : styleConfig.yLabel;

  return (
    <div className="space-y-2">
      {truncatedPointCount > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 px-3.5 py-2 text-xs text-[#B45309] font-medium">
          Axis Truncation Warning: Custom Y-axis bounds [{yMin.toFixed(2)},{' '}
          {yMax.toFixed(2)}] clip {truncatedPointCount} raw observation(s). Reset axis bounds to inspect all data points honestly.
        </div>
      )}

      <div className="bg-white border border-[#E3E9EE] rounded-2xl p-3 sm:p-4 shadow-xs overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="auto"
          role="img"
          aria-label={styleConfig.title}
          xmlns="http://www.w3.org/2000/svg"
          style={{
            fontFamily:
              "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            backgroundColor: '#FFFFFF',
          }}
        >
          <rect width={width} height={height} fill="#FFFFFF" rx={12} />

          {/* Title & Subtitle */}
          <text
            x={margin.left}
            y={30}
            fill="#10233F"
            fontSize={16}
            fontWeight={700}
          >
            {styleConfig.title}
          </text>
          <text
            x={margin.left}
            y={49}
            fill="#536579"
            fontSize={11.5}
            fontFamily="'JetBrains Mono', monospace"
          >
            {styleConfig.subtitle}
          </text>

          {/* Horizontal Gridlines & Y-Axis Ticks */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#E3E9EE"
                strokeDasharray={idx === 0 ? undefined : '3 3'}
                strokeWidth={1}
              />
              <text
                x={margin.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                fill="#536579"
                fontSize={11}
                fontFamily="'JetBrains Mono', monospace"
              >
                {tick.value.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Left Y-Axis Spine */}
          <line
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={margin.top + plotH}
            stroke="#10233F"
            strokeWidth={1.5}
          />
          {/* Bottom X-Axis Spine */}
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={margin.top + plotH}
            y2={margin.top + plotH}
            stroke="#10233F"
            strokeWidth={1.5}
          />

          {/* Y-Axis Label */}
          <text
            transform={`translate(22, ${margin.top + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            fill="#10233F"
            fontSize={12.5}
            fontWeight={600}
          >
            {yAxisTitle}
          </text>

          {/* X-Axis Label */}
          <text
            x={margin.left + plotW / 2}
            y={height - 24}
            textAnchor="middle"
            fill="#10233F"
            fontSize={12.5}
            fontWeight={600}
          >
            {styleConfig.xLabel}
          </text>

          {/* Grouped Points Chart */}
          {chartKind === 'grouped_points' &&
            result.groupSummaries.map((groupSum, gIdx) => {
              const groupCount = Math.max(1, result.groupSummaries.length);
              const groupCenter =
                margin.left + ((gIdx + 0.5) * plotW) / groupCount;
              const color = groupColors[gIdx % groupColors.length];
              const groupPoints = points.filter(
                (p) => p.group === groupSum.group
              );

              // Compute 95% CI half-width if n >= 2 and sd !== null
              let ciHalfWidth = 0;
              if (
                groupSum.n_valid >= 2 &&
                groupSum.sd !== null &&
                groupSum.mean !== null
              ) {
                const se = groupSum.sd / Math.sqrt(groupSum.n_valid);
                const tCrit = studentTCritical95(groupSum.n_valid - 1);
                ciHalfWidth = tCrit * se;
              }

              return (
                <g key={groupSum.group} data-group={groupSum.group}>
                  {/* Category X-axis tick & label */}
                  <line
                    x1={groupCenter}
                    x2={groupCenter}
                    y1={margin.top + plotH}
                    y2={margin.top + plotH + 6}
                    stroke="#10233F"
                    strokeWidth={1.5}
                  />
                  <text
                    x={groupCenter}
                    y={margin.top + plotH + 22}
                    textAnchor="middle"
                    fill="#10233F"
                    fontSize={12}
                    fontWeight={600}
                  >
                    {groupSum.group} (n={groupSum.n_valid})
                  </text>

                  {/* 95% CI Error Bar */}
                  {styleConfig.showErrorBars &&
                    groupSum.mean !== null &&
                    ciHalfWidth > 0 && (
                      <g data-element="group-ci95">
                        <line
                          x1={groupCenter + 28}
                          x2={groupCenter + 28}
                          y1={scaleY(groupSum.mean + ciHalfWidth)}
                          y2={scaleY(groupSum.mean - ciHalfWidth)}
                          stroke={color}
                          strokeWidth={2.2}
                        />
                        <line
                          x1={groupCenter + 21}
                          x2={groupCenter + 35}
                          y1={scaleY(groupSum.mean + ciHalfWidth)}
                          y2={scaleY(groupSum.mean + ciHalfWidth)}
                          stroke={color}
                          strokeWidth={2.2}
                        />
                        <line
                          x1={groupCenter + 21}
                          x2={groupCenter + 35}
                          y1={scaleY(groupSum.mean - ciHalfWidth)}
                          y2={scaleY(groupSum.mean - ciHalfWidth)}
                          stroke={color}
                          strokeWidth={2.2}
                        />
                      </g>
                    )}

                  {/* Group Mean Bar + Diamond */}
                  {styleConfig.showGroupMeans && groupSum.mean !== null && (
                    <g data-element="group-mean">
                      <line
                        x1={groupCenter - 24}
                        x2={groupCenter + 24}
                        y1={scaleY(groupSum.mean)}
                        y2={scaleY(groupSum.mean)}
                        stroke={color}
                        strokeWidth={2.8}
                      />
                      <circle
                        cx={groupCenter + 28}
                        cy={scaleY(groupSum.mean)}
                        r={4.5}
                        fill="#FFFFFF"
                        stroke={color}
                        strokeWidth={2.5}
                      />
                    </g>
                  )}

                  {/* Raw Observations */}
                  {styleConfig.showRawPoints &&
                    groupPoints.map((pt, pIdx) => {
                      const jitter = deterministicJitter(pt.sampleId, pIdx);
                      const cx = groupCenter - 6 + jitter;
                      const cy = scaleY(pt.yValue);
                      return (
                        <circle
                          key={`${pt.sampleId}-${pt.rowIndex}`}
                          data-sample-id={pt.sampleId}
                          data-group={pt.group}
                          data-value={pt.yValue}
                          cx={cx}
                          cy={cy}
                          r={5.2}
                          fill={color}
                          fillOpacity={0.82}
                          stroke="#FFFFFF"
                          strokeWidth={1.4}
                        >
                          <title>
                            {`${pt.sampleId} (${pt.group}): ${pt.yValue} ${pt.unit}`}
                          </title>
                        </circle>
                      );
                    })}
                </g>
              );
            })}

          {/* Scatterplot & Time-Series Numeric X Ticks */}
          {(chartKind === 'scatter' || chartKind === 'time_series') &&
            xTicksNumeric.map((tick, idx) => (
              <g key={idx}>
                <line
                  x1={tick.x}
                  x2={tick.x}
                  y1={margin.top + plotH}
                  y2={margin.top + plotH + 6}
                  stroke="#10233F"
                  strokeWidth={1.2}
                />
                <text
                  x={tick.x}
                  y={margin.top + plotH + 21}
                  textAnchor="middle"
                  fill="#536579"
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {tick.value.toFixed(1)}
                </text>
              </g>
            ))}

          {/* Scatter Regression Trend Line */}
          {chartKind === 'scatter' &&
            styleConfig.showGroupMeans &&
            regressionSegment && (
              <line
                x1={regressionSegment.x1}
                y1={regressionSegment.y1}
                x2={regressionSegment.x2}
                y2={regressionSegment.y2}
                stroke={palette.line}
                strokeWidth={2.2}
                strokeDasharray="6 4"
                data-element="ols-trend-line"
              />
            )}

          {/* Time-Series Connecting Polyline */}
          {chartKind === 'time_series' && orderedPoints.length >= 2 && (
            <polyline
              fill="none"
              stroke={palette.line}
              strokeWidth={2.4}
              points={orderedPoints
                .map((p) => `${scaleXNumeric(p.numX)},${scaleY(p.yValue)}`)
                .join(' ')}
              data-element="time-series-line"
            />
          )}

          {/* Raw Points for Scatter / Time-Series */}
          {(chartKind === 'scatter' || chartKind === 'time_series') &&
            styleConfig.showRawPoints &&
            orderedPoints.map((pt) => (
              <circle
                key={`${pt.sampleId}-${pt.rowIndex}`}
                data-sample-id={pt.sampleId}
                data-x={pt.numX}
                data-value={pt.yValue}
                cx={scaleXNumeric(pt.numX)}
                cy={scaleY(pt.yValue)}
                r={5.2}
                fill={palette.primary}
                fillOpacity={0.86}
                stroke="#FFFFFF"
                strokeWidth={1.4}
              >
                <title>
                  {`${pt.sampleId}: (${pt.numX}, ${pt.yValue} ${pt.unit})`}
                </title>
              </circle>
            ))}

          {/* Footer Provenance Stamp */}
          <text
            x={margin.left}
            y={height - 6}
            fill="#536579"
            fontSize={9.5}
            fontFamily="'JetBrains Mono', monospace"
          >
            {`EvidencePlot AI · Source: ${datasetName} (SHA-256 ${sha256Short}…) · Plotted n=${points.length} · Method: ${result.method}`}
          </text>
        </svg>
      </div>
    </div>
  );
};
