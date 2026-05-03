import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { NavigationProps } from '../types/navigation';
import Card from '../components/Card';
import { LineChart, BarChart } from '../components/AnalyticsCharts';
import { speechAssessmentEngine, ClinicalReport } from '../utils/speechAssessment';
import {
    colors,
    typography,
    spacing,
    borderRadius,
} from '../styles/constants';

import Share from 'react-native-share';
import { generatePDF as createPDF } from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';

export default function ClinicalReportScreen({ navigation }: NavigationProps) {
    const [report, setReport] = useState<ClinicalReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        const data = await speechAssessmentEngine.getClinicalReport();
        setReport(data);
        setLoading(false);
    };

    const generatePDF = async () => {
        if (!report) return;
        setGenerating(true);
        console.log('[ClinicalReport] Starting PDF generation...');
        try {
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1f2937; }
                        .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
                        .title { font-size: 28px; color: #111827; margin: 0; }
                        .date { color: #6b7280; font-size: 14px; margin-top: 5px; }
                        .summary-box { background: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 30px; display: flex; align-items: center; }
                        .score { font-size: 48px; font-weight: bold; color: #6366f1; margin-right: 30px; }
                        .insight { flex: 1; }
                        .section-title { font-size: 18px; font-weight: bold; color: #111827; border-left: 4px solid #6366f1; padding-left: 10px; margin: 25px 0 15px 0; }
                        .grid { display: flex; justify-content: space-between; }
                        .col { width: 48%; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
                        .list-item { margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; }
                        .dot { margin-right: 8px; font-weight: bold; }
                        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 class="title">Clinical Speech Assessment</h1>
                        <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
                    </div>
                    
                    <div class="summary-box">
                        <div class="score">${report.overallAccuracy || 0}%</div>
                        <div class="insight">
                            <strong>Current Standing:</strong> ${report.userStanding}<br/>
                            <strong>Therapy Insight:</strong><br/>
                            ${report.clinicalNote}
                        </div>
                    </div>

                    <div class="section-title">Response Efficiency (Time-per-Level)</div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                        <tr style="background: #f8fafc;">
                            <th style="text-align: left; padding: 10px; border: 1px solid #e5e7eb;">Difficulty</th>
                            <th style="text-align: left; padding: 10px; border: 1px solid #e5e7eb;">Average Time</th>
                        </tr>
                        ${report.responseTimeByLevel.map(l => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-transform: capitalize;">${l.level}</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">${l.avgTime > 0 ? l.avgTime + 's' : '---'}</td>
                            </tr>
                        `).join('')}
                    </table>

                    <div class="section-title">Curriculum Mastery</div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                        ${report.curriculumMastery.map(m => {
                            // I5 FIX: Use pixel widths — webkit WebView in react-native-html-to-pdf
                            // may collapse percentage widths inside position:relative containers to 0.
                            const barPx = Math.round((m.percentage / 100) * 400);
                            return `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; width: 30%; font-size: 14px;">${m.name}</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                                    <div style="background: #f1f5f9; height: 12px; border-radius: 6px; width: 400px;">
                                        <div style="background: #6366f1; height: 12px; border-radius: 6px; width: ${barPx}px;"></div>
                                    </div>
                                    <span style="font-size: 10px; color: #6b7280; font-weight: bold;">${m.percentage}%</span>
                                </td>
                            </tr>`;
                        }).join('')}
                    </table>

                    <div class="section-title">Earned Achievements</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px;">
                        ${report.badges.map(b => `
                            <div style="background: #e0e7ff; color: #4338ca; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid #c7d2fe;">
                                🏆 ${b.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </div>
                        `).join('')}
                        ${report.badges.length === 0 ? '<div style="color: #9ca3af; font-style: italic;">No specific badges earned yet.</div>' : ''}
                    </div>

                    <div class="section-title">Performance Breakdown</div>
                    <div class="grid">
                        <div class="col">
                            <strong>Strengths:</strong>
                            ${report.phoneticStrength.map(s => `<div class="list-item"><span class="dot">✓</span> ${s}</div>`).join('')}
                        </div>
                        <div class="col">
                            <strong>Areas for Growth:</strong>
                            ${report.phoneticWeakness.map(w => `<div class="list-item"><span class="dot">!</span> ${w}</div>`).join('')}
                        </div>
                    </div>

                    <div class="section-title">Challenging Vocabulary</div>
                    <p>The following words had the highest frequency of attempts, indicating specific phonological challenges:</p>
                    <ul>
                        ${report.mostAttemptedWords.map(w => `<li><strong>${w.word}</strong>: ${w.count} attempts</li>`).join('')}
                    </ul>

                    <div class="footer">
                        Generated by AR-Vocab Clinical Analytics System<br/>
                        Clinical Grade Speech Progression Tracking
                    </div>
                </body>
                </html>
            `;

            const options = {
                html,
                fileName: `ClinicalReport_${new Date().getTime()}`,
            };

            const file = await createPDF(options);
            console.log('[ClinicalReport] PDF Result:', file);

            if (file && file.filePath) {
                const exists = await RNFS.exists(file.filePath);
                console.log('[ClinicalReport] File exists at', file.filePath, ':', exists);

                const sharePath = file.filePath.startsWith('file://') ? file.filePath : `file://${file.filePath}`;
                console.log('[ClinicalReport] Sharing path:', sharePath);

                await Share.open({
                    url: sharePath,
                    type: 'application/pdf',
                    title: 'Clinical Speech Report',
                    failOnCancel: false,
                });
            } else {
                console.warn('[ClinicalReport] No filePath returned or result is null');
            }
        } catch (error: any) {
            console.error('PDF Generation Error:', error);
            // Extra info if available
            if (error.stack) console.error(error.stack);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // I3 FIX: Guard against null/empty report — show a friendly empty state
    // so the ScrollView doesn't try to render charts with no data.
    if (!report || (report.attempts === 0 && report.improvementTrend.length === 0)) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.background}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-back" size={28} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Clinical Report</Text>
                        <View style={{ width: 36 }} />
                    </View>
                    <View style={styles.emptyStateContainer}>
                        <Icon name="bar-chart-outline" size={64} color={colors.mutedForeground} />
                        <Text style={styles.emptyStateTitle}>No Session Data Yet</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Complete at least one speech assessment to generate a clinical report.
                        </Text>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.buttonText}>Start Practising</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.background}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="chevron-back" size={28} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Clinical Report</Text>
                    <TouchableOpacity style={styles.exportButton} onPress={generatePDF}>
                        <Icon name="share-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Summary Score */}
                    <Card style={styles.summaryCard}>
                        <View style={styles.scoreCircle}>
                            <Text style={styles.scoreText}>{report?.overallAccuracy || 0}%</Text>
                            <Text style={styles.scoreLabel}>Accuracy</Text>
                        </View>
                        <View style={styles.summaryTextContainer}>
                            <Text style={styles.summaryTitle}>Therapy Insight</Text>
                            <Text style={styles.summaryNote}>{report?.clinicalNote}</Text>
                        </View>
                    </Card>

                    {/* Trend Chart */}
                    <Card style={styles.chartCard}>
                        <Text style={styles.cardTitle}>Phonetic Improvement Trend</Text>
                        <LineChart data={report?.improvementTrend || []} />
                        <Text style={styles.chartFooter}>Phonetic Accuracy (%) over last 10 attempts</Text>
                    </Card>

                    {/* Milestone Standing */}
                    <Card style={styles.standingCard}>
                        <Icon name="medal" size={32} color={colors.primary} />
                        <View style={{ marginLeft: 16 }}>
                            <Text style={styles.standingLabel}>Miliestone Achievement</Text>
                            <Text style={styles.standingValue}>{report?.userStanding}</Text>
                        </View>
                    </Card>

                    {/* Response Efficiency */}
                    <Card style={styles.chartCard}>
                        <Text style={styles.cardTitle}>Response Efficiency (Avg Time)</Text>
                        <View style={styles.efficiencyGrid}>
                            {report?.responseTimeByLevel.map((l, i) => (
                                <View key={i} style={styles.efficiencyItem}>
                                    <Text style={styles.efficiencyLevel}>{l.level}</Text>
                                    <View style={styles.efficiencyBox}>
                                        <Text style={styles.efficiencyTime}>{l.avgTime > 0 ? l.avgTime + 's' : '---'}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Card>

                    {/* Most Attempted Chart */}
                    <Card style={styles.chartCard}>
                        <Text style={styles.cardTitle}>Most Challenging Vocabulary</Text>
                        <BarChart
                            data={report?.mostAttemptedWords.map(w => w.count) || []}
                            labels={report?.mostAttemptedWords.map(w => w.word) || []}
                        />
                    </Card>

                    {/* Strengths & Weaknesses */}
                    <View style={styles.row}>
                        <View style={[styles.halfCard, { borderLeftColor: colors.accent, borderLeftWidth: 4 }]}>
                            <Card style={styles.cardInner}>
                                <Text style={styles.cardTitle}>Strengths</Text>
                                {report?.phoneticStrength.map((s, i) => (
                                    <View key={i} style={styles.bulletRow}>
                                        <Icon name="checkmark-circle" size={16} color={colors.accent} />
                                        <Text style={styles.bulletText}>{s}</Text>
                                    </View>
                                ))}
                            </Card>
                        </View>
                        <View style={[styles.halfCard, { borderLeftColor: colors.secondary, borderLeftWidth: 4 }]}>
                            <Card style={styles.cardInner}>
                                <Text style={styles.cardTitle}>Areas for Growth</Text>
                                {report?.phoneticWeakness.map((s, i) => (
                                    <View key={i} style={styles.bulletRow}>
                                        <Icon name="alert-circle" size={16} color={colors.secondary} />
                                        <Text style={styles.bulletText}>{s}</Text>
                                    </View>
                                ))}
                            </Card>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, generating && { opacity: 0.7 }]}
                        onPress={generatePDF}
                        disabled={generating}
                    >
                        {generating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Generate PDF for Therapist</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    background: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    // I3: Empty state styles
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.foreground,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: colors.mutedForeground,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'white',
    },
    backButton: { padding: 4 },
    title: { fontSize: 20, fontWeight: '700', color: colors.foreground },
    exportButton: { padding: 4 },
    scrollContent: { padding: spacing.md },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    scoreCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 6,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.lg,
    },
    scoreText: { fontSize: 22, fontWeight: 'bold', color: colors.foreground },
    scoreLabel: { fontSize: 10, color: colors.mutedForeground },
    summaryTextContainer: { flex: 1 },
    summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    summaryNote: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
    chartCard: { padding: spacing.md, marginBottom: spacing.md },
    cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: spacing.sm, color: colors.foreground },
    chartFooter: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center', marginTop: -4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
    halfCard: { width: '48%' },
    cardInner: { padding: spacing.sm, flex: 1 },
    bulletRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    bulletText: { fontSize: 12, marginLeft: 6, color: colors.foreground, flex: 1 },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    standingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        marginBottom: spacing.md,
        backgroundColor: '#eef2ff',
    },
    standingLabel: { fontSize: 12, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
    standingValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
    efficiencyGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
    efficiencyItem: { alignItems: 'center', flex: 1 },
    efficiencyLevel: { fontSize: 12, color: colors.mutedForeground, textTransform: 'capitalize', marginBottom: 6 },
    efficiencyBox: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    efficiencyTime: { fontSize: 14, fontWeight: '600', color: colors.foreground },
});
