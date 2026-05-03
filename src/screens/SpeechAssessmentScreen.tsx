import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Sound from 'react-native-sound';
import Tts from 'react-native-tts';
import Voice from '@dev-amirzubair/react-native-voice';
import ARModelViewer from '../components/ARModelViewer';
import {
  speechAssessmentEngine,
  PronunciationResult,
} from '../utils/speechAssessment';
import {
  colors,
  borderRadius,
  shadows,
  spacing
} from '../styles/constants';

const { width: screenWidth } = Dimensions.get('window');

export default function SpeechAssessmentScreen({ navigation, route }: any) {
  const { category = 'animals', itemIndex = 0, difficulty = 'easy' } = route.params || {};
  const isFocused = useIsFocused();
  const [currentIndex, setCurrentIndex] = useState(itemIndex);
  const [vocabularyData, setVocabularyData] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentResult, setCurrentResult] = useState<PronunciationResult | null>(null);
  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [savedStats, setSavedStats] = useState<any>(null);

  // Animations
  const waveAnims = useRef(Array.from({ length: 15 }, () => new Animated.Value(5))).current;
  const floatingAnimation = useRef(new Animated.Value(0)).current;
  const gridOpacity = useRef(new Animated.Value(0.3)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadData();
    Sound.setCategory('PlayAndRecord', true);

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnimation, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatingAnimation, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(gridOpacity, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(gridOpacity, { toValue: 0.2, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      isMounted.current = false;
      // Don't call speechAssessmentEngine.cleanup() because it calls Voice.destroy()
      // Instead, just remove the listeners we set up if needed, or leave them for next time
      // The singleton will re-attach them in startAssessment(anyway)
      Voice.removeAllListeners();
    };
  }, []);

  const loadData = async () => {
    try {
      const data = require('../../assets/ar/vocabulary-data.json');
      setVocabularyData(data);
      const prog = await speechAssessmentEngine.getProgress();
      setSavedStats(prog);
    } catch (e) { Alert.alert('Error', 'Failed to load data'); }
  };

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'AR Vocab needs access to your microphone to assess your pronunciation.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[SpeechAssessment] Permission request error:', err);
        return false;
      }
    }
    return true;
  };

  const categoryData = vocabularyData?.categories.find((c: any) => c.id.toLowerCase() === category.toLowerCase());
  const allItems = categoryData?.items || [];
  const items = allItems.filter((i: any) => i.difficulty === difficulty);
  const currentItem = items[currentIndex];

  const currentItemProgress = savedStats?.items[currentItem?.word.toLowerCase()] || { stars: 0, bestScore: 0 };

  const playReference = () => {
    if (!currentItem || isPlayingRef) return;
    setIsPlayingRef(true);
    let rawName = currentItem.soundPath.split('/').pop().replace('.mp3', '').toLowerCase();
    const sound = new Sound(`${rawName}.mp3`, Sound.MAIN_BUNDLE, (e) => {
      if (e) {
        console.log('🔄 Sound file not found, using TTS for:', currentItem.word);
        Tts.speak(currentItem.word);
        setIsPlayingRef(false);
        return;
      }
      sound.play(() => {
        setIsPlayingRef(false);
        sound.release();
      });
    });
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      const result = await speechAssessmentEngine.stopAssessment(category, difficulty);

      if (isMounted.current) {
        setIsProcessing(false);
        if (result) {
          setCurrentResult(result);
          setShowFeedback(true);
          // Refresh stats
          const prog = await speechAssessmentEngine.getProgress();
          setSavedStats(prog);
        }
      }
    } else {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Microphone access is required for pronunciation practice.');
        return;
      }

      setIsRecording(true);
      setShowFeedback(false);
      try {
        if (!currentItem || !currentItem.word) {
          throw new Error('No word selected');
        }
        await speechAssessmentEngine.startAssessment(currentItem.word);
      } catch (error: any) {
        console.error('Failed to start assessment:', error);
        setIsRecording(false);
        Alert.alert('Error', `Could not start voice recognition: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
    } else {
      Alert.alert('Session End', 'You have finished this level!', [{ text: 'Done', onPress: () => navigation.navigate('Home') }]);
    }
  };

  const renderMasteryStar = (isMastered: boolean) => {
    return (
      <View style={styles.masteryContainer}>
        <Icon
          name={isMastered ? "star" : "star-outline"}
          size={28}
          color={isMastered ? "#FBBF24" : "rgba(0,0,0,0.1)"}
        />
        {isMastered && <Text style={styles.masteryText}>Mastered!</Text>}
      </View>
    );
  };

  if (!currentItem) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.backgroundGradient} />

      <Animated.View style={[styles.gridOverlay, { opacity: gridOpacity }]}>
        {Array.from({ length: 20 }).map((_, i) => <View key={`h-${i}`} style={[styles.gridLine, { top: i * 40 }]} />)}
        {Array.from({ length: 20 }).map((_, i) => <View key={`v-${i}`} style={[styles.gridLineVertical, { left: i * 40 }]} />)}
      </Animated.View>

      {isFocused ? (
        <ARModelViewer item={currentItem} />
      ) : (
        <View style={styles.placeholder}><Text style={{ fontSize: 80 }}>{currentItem.emoji}</Text></View>
      )}

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={styles.backButtonContainer}><Icon name="arrow-back" size={24} color="white" /></View>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>LV {difficulty === 'easy' ? '1' : difficulty === 'medium' ? '2' : '3'}</Text>
            <Text style={styles.headerSubtitle}>{currentIndex + 1} of {items.length}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[styles.wordInfoCard, {
          transform: [{ translateY: floatingAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }]
        }]}>
          <View style={styles.cardHeader}>
            {renderMasteryStar(currentItemProgress.stars === 1)}
            {currentItemProgress.bestScore > 0 && <Text style={styles.bestScoreText}>Best: {currentItemProgress.bestScore}%</Text>}
          </View>

          <View style={styles.wordInfo}>
            <Text style={styles.wordText}>{currentItem.word}</Text>
            <Text style={styles.phoneticText}>{currentItem.phonetic}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity onPress={playReference} style={styles.controlButton}>
              <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.buttonGradient}>
                <Icon name={isPlayingRef ? "volume-high" : "volume-medium"} size={26} color="white" />
                <Text style={styles.buttonText}>Listen</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleRecording} style={styles.micButton}>
              <LinearGradient colors={isRecording ? ['#EF4444', '#B91C1C'] : ['#10B981', '#059669']} style={styles.micGradient}>
                <Icon name={isRecording ? "stop" : "mic"} size={32} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.buttonGradient}>
                <Icon name="play-skip-forward" size={26} color="white" />
                <Text style={styles.buttonText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {isRecording && (
            <View style={styles.waveform}>
              {waveAnims.map((anim, i) => (
                <Animated.View key={i} style={[styles.waveBar, { height: anim }]} />
              ))}
            </View>
          )}
        </Animated.View>
      </View>

      <Modal visible={showFeedback} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            {currentResult?.score === 100 && (
              <View style={styles.modalScoreStars}>
                <Icon name="star" size={50} color="#FBBF24" />
                <Text style={styles.perfectText}>PERFECT!</Text>
              </View>
            )}
            <View style={[styles.scoreBubble, { backgroundColor: currentResult?.score && currentResult.score > 70 ? '#10B981' : '#F59E0B' }]}>
              <Text style={styles.scoreText}>{currentResult?.score}%</Text>
            </View>
            <Text style={styles.feedbackTitle}>{currentResult?.feedback}</Text>
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>You said:</Text>
              <Text style={styles.transcriptText}>"{currentResult?.recognized}"</Text>
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowFeedback(false)}>
              <Text style={styles.modalBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundGradient: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  gridOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1, opacity: 0.1 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  gridLineVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937' },
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backButton: { width: 44, height: 44 },
  backButtonContainer: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginLeft: 10 },
  wordInfoCard: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 32, padding: 25, zIndex: 10, ...shadows.xl },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  masteryContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  masteryText: { fontSize: 14, fontWeight: 'bold', color: '#FBBF24' },
  bestScoreText: { fontSize: 12, color: '#6366f1', fontWeight: 'bold' },
  wordInfo: { alignItems: 'center', marginBottom: 20 },
  wordText: { fontSize: 38, fontWeight: 'bold', color: '#1F2937' },
  phoneticText: { fontSize: 18, color: '#6366f1' },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  controlButton: { width: '30%', borderRadius: 16, overflow: 'hidden' },
  buttonGradient: { paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginTop: 4 },
  micButton: { width: 70, height: 70, borderRadius: 35, overflow: 'hidden', ...shadows.lg },
  micGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waveform: { flexDirection: 'row', gap: 3, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  waveBar: { width: 4, backgroundColor: '#6366f1', borderRadius: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25 },
  modalCard: { backgroundColor: 'white', borderRadius: 32, padding: 30, alignItems: 'center' },
  modalScoreStars: { alignItems: 'center', marginBottom: 15 },
  perfectText: { fontSize: 20, fontWeight: 'bold', color: '#FBBF24', marginTop: 5 },
  scoreBubble: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  scoreText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  feedbackTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', textAlign: 'center' },
  transcriptBox: { backgroundColor: '#F3F4F6', width: '100%', padding: 15, borderRadius: 20, marginVertical: 20 },
  transcriptLabel: { fontSize: 10, color: '#9CA3AF' },
  transcriptText: { fontSize: 18, fontWeight: '600', color: '#374151', fontStyle: 'italic' },
  modalBtn: { backgroundColor: '#6366F1', paddingHorizontal: 50, paddingVertical: 15, borderRadius: 20 },
  modalBtnText: { color: 'white', fontWeight: 'bold' }
});
