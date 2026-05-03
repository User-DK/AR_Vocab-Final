import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  responsive,
  layout,
} from '../styles/constants';
import { VocabularyCategory, VocabularyData } from '../types/vocabulary';
import { responsiveHeight } from 'react-native-responsive-dimensions';


export default function CategorySelectionScreen({ navigation, route }: any) {
  const { initialMode } = route.params || {};
  const [vocabularyData, setVocabularyData] = useState<VocabularyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for Level Selection Modal
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'learning' | 'practice' | 'vr' | 'vr_learn' | 'vr_practice' | null>(initialMode || null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = require('../../assets/ar/vocabulary-data.json') as VocabularyData;
      setVocabularyData(data);
      setIsLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setShowLevelModal(true);
  };

  const startSession = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!selectedCategory || (!selectedMode && !initialMode)) return;

    const mode = selectedMode || initialMode;
    const isVRMode = mode === 'vr' || mode === 'vr_learn' || mode === 'vr_practice' || initialMode === 'vr';

    let screen = 'Learning';
    if (isVRMode) {
      screen = 'VRLearning';
    } else if (mode === 'practice') {
      screen = 'Assessment';
    }

    setShowLevelModal(false);
    navigation.navigate(screen, {
      category: selectedCategory,
      difficulty,
      itemIndex: 0,
      mode: isVRMode ? (selectedMode?.includes('practice') ? 'practice' : 'learning') : mode
    });
  };

  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F3F4F6', '#E5E7EB']} style={styles.background}>

        {/* Header */}
        <View style={styles.header}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>
              {initialMode === 'vr' ? 'VR Practice' : 'AR Room'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {initialMode === 'vr'
                ? 'Choose a category for immersive practice'
                : 'Choose a topic to begin'
              }
            </Text>
          </View>
        </View>

        {/* Mode Switcher */}
        <View style={styles.mainModeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, (selectedMode === 'learning' || selectedMode === 'vr_learn' || selectedMode === 'vr') && styles.modeBtnActive]}
            onPress={() => setSelectedMode(initialMode === 'vr' ? 'vr_learn' : 'learning')}
          >
            <Icon
              name="school"
              size={18}
              color={(selectedMode === 'learning' || selectedMode === 'vr_learn' || selectedMode === 'vr') ? 'white' : '#6B7280'}
            />
            <Text style={[styles.modeBtnText, (selectedMode === 'learning' || selectedMode === 'vr_learn' || selectedMode === 'vr') && styles.modeBtnTextActive]}>
              Learn
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, (selectedMode === 'practice' || selectedMode === 'vr_practice') && styles.modeBtnActive]}
            onPress={() => setSelectedMode(initialMode === 'vr' ? 'vr_practice' : 'practice')}
          >
            <Icon
              name="star"
              size={18}
              color={(selectedMode === 'practice' || selectedMode === 'vr_practice') ? 'white' : '#6B7280'}
            />
            <Text style={[styles.modeBtnText, (selectedMode === 'practice' || selectedMode === 'vr_practice') && styles.modeBtnTextActive]}>
              Practice
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {(vocabularyData?.categories || []).map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.card}
                onPress={() => handleCategorySelect(cat.id)}
              >
                <LinearGradient
                  colors={cat.color || ['#4F46E5', '#7C3AED']}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardIcon}>{cat.emoji}</Text>
                  <Text style={styles.cardName}>{cat.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Level Selection Modal */}
        <Modal visible={showLevelModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Difficulty Level</Text>
              <Text style={styles.modalSubtitle}>How challenging should this be?</Text>

              {!initialMode && !selectedMode && (
                <View style={styles.modeToggle}>
                  <TouchableOpacity
                    style={[styles.miniBtn, selectedMode === 'learning' && styles.miniBtnActive]}
                    onPress={() => setSelectedMode('learning')}
                  >
                    <Text style={styles.miniBtnText}>Learn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.miniBtn, selectedMode === 'practice' && styles.miniBtnActive]}
                    onPress={() => setSelectedMode('practice')}
                  >
                    <Text style={styles.miniBtnText}>Practice</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.levelList}>
                <LevelButton
                  title="Level 1: Beginner"
                  desc="Focus on simple words like Lion, Dog, Apple"
                  color="#10B981"
                  onPress={() => startSession('easy')}
                />
                <LevelButton
                  title="Level 2: Intermediate"
                  desc="Medium words like Elephant, Banana"
                  color="#F59E0B"
                  onPress={() => startSession('medium')}
                />
                <LevelButton
                  title="Level 3: Expert"
                  desc="Complex words like Watermelon, Grasshopper"
                  color="#EF4444"
                  onPress={() => startSession('hard')}
                />
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLevelModal(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

function LevelButton({ title, desc, color, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.levelBtn, { borderColor: color }]} onPress={onPress}>
      <View style={[styles.levelIndicator, { backgroundColor: color }]} />
      <View>
        <Text style={[styles.levelTitle, { color }]}>{title}</Text>
        <Text style={styles.levelDesc}>{desc}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  background: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 25, gap: 15 },
  backButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', ...shadows.md },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  headerSubtitle: { fontSize: 14, color: '#6B7280' },
  scrollContent: { padding: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 15, borderRadius: 24, overflow: 'hidden', ...shadows.lg },
  cardGradient: { height: 140, justifyContent: 'center', alignItems: 'center' },
  cardIcon: { fontSize: 40, marginBottom: 5 },
  cardName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 25 },
  modeToggle: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  miniBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DDD' },
  miniBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  miniBtnText: { fontWeight: '600', color: '#6B7280' },
  mainModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    marginHorizontal: 25,
    borderRadius: 20,
    padding: 5,
    marginBottom: 20
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8
  },
  modeBtnActive: { backgroundColor: colors.primary, ...shadows.md },
  modeBtnText: { fontWeight: 'bold', color: '#6B7280', fontSize: 14 },
  modeBtnTextActive: { color: 'white' },
  levelList: { gap: 15, marginBottom: 25 },
  levelBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1, backgroundColor: '#F9FAFB' },
  levelIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  levelTitle: { fontWeight: 'bold', fontSize: 16 },
  levelDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  closeBtn: { padding: 15, alignItems: 'center' },
  closeBtnText: { color: '#EF4444', fontWeight: 'bold' }
});
