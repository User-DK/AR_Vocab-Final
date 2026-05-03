import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { NavigationProps } from '../types/navigation';
import Card from '../components/Card';
import Progress from '../components/Progress';
import Badge from '../components/Badge';
import {
  colors,
  typography,
  spacing,
  responsive,
  borderRadius,
  layout,
} from '../styles/constants';
import { speechAssessmentEngine, overallAnalytics, ClinicalReport } from '../utils/speechAssessment';
import { LineChart } from '../components/AnalyticsCharts';

export default function ProgressScreen({ navigation }: NavigationProps) {
  const [analytics, setAnalytics] = React.useState<overallAnalytics | null>(null);
  const [report, setReport] = React.useState<ClinicalReport | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await speechAssessmentEngine.getAnalytics();
    const clinical = await speechAssessmentEngine.getClinicalReport();
    setAnalytics(data);
    setReport(clinical);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#ddd6fe', '#bfdbfe', '#fce7f3']}
        style={styles.background}
      >
        {/* Header */}
        <LinearGradient
          colors={colors.gradients.orange}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            {navigation.canGoBack() && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            )}
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Your Progress</Text>
              <Text style={styles.headerSubtitle}>{analytics?.userStanding || 'Loading...'}</Text>

              {/* Milestone Path */}
              <View style={styles.milestonePathContainer}>
                <View style={styles.milestoneInfo}>
                  <Text style={styles.milestoneNext}>Next: {analytics?.nextStandingName}</Text>
                  <Text style={styles.milestonePercent}>{analytics?.nextStandingProgress}%</Text>
                </View>
                <View style={styles.milestoneTrack}>
                  <View style={[styles.milestoneFill, { width: `${analytics?.nextStandingProgress || 0}%` }]} />
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Trend Chart Section */}
          <Card style={styles.chartCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Improvement Trend</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ClinicalReport')}
                style={styles.clinicalLink}
              >
                <Text style={styles.clinicalLinkText}>Clinical View</Text>
                <Icon name="chevron-forward" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <LineChart data={report?.improvementTrend || []} color={colors.primary} />
            <Text style={styles.chartLegend}>Score improvement over last 10 attempts</Text>
          </Card>

          {/* Overall Progress */}
          <Card style={styles.progressCard}>
            <Text style={styles.cardTitle}>Category Progress</Text>
            {analytics?.categories.map((cat) => (
              <View key={cat.id} style={styles.progressItem}>
                <Text style={styles.progressLabel}>{cat.name}</Text>
                <Progress value={cat.percentage} />
                <Text style={styles.progressPercent}>{cat.percentage}%</Text>
              </View>
            ))}
            {(!analytics || analytics.categories.length === 0) && (
              <Text style={styles.emptyNote}>Start learning to see your progress!</Text>
            )}
          </Card>

          {/* Achievements - Real Badges */}
          <Card style={styles.achievementsCard}>
            <Text style={styles.cardTitle}>Real-time Achievements</Text>
            <View style={styles.badgeGrid}>
              {analytics?.badges.map((badgeId, idx) => (
                <Badge
                  key={idx}
                  variant="gradient"
                  gradient={badgeId.includes('hard') ? [...colors.gradients.orange] : badgeId.includes('medium') ? [...colors.gradients.purple] : [...colors.gradients.green]}
                >
                  🏆 {badgeId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Badge>
              ))}
              {(!analytics || analytics.badges.length === 0) && (
                <Text style={styles.emptyNote}>Complete categories to earn badges!</Text>
              )}

              {/* Legacy/Milestone Badges */}
              {analytics && analytics.totalStars >= 10 && (
                <Badge variant="gradient" gradient={[...colors.gradients.blue]}>
                  ⭐ Star Pupil
                </Badge>
              )}
            </View>
          </Card>

          {/* Statistics */}
          <Card style={styles.statsCard}>
            <Text style={styles.cardTitle}>Learning Statistics</Text>
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{analytics?.totalLearned || 0}</Text>
                <Text style={styles.statLabel}>Words Seen</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{analytics?.totalStars || 0}</Text>
                <Text style={styles.statLabel}>Total Stars</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{analytics?.averageAccuracy || 0}%</Text>
                <Text style={styles.statLabel}>Avg Accuracy</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{analytics?.streak || 0} 🔥</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{analytics?.totalAvailable || 0}</Text>
                <Text style={styles.statLabel}>Total Curriculum</Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: responsive.iconSize(6),
    height: responsive.iconSize(6),
    borderRadius: responsive.iconSize(6) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.card,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    marginTop: 2,
  },
  milestonePathContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 8,
    borderRadius: 8,
  },
  milestoneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  milestoneNext: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milestonePercent: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  milestoneTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  milestoneFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: layout.containerPadding,
    paddingBottom: spacing.xl,
  },
  progressCard: {
    marginBottom: layout.cardSpacing,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  achievementsCard: {
    marginBottom: layout.cardSpacing,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  chartCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clinicalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clinicalLinkText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 2,
  },
  chartLegend: {
    fontSize: 10,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: -4,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressLabel: {
    width: '30%',
    fontSize: typography.fontSizes.sm,
    color: colors.mutedForeground,
  },
  progressPercent: {
    width: '15%',
    textAlign: 'right',
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.cardSpacing,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  emptyNote: {
    fontSize: typography.fontSizes.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
