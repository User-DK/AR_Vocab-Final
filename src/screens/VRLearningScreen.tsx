import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    Dimensions,
    Animated,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Sound from 'react-native-sound';
import Tts from 'react-native-tts';
import LinearGradient from 'react-native-linear-gradient';
import VRModelViewer from '../components/VRModelViewer';
import { speechAssessmentEngine } from '../utils/speechAssessment';
import {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    responsive,
} from '../styles/constants';
import { PronunciationResult } from '../utils/speechAssessment';
import Voice from '@dev-amirzubair/react-native-voice';

const { width: screenWidth } = Dimensions.get('window');

interface VRLearningScreenProps {
    navigation: any;
    route: {
        params: {
            category: string;
            difficulty?: 'easy' | 'medium' | 'hard';
            mode?: 'learning' | 'practice';
        };
    };
}

export default function VRLearningScreen({
    navigation,
    route,
}: VRLearningScreenProps) {
    const { category: categoryId, difficulty = 'easy', mode = 'learning' } = route.params;
    const isFocused = useIsFocused();
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [sound, setSound] = useState<Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [vocabularyData, setVocabularyData] = useState<any>({ categories: [] });
    const [isLoading, setIsLoading] = useState(true);

    // Practice States
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [assessmentResult, setAssessmentResult] = useState<PronunciationResult | null>(null);

    useEffect(() => {
        loadData();
        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const loadData = async () => {
        try {
            const data = require('../../assets/ar/vocabulary-data.json');
            setVocabularyData(data);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
        }
    };

    const categoryData = vocabularyData.categories.find(
        (cat: any) => cat.id && categoryId && cat.id.toLowerCase() === categoryId.toLowerCase()
    );

    const allItems = categoryData?.items || [];
    const activeItems = allItems.filter((i: any) => i.difficulty === difficulty);
    const currentItem = activeItems[currentItemIndex];

    const playSound = async () => {
        if (!currentItem || isPlaying) return;

        try {
            if (sound) {
                sound.release();
                setSound(null);
            }

            setIsPlaying(true);

            if (!currentItem.soundPath) {
                Tts.speak(currentItem.word);
                setIsPlaying(false);
                return;
            }

            let rawName = currentItem.soundPath
                .replace(/^sounds\//, '')
                .replace(/\.mp3$/i, '')
                .toLowerCase()
                .replace(/-/g, '_')
                .replace(/\s+/g, '_');

            const soundFile = new Sound(rawName + '.mp3', Sound.MAIN_BUNDLE, (error) => {
                if (error) {
                    Tts.speak(currentItem.word);
                    setIsPlaying(false);
                    return;
                }

                soundFile.play((success) => {
                    if (success) {
                        speechAssessmentEngine.recordLearning(currentItem.word);
                    }
                    setIsPlaying(false);
                });

                setSound(soundFile);
            });
        } catch (error) {
            setIsPlaying(false);
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            setIsRecording(false);
            setIsProcessing(true);
            const result = await speechAssessmentEngine.stopAssessment(categoryId, difficulty);
            setIsProcessing(false);
            if (result) {
                setAssessmentResult(result);
                setShowResult(true);
            }
        } else {
            if (!currentItem) return;
            setIsRecording(true);
            setShowResult(false);
            try {
                await speechAssessmentEngine.startAssessment(currentItem.word);
            } catch (error) {
                setIsRecording(false);
            }
        }
    };

    const handleNext = () => {
        if (currentItemIndex < activeItems.length - 1) {
            setCurrentItemIndex(currentItemIndex + 1);
        } else {
            Alert.alert('Congratulations!', 'Completed all words in VR Mode!', [
                { text: 'Exit VR', onPress: () => navigation.goBack() }
            ]);
        }
    };

    const handlePrevious = () => {
        if (currentItemIndex > 0) {
            setCurrentItemIndex(currentItemIndex - 1);
        }
    };

    if (isLoading || !currentItem) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Entering VR Room...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Immersive VR Content */}
            <VRModelViewer
                item={currentItem}
            />

            {/* VR UI Overlay (Simplified for VR immersion) */}
            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="close-circle" size={40} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.categoryTitle}>{categoryData?.name} - VR {mode === 'practice' ? 'PRACTICE' : 'LEARN'}</Text>
                        <Text style={styles.itemWord}>{currentItem.word}</Text>
                    </View>
                </View>

                <View style={styles.bottomControls}>
                    <TouchableOpacity
                        style={[styles.controlButton, currentItemIndex === 0 && styles.disabledButton]}
                        onPress={handlePrevious}
                        disabled={currentItemIndex === 0 || isRecording}
                    >
                        <Icon name="chevron-back" size={32} color="white" />
                    </TouchableOpacity>

                    {mode === 'learning' ? (
                        <TouchableOpacity style={styles.playButton} onPress={playSound}>
                            <LinearGradient colors={colors.gradients.orange} style={styles.playGradient}>
                                <Icon name={isPlaying ? "volume-high" : "play"} size={40} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.playButton} onPress={toggleRecording}>
                            <LinearGradient
                                colors={isRecording ? ['#ef4444', '#b91c1c'] : colors.gradients.green}
                                style={styles.playGradient}
                            >
                                <Icon name={isRecording ? "stop" : "mic"} size={40} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.controlButton} onPress={handleNext} disabled={isRecording}>
                        <Icon name="chevron-forward" size={32} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionText}>
                    {mode === 'practice' ? 'Tap mic and speak word clearly' : 'Press play to hear word · Drag · Pinch · Twist'}
                    </Text>
                    <Text style={styles.vrHelp}>Slide into Cardboard/VR Headset</Text>
                </View>

                {/* VR Result Overlay */}
                <Modal visible={showResult} transparent animationType="fade">
                    <View style={styles.modalBg}>
                        <View style={styles.modalCard}>
                            <View style={[styles.scoreBubble, { backgroundColor: assessmentResult?.score && assessmentResult.score > 70 ? '#10B981' : '#F59E0B' }]}>
                                <Text style={styles.scoreText}>{assessmentResult?.score}%</Text>
                            </View>
                            <Text style={styles.feedbackTitle}>{assessmentResult?.feedback}</Text>
                            <Text style={styles.transcriptText}>You said: "{assessmentResult?.recognized}"</Text>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowResult(false)}>
                                <Text style={styles.modalBtnText}>Next Step</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Processing Indicator */}
                {isProcessing && (
                    <View style={styles.processingOverlay}>
                        <ActivityIndicator size="large" color="white" />
                        <Text style={styles.processingText}>Analyzing Voice...</Text>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
    loadingText: { color: 'white', fontSize: 18 },
    overlay: { ...StyleSheet.absoluteFillObject },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        paddingTop: 30
    },
    backButton: { opacity: 0.6 },
    titleContainer: { marginLeft: spacing.sm },
    categoryTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase' },
    itemWord: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    bottomControls: {
        position: 'absolute',
        bottom: 40, // Moved lower
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 30
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    disabledButton: { opacity: 0.2 },
    playButton: { ...shadows.md },
    playGradient: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center'
    },
    instructionContainer: {
        position: 'absolute',
        bottom: 15,
        width: '100%',
        alignItems: 'center'
    },
    instructionText: { color: 'white', fontSize: 12, opacity: 0.6 },
    vrHelp: { color: colors.gradients.orange[0], fontSize: 10, fontWeight: 'bold', marginTop: 2, textTransform: 'uppercase' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 40 },
    modalCard: { backgroundColor: 'white', borderRadius: 32, padding: 25, alignItems: 'center' },
    scoreBubble: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    scoreText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    feedbackTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 10 },
    transcriptText: { fontSize: 14, color: '#6B7280', fontStyle: 'italic', marginBottom: 20 },
    modalBtn: { backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 15 },
    modalBtnText: { color: 'white', fontWeight: 'bold' },
    processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    processingText: { color: 'white', marginTop: 15, fontWeight: 'bold' }
});
