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
import { speechAssessmentEngine, UserProgress } from '../utils/speechAssessment';
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
  const [stats, setStats] = useState<UserProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadStats();
    }
  }, [isFocused]);

  const loadStats = async () => {
    const data = await speechAssessmentEngine.getProgress();
    setStats(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const badgeDisplay = stats?.badges?.map(b => {
    const [cat, diff] = b.split('_');
    const emoji = cat === 'animals' ? '🦁' : cat === 'foods' ? '🍎' : '📦';
    return `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} ${diff.toUpperCase()}`;
  }) || [];

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
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <LinearGradient colors={colors.gradients.yellow} style={styles.statIcon}>
                  <Icon name="star" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.statValue}>{stats?.totalStars || 0}</Text>
                <Text style={styles.statLabel}>Total Stars</Text>
              </View>
              <View style={styles.statItem}>
                <LinearGradient colors={colors.gradients.purple} style={styles.statIcon}>
                  <Icon name="trophy" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.statValue}>{stats?.badges.length || 0}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
              <View style={styles.statItem}>
                <LinearGradient colors={colors.gradients.green} style={styles.statIcon}>
                  <Icon name="sparkles" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.statValue}>{Object.keys(stats?.items || {}).length}</Text>
                <Text style={styles.statLabel}>Vocabulary</Text>
              </View>
            </View>

            {/* Badges Display */}
            <View style={styles.badgeLabelRow}>
              <Text style={styles.sectionHeader}>Your Collection</Text>
              {stats?.badges.length === 0 && <Text style={styles.emptyNote}>Complete a level with 100% to earn badges!</Text>}
            </View>
            
            <View style={styles.badgeContainer}>
              {badgeDisplay.map((badge, idx) => (
                <Badge key={idx} variant="gradient" gradient={[...colors.gradients.yellow]}>
                  🏆 {badge}
                </Badge>
              ))}
            </View>
          </Card>

          {/* Main Navigation Buttons */}
          <View style={styles.navigationGrid}>
            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Categories', { initialMode: 'learning' })}>
              <LinearGradient colors={colors.gradients.blue} style={styles.navButtonGradient}>
                <Icon name="book-outline" size={32} color="white" />
                <Text style={styles.navButtonText}>Learn</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Categories', { initialMode: 'practice' })}>
              <LinearGradient colors={colors.gradients.green} style={styles.navButtonGradient}>
                <Icon name="mic-outline" size={32} color="white" />
                <Text style={styles.navButtonText}>Practice</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={[styles.navButton, { width: '100%' }]} onPress={() => navigation.navigate('Progress')}>
            <LinearGradient colors={colors.gradients.purple} style={styles.fullWidthGradient}>
              <Icon name="analytics-outline" size={28} color="white" />
              <Text style={styles.navButtonTextInline}>View Learning History</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navButton, { width: '100%', marginTop: 10 }]} onPress={() => navigation.navigate('Help')}>
            <LinearGradient colors={['#374151', '#111827']} style={styles.fullWidthGradient}>
              <Icon name="help-buoy-outline" size={28} color="white" />
              <Text style={styles.navButtonTextInline}>App Guide & Help</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navButton, { width: '100%', marginTop: 10, marginBottom: 20 }]} onPress={() => navigation.navigate('Settings')}>
            <LinearGradient colors={['#4B5563', '#374151']} style={styles.fullWidthGradient}>
              <Icon name="settings-outline" size={28} color="white" />
              <Text style={styles.navButtonTextInline}>App Settings</Text>
            </LinearGradient>
          </TouchableOpacity>

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
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25 },
  statItem: { alignItems: 'center' },
  statIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8, ...shadows.md },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  statLabel: { fontSize: 12, color: '#9CA3AF' },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  badgeLabelRow: { marginBottom: 10 },
  emptyNote: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  navigationGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  navButton: { width: '48%' },
  navButtonGradient: { height: 130, borderRadius: 24, justifyContent: 'center', alignItems: 'center', ...shadows.md },
  fullWidthGradient: { height: 80, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15, ...shadows.md },
  navButtonText: { fontSize: 16, fontWeight: 'bold', color: 'white', marginTop: 10 },
  navButtonTextInline: { fontSize: 16, fontWeight: 'bold', color: 'white' }
});
