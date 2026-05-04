import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Rect, G, Line, Text as SvgText } from 'react-native-svg';
import { colors, spacing, borderRadius } from '../styles/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Space reserved for the Y-axis labels on the left (tick numbers)
const Y_AXIS_WIDTH = 32;
// Space reserved for X-axis labels at the bottom (inside SVG)
const X_AXIS_HEIGHT = 20;
// Top padding so the '100' label + top circle aren't clipped
const TOP_PAD = 10;

interface ChartProps {
    data: number[];
    height?: number;
    color?: string;
}

// ─── Y-axis tick values for the line chart (0, 25, 50, 75, 100) ──────────────
const Y_TICKS = [0, 25, 50, 75, 100];

export const LineChart = ({ data, height = 160, color = colors.primary }: ChartProps) => {
    if (!data || data.length < 2) {
        return (
            <View style={[styles.chartPlaceholder, { height }]}>
                <Text style={styles.placeholderText}>Insufficient data for trend</Text>
            </View>
        );
    }

    // Total SVG canvas width (including left Y-axis gutter)
    const totalWidth = SCREEN_WIDTH - 64;
    // Actual plot area (excluding Y-axis gutter and right padding)
    const plotWidth  = totalWidth - Y_AXIS_WIDTH - 8;
    // Total SVG canvas height (including bottom X-axis gutter + top pad)
    const totalHeight = height + X_AXIS_HEIGHT + TOP_PAD;
    // Actual plot area height (baseline sits at TOP_PAD + height)
    const plotHeight  = height + TOP_PAD;

    const max = 100;
    const min = 0;
    // Usable plot height after reserving top padding for the 100 label
    const drawHeight = plotHeight - TOP_PAD;

    // Map data → SVG coords within the plot area (offset by Y_AXIS_WIDTH + TOP_PAD)
    const points = data.map((val, i) => {
        const x = Y_AXIS_WIDTH + (i / (data.length - 1)) * plotWidth;
        const y = TOP_PAD + drawHeight - ((val - min) / (max - min)) * drawHeight;
        return { x, y, val };
    });

    const pathContent = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

    return (
        <View style={styles.chartWrapper}>
            {/* Y-axis title (rotated) */}
            <View style={styles.yAxisLabelContainer}>
                <Text style={styles.yAxisTitle}>Score (%)</Text>
            </View>

            <View style={{ flex: 1 }}>
                <Svg width={totalWidth} height={totalHeight}>
                    {/* ── Y-axis grid lines + tick labels ── */}
                    {Y_TICKS.map((tick) => {
                        // Use same formula as data points so grid aligns exactly
                        const drawH = plotHeight - TOP_PAD;
                        const y = TOP_PAD + drawH - (tick / 100) * drawH;
                        return (
                            <G key={tick}>
                                {/* Dashed grid line */}
                                <Line
                                    x1={Y_AXIS_WIDTH}
                                    y1={y}
                                    x2={totalWidth - 4}
                                    y2={y}
                                    stroke="#e2e8f0"
                                    strokeWidth="1"
                                    strokeDasharray="4,4"
                                />
                                {/* Y-axis tick mark */}
                                <Line
                                    x1={Y_AXIS_WIDTH - 4}
                                    y1={y}
                                    x2={Y_AXIS_WIDTH}
                                    y2={y}
                                    stroke="#94a3b8"
                                    strokeWidth="1"
                                />
                                {/* Y-axis tick label */}
                                <SvgText
                                    x={Y_AXIS_WIDTH - 6}
                                    y={y + 4}
                                    fontSize="9"
                                    fill="#64748b"
                                    textAnchor="end"
                                >
                                    {tick}
                                </SvgText>
                            </G>
                        );
                    })}

                    {/* ── Y axis line (starts at TOP_PAD so it aligns with the 100 gridline) ── */}
                    <Line
                        x1={Y_AXIS_WIDTH}
                        y1={TOP_PAD}
                        x2={Y_AXIS_WIDTH}
                        y2={plotHeight}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* ── X axis line ── */}
                    <Line
                        x1={Y_AXIS_WIDTH}
                        y1={plotHeight}
                        x2={totalWidth - 4}
                        y2={plotHeight}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* ── X-axis tick labels (attempt numbers) ── */}
                    {points.map((p, i) => (
                        <G key={`xt-${i}`}>
                            {/* tick mark */}
                            <Line
                                x1={p.x}
                                y1={plotHeight}
                                x2={p.x}
                                y2={plotHeight + 4}
                                stroke="#94a3b8"
                                strokeWidth="1"
                            />
                            {/* label — show every label if ≤ 5 points, else every other */}
                            {(data.length <= 5 || i % 2 === 0) && (
                                <SvgText
                                    x={p.x}
                                    y={plotHeight + X_AXIS_HEIGHT - 2}
                                    fontSize="9"
                                    fill="#64748b"
                                    textAnchor="middle"
                                >
                                    {i + 1}
                                </SvgText>
                            )}
                        </G>
                    ))}

                    {/* ── Trend line ── */}
                    <Path
                        d={pathContent}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* ── Data point circles ── */}
                    {points.map((p, i) => (
                        <Circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
                    ))}
                </Svg>

                {/* X-axis title */}
                <Text style={styles.xAxisTitle}>Attempt No.</Text>
            </View>
        </View>
    );
};

