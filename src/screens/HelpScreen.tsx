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
import {
  colors,
  typography,
  spacing,
  shadows,
} from '../styles/constants';

export default function HelpScreen({ navigation }: NavigationProps) {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F3F4F6', '#E5E7EB']} style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>User Guide</Text>
            <Text style={styles.headerSubtitle}>How to master AR-Vocab</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Sections */}
          <HelpSection 
            icon="school" 
            iconColor="#3B82F6" 
            title="Discovery Learning"
            description="The first step in your journey! In Learning mode, you can explore detailed 3D AR models and hear the correct native pronunciation. There's no pressure here—just explore and listen."
          />

          <HelpSection 
            icon="mic" 
            iconColor="#10B981" 
            title="Practice Path"
            description="Put your skills to the test! Practice mode shows you the word and asks you to speak into the microphone. Our AI analyzing your pronunciation for accuracy and fluency."
          />

          <HelpSection 
            icon="star" 
            iconColor="#FBBF24" 
            title="Star Mastery System"
            description="Stars are only for the best! You earn a Mastery Star for an object ONLY when you achieve a perfect 100% pronunciation score. This star indicates you've fully mastered that word."
          />

          <HelpSection 
            icon="trophy" 
            iconColor="#8B5CF6" 
            title="Elite Badges"
            description="The ultimate proof of skill! You earn a Gold Badge for a Category (like Animals) and a Level (like LV 1) only after you have earned a Mastery Star for every single object in that specific section."
          />

          <HelpSection 
            icon="trending-up" 
            iconColor="#EF4444" 
            title="Difficulty Levels"
            description="Progress at your own pace!
• Level 1: Simple short words.
• Level 2: Intermediate multi-syllable words.
• Level 3: Challenging complex vocabulary."
          />

          {/* Quick Tips */}
          <Card style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Success Tips</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipText}>• Speak clearly and loudly in a quiet environment.</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipText}>• Listen to the reference pronunciation multiple times before recording.</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipText}>• Point your camera at a flat, well-lit surface for the best AR experience.</Text>
            </View>
          </Card>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function HelpSection({ icon, iconColor, title, description }: any) {
  return (
    <Card style={styles.helpCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
          <Icon name={icon} size={24} color={iconColor} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.helpText}>{description}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 25, 
    gap: 15,
    backgroundColor: 'white',
    ...shadows.sm,
  },
  backButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#F3F4F6', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  headerSubtitle: { fontSize: 14, color: '#6B7280' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  helpCard: {
    marginBottom: 15,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  helpText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  tipsCard: {
    marginTop: 10,
    marginBottom: 30,
    backgroundColor: '#1F2937',
    padding: 25,
    borderRadius: 24,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  tipItem: {
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
});
