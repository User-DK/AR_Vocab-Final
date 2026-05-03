import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';
import { colors, spacing, borderRadius } from '../styles/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ChartProps {
    data: number[];
    height?: number;
    color?: string;
}

export const LineChart = ({ data, height = 150, color = colors.primary }: ChartProps) => {
    if (!data || data.length < 2) {
        return (
            <View style={[styles.chartPlaceholder, { height }]}>
                <Text style={styles.placeholderText}>Insufficient data for trend</Text>
            </View>
        );
    }

    const width = SCREEN_WIDTH - 80;
    const max = Math.max(...data, 100);
    const min = 0;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / (max - min)) * height;
        return `${x},${y}`;
    });

    const pathContent = `M ${points.join(' L ')}`;

    return (
        <View style={styles.container}>
            <Svg width={width} height={height}>
                {/* Horizontal Grid Lines */}
                {[0, 25, 50, 75, 100].map((tick) => {
                    const y = height - (tick / 100) * height;
                    return <Line key={tick} x1="0" y1={y} x2={width} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />;
                })}

                {/* Trend Line */}
                <Path
                    d={pathContent}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Data Points */}
                {data.map((val, i) => {
                    const [x, y] = points[i].split(',').map(Number);
                    return <Circle key={i} cx={x} cy={y} r="4" fill="white" stroke={color} strokeWidth="2" />;
                })}
            </Svg>
        </View>
    );
};

export const BarChart = ({ data, labels, height = 150 }: { data: number[], labels: string[], height?: number }) => {
    const width = SCREEN_WIDTH - 80;
    const barWidth = (width / data.length) * 0.6;
    const gap = (width / data.length) * 0.4;
    const maxValue = Math.max(...data, 1);

    return (
        <View style={styles.container}>
            <Svg width={width} height={height}>
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                    const y = height - tick * height;
                    return <Line key={tick} x1="0" y1={y} x2={width} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
                })}

                {data.map((val, i) => {
                    const barHeight = (val / maxValue) * height;
                    const x = i * (barWidth + gap) + gap / 2;
                    return (
                        <G key={i}>
                            <Rect
                                x={x}
                                y={height - barHeight}
                                width={barWidth}
                                height={barHeight}
                                fill={colors.gradients.blue[1]}
                                rx={4}
                            />
                            <Circle
                                cx={x + barWidth / 2}
                                cy={height - barHeight}
                                r="3"
                                fill={colors.primary}
                            />
                        </G>
                    );
                })}
            </Svg>
            <View style={[styles.labelRow, { width }]}>
                {labels.map((label, i) => (
                    <Text key={i} style={[styles.labelText, { width: barWidth + gap }]}>{label}</Text>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: spacing.md,
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
        marginTop: 8,
    },
    labelText: {
        fontSize: 10,
        color: '#64748b',
        textAlign: 'center',
    }
});