// ─── Bar Chart ────────────────────────────────────────────────────────────────

export const BarChart = ({ data, labels, height = 160 }: { data: number[], labels: string[], height?: number }) => {
    if (!data || data.length === 0) {
        return (
            <View style={[styles.chartPlaceholder, { height }]}>
                <Text style={styles.placeholderText}>No data available</Text>
            </View>
        );
    }

    const totalWidth  = SCREEN_WIDTH - 64;
    const plotWidth   = totalWidth - Y_AXIS_WIDTH - 8;
    const totalHeight = height + X_AXIS_HEIGHT;
    const plotHeight  = height;

    const maxValue  = Math.max(...data, 1);
    const barSlot   = plotWidth / data.length;
    const barWidth  = barSlot * 0.55;
    const barOffset = barSlot * 0.225; // center bar within slot

    // Y-axis ticks for bar chart (evenly spaced up to maxValue)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxValue));

    return (
        <View style={styles.chartWrapper}>
            {/* Y-axis title */}
            <View style={styles.yAxisLabelContainer}>
                <Text style={styles.yAxisTitle}>Attempts</Text>
            </View>

            <View style={{ flex: 1 }}>
                <Svg width={totalWidth} height={totalHeight}>
                    {/* ── Y-axis grid lines + tick labels ── */}
                    {yTicks.map((tick, idx) => {
                        const y = plotHeight - (tick / maxValue) * plotHeight;
                        return (
                            <G key={idx}>
                                <Line
                                    x1={Y_AXIS_WIDTH}
                                    y1={y}
                                    x2={totalWidth - 4}
                                    y2={y}
                                    stroke="#e2e8f0"
                                    strokeWidth="1"
                                />
                                <Line
                                    x1={Y_AXIS_WIDTH - 4}
                                    y1={y}
                                    x2={Y_AXIS_WIDTH}
                                    y2={y}
                                    stroke="#94a3b8"
                                    strokeWidth="1"
                                />
                                <SvgText
                                    x={Y_AXIS_WIDTH - 6}
                                    y={y + 4}
                                    fontSize="9"
                                    fill="#64748b"
                                    textAnchor="end"
                                >
                                    {tick}
                                </SvgText>
                            </G>
                        );
                    })}

                    {/* ── Y axis line ── */}
                    <Line
                        x1={Y_AXIS_WIDTH}
                        y1={0}
                        x2={Y_AXIS_WIDTH}
                        y2={plotHeight}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* ── X axis line ── */}
                    <Line
                        x1={Y_AXIS_WIDTH}
                        y1={plotHeight}
                        x2={totalWidth - 4}
                        y2={plotHeight}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                    />

                    {/* ── Bars + X tick marks ── */}
                    {data.map((val, i) => {
                        const barH = (val / maxValue) * plotHeight;
                        const x    = Y_AXIS_WIDTH + i * barSlot + barOffset;
                        const cx   = x + barWidth / 2;
                        return (
                            <G key={i}>
                                <Rect
                                    x={x}
                                    y={plotHeight - barH}
                                    width={barWidth}
                                    height={barH}
                                    fill={colors.gradients.blue[1]}
                                    rx={4}
                                />
                                <Circle
                                    cx={cx}
                                    cy={plotHeight - barH}
                                    r="3"
                                    fill={colors.primary}
                                />
                                {/* X tick mark */}
                                <Line
                                    x1={cx}
                                    y1={plotHeight}
                                    x2={cx}
                                    y2={plotHeight + 4}
                                    stroke="#94a3b8"
                                    strokeWidth="1"
                                />
                            </G>
                        );
                    })}
                </Svg>

                {/* ── X-axis word labels (below SVG to allow wrapping) ── */}
                <View style={[styles.labelRow, { width: totalWidth, paddingLeft: Y_AXIS_WIDTH }]}>
                    {labels.map((label, i) => (
                        <Text
                            key={i}
                            style={[styles.labelText, { width: barSlot }]}
                            numberOfLines={1}
                        >
                            {label}
                        </Text>
                    ))}
                </View>

                {/* X-axis title */}
                <Text style={styles.xAxisTitle}>Word</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    chartWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    yAxisLabelContainer: {
        // Tight width — the rotated text visually occupies chart height, not this width
        width: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    yAxisTitle: {
        fontSize: 9,
        color: '#64748b',
        fontWeight: '600',
        letterSpacing: 0.4,
        // Rotate the label so it reads bottom-to-top
        transform: [{ rotate: '-90deg' }],
        // Width here sets the 'height' of the rotated text block — enough to span the chart
        width: 55,
        textAlign: 'center',
    },
    xAxisTitle: {
        fontSize: 9,
        color: '#64748b',
        fontWeight: '600',
        letterSpacing: 0.4,
        textAlign: 'center',
        marginTop: 2,
    },
    chartPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
    },
    placeholderText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    labelRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    labelText: {
        fontSize: 9,
        color: '#64748b',
        textAlign: 'center',
    },
});
