import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
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

interface Category {
  id: string;
  name: string;
  icon: string;
  gradient: string[];
}

const categoriesStatic: Category[] = [
  { id: 'animals', name: 'Animals', icon: '🦁', gradient: [...colors.gradients.orange] },
  { id: 'foods', name: 'Foods', icon: '🍎', gradient: [...colors.gradients.green] },
  { id: 'clothing', name: 'Clothing', icon: '👕', gradient: [...colors.gradients.pink] },
  { id: 'daily_objects', name: 'Daily Objects', icon: '🪑', gradient: [...colors.gradients.blue] },
  { id: 'vehicles', name: 'Vehicles', icon: '🚗', gradient: [...colors.gradients.purple] },
  { id: 'colors', name: 'Colors', icon: '🎨', gradient: [...colors.gradients.teal] },
];

export default function CategorySelectionScreen({ navigation, route }: any) {
  const { initialMode } = route.params || {};
  const [vocabularyData, setVocabularyData] = useState<VocabularyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for Level Selection Modal
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'learning' | 'practice' | null>(initialMode || null);

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
    const screen = mode === 'learning' ? 'Learning' : 'Assessment';
    
    setShowLevelModal(false);
    navigation.navigate(screen, { 
      category: selectedCategory, 
      difficulty,
      itemIndex: 0 
    });
  };

  if (isLoading) return <ActivityIndicator style={{flex: 1}} />;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F3F4F6', '#E5E7EB']} style={styles.background}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Select Topic</Text>
            <Text style={styles.headerSubtitle}>Choose a category to begin</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {categoriesStatic.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={styles.card} 
                onPress={() => handleCategorySelect(cat.id)}
              >
                <LinearGradient colors={cat.gradient} style={styles.cardGradient}>
                  <Text style={styles.cardIcon}>{cat.icon}</Text>
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
  levelList: { gap: 15, marginBottom: 25 },
  levelBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1, backgroundColor: '#F9FAFB' },
  levelIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  levelTitle: { fontWeight: 'bold', fontSize: 16 },
  levelDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  closeBtn: { padding: 15, alignItems: 'center' },
  closeBtnText: { color: '#EF4444', fontWeight: 'bold' }
});

const ActivityIndicator = ({ style }: any) => <View style={style}><Text>Loading...</Text></View>;
