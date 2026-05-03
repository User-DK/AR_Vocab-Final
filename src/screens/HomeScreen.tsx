import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { NavigationProps } from '../types/navigation';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Progress from '../components/Progress';
import { speechAssessmentEngine, overallAnalytics } from '../utils/speechAssessment';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  responsive,
  layout,
} from '../styles/constants';

export default function HomeScreen({ navigation }: NavigationProps) {
  const isFocused = useIsFocused();
  const [analytics, setAnalytics] = useState<overallAnalytics | null>(null);
  const [stars, setStars] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadStats();
    }
  }, [isFocused]);

  const loadStats = async () => {
    const data = await speechAssessmentEngine.getAnalytics();
    const progress = await speechAssessmentEngine.getProgress();
    setAnalytics(data);
    setStars(progress.totalStars || 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const badgeDisplay = analytics?.categories.filter(c => c.percentage === 100).map(cat => ({
    name: cat.name,
    id: cat.id
  })) || [];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F3F4F6', '#E5E7EB']} style={styles.background}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header Section with Avatar */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <LinearGradient colors={colors.gradients.orange} style={styles.avatar}>
                <Text style={styles.avatarEmoji}>😊</Text>
              </LinearGradient>
              <View style={styles.greeting}>
                <Text style={styles.greetingText}>Hi, Explorer!</Text>
                <Text style={styles.subGreeting}>Ready to earn more stars?</Text>
              </View>
            </View>
          </View>

          {/* Stats Card */}
          <Card style={styles.statsCard} elevated={true}>
            <View style={styles.dashboardHeader}>
              <Text style={styles.dashboardTitle}>Learning Overview</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <LinearGradient colors={colors.gradients.yellow} style={styles.statIcon}>
                  <Icon name="star" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.statValue}>{stars}</Text>
                <Text style={styles.statLabel}>Total Stars</Text>
              </View>
              <View style={styles.statItem}>
                <LinearGradient colors={colors.gradients.purple} style={styles.statIcon}>
                  <Icon name="medal" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.statValue}>{analytics?.categories.length || 0}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
              <View style={styles.statItem}>
                <LinearGradient colors={colors.gradients.green} style={styles.statIcon}>
                  <Icon name="rocket" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.statValue}>{analytics?.totalLearned || 0}</Text>
                <Text style={styles.statLabel}>Learned</Text>
              </View>
            </View>

            {/* Daily Streak / Goal placeholder */}
            <View style={styles.goalSection}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalText}>Daily Learning Goal</Text>
                <Text style={styles.goalPercent}>{Math.min(100, Math.round((stars / 50) * 100))}% complete</Text>
              </View>
              <Progress value={Math.min(100, (stars / 50) * 100)} height={8} />
            </View>

            {/* Badges Display */}
            <View style={styles.badgeLabelRow}>
              <Text style={styles.sectionHeader}>Your Collection</Text>
              {(!analytics || analytics.totalLearned === 0) && <Text style={styles.emptyNote}>Start learning to earn badges!</Text>}
            </View>

            <View style={styles.badgeContainer}>
              {analytics?.categories.filter(c => c.percentage === 100).map((cat, idx) => (
                <Badge key={idx} variant="gradient" gradient={[...colors.gradients.yellow]}>
                  🏆 {cat.name}
                </Badge>
              ))}
              {analytics && analytics.averageAccuracy >= 85 && (
                <Badge variant="gradient" gradient={[...colors.gradients.green]}>
                  🎯 Ace
                </Badge>
              )}
            </View>
          </Card>

          <View style={styles.quickStartHeader}>
            <Text style={styles.dashboardTitle}>Quick Stats</Text>
          </View>

          <Card style={styles.miniStatsRow}>
            <View style={styles.miniStatItem}>
              <Text style={styles.miniStatVal}>{analytics?.averageAccuracy || 0}%</Text>
              <Text style={styles.miniStatLabel}>Avg. Clarity</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.miniStatItem}>
              <Text style={styles.miniStatVal}>{analytics?.categories.length || 0}</Text>
              <Text style={styles.miniStatLabel}>Topics</Text>
            </View>
          </Card>

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15, ...shadows.md },
  avatarEmoji: { fontSize: 32 },
  greeting: { flex: 1 },
  greetingText: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  subGreeting: { fontSize: 14, color: '#6B7280' },
  headerActions: { flexDirection: 'row', gap: 10, paddingRight: 45, marginRight: 45 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', ...shadows.md },
  statsCard: { marginBottom: 20, backgroundColor: 'white', padding: 20, borderRadius: 32 },
  dashboardHeader: { marginBottom: 15 },
  dashboardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.slate[800] },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8, ...shadows.md },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  statLabel: { fontSize: 12, color: '#9CA3AF' },
  goalSection: { marginTop: 10, marginBottom: 20, padding: 15, backgroundColor: colors.slate[50], borderRadius: 20 },
  goalInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalText: { fontSize: 13, fontWeight: '600', color: colors.slate[600] },
  goalPercent: { fontSize: 13, fontWeight: 'bold', color: colors.primary },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  badgeLabelRow: { marginBottom: 10 },
  emptyNote: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickStartHeader: { marginBottom: 12, marginTop: 5 },
  miniStatsRow: { flexDirection: 'row', paddingVertical: 15, borderRadius: 24, backgroundColor: 'white' },
  miniStatItem: { flex: 1, alignItems: 'center' },
  miniStatVal: { fontSize: 20, fontWeight: 'bold', color: colors.slate[800] },
  miniStatLabel: { fontSize: 11, color: colors.slate[500], marginTop: 2 },
  verticalDivider: { width: 1, height: '70%', backgroundColor: colors.slate[100] },
  navigationGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  navButton: { width: '48%' },
  navButtonGradient: { height: 130, borderRadius: 24, justifyContent: 'center', alignItems: 'center', ...shadows.md },
  fullWidthGradient: { height: 80, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15, ...shadows.md },
  navButtonText: { fontSize: 16, fontWeight: 'bold', color: 'white', marginTop: 10 },
  navButtonTextInline: { fontSize: 16, fontWeight: 'bold', color: 'white' }
});
