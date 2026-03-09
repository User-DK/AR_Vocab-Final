/**
 * Advanced Speech Assessment & Persistence Engine
 * Features: Fast Phonetic Distance Algorithm + Stars & Badges System
 */
import { Platform } from 'react-native';
import Voice from '@react-native-voice/voice';
import RNFS from 'react-native-fs';

export const SCORE_THRESHOLDS = {
  excellent: 0.85,
  good: 0.70,
  acceptable: 0.55,
  poor: 0.40,
};

export interface PronunciationResult {
  word: string;
  recognized: string;
  score: number; // 10-100
  accuracy: number;
  fluency: number;
  timestamp: string;
  feedback: string;
}

export interface UserProgress {
  items: { [key: string]: { stars: number; bestScore: number } };
  badges: string[]; // e.g., "animals_easy"
  totalStars: number;
}

export class SpeechAssessmentEngine {
  private isRecording = false;
  private targetWord = '';
  private recognizedText = '';
  private startTime = 0;
  private historyPath = `${RNFS.DocumentDirectoryPath}/pronunciation_history.json`;
  private progressPath = `${RNFS.DocumentDirectoryPath}/user_progress.json`;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    try {
      Voice.onSpeechResults = (e) => {
        if (e.value) this.recognizedText = e.value[0];
      };
      Voice.onSpeechError = (e) => {
        console.error('Speech Error:', e);
        this.isRecording = false;
      };
    } catch (e) {
      console.warn('Voice listeners setup failed:', e);
    }
  }

  async startAssessment(word: string) {
    try {
      await this.cancelInternal();
      this.targetWord = word.toLowerCase();
      this.recognizedText = '';
      this.startTime = Date.now();
      this.isRecording = true;
      await Voice.start('en-US');
    } catch (e) {
      this.isRecording = false;
      throw e;
    }
  }

  private async cancelInternal() {
    try {
      const recognizing = await Voice.isRecognizing();
      if (recognizing) await Voice.cancel();
    } catch (e) {}
  }

  async stopAssessment(category?: string, difficulty?: string): Promise<PronunciationResult | null> {
    if (!this.isRecording) return null;
    this.isRecording = false;
    
    try {
      await Voice.stop();
      const duration = (Date.now() - this.startTime) / 1000;
      
      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = this.calculateProScore(duration);
          if (result) {
            await this.saveToHistory(result);
            await this.updateProgress(result, category, difficulty);
          }
          resolve(result);
        }, 500);
      });
    } catch (e) {
      return null;
    }
  }

  private phoneticEncode(s: string): string {
    if (!s) return "";
    let code = s.toUpperCase();
    const groups: [RegExp, string][] = [
      [/[BFPV]/g, '1'], [/[CGJKQSXZ]/g, '2'], [/[DT]/g, '3'],
      [/[L]/g, '4'], [/[MN]/g, '5'], [/[R]/g, '6']
    ];
    const first = code[0];
    let tail = code.slice(1).replace(/[AEIOUYHW]/g, '');
    groups.forEach(([regex, val]) => { tail = tail.replace(regex, val); });
    let result = first + tail;
    return result.replace(/(.)\1+/g, '$1').slice(0, 6);
  }

  private editDist(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
    return dp[a.length][b.length];
  }

  private calculateProScore(duration: number): PronunciationResult | null {
    const target = this.targetWord;
    const recognized = (this.recognizedText || '').toLowerCase();
    const p1 = this.phoneticEncode(target);
    const p2 = this.phoneticEncode(recognized);
    const pDist = this.editDist(p1, p2);
    const phoneticSim = recognized ? Math.max(0, 1 - pDist / Math.max(p1.length, p2.length, 1)) : 0;
    const idealDuration = (target.length * 0.15) + 0.3;
    const timingMatch = Math.max(0, 1 - Math.abs(duration - idealDuration) / 2);
    const rawResult = (phoneticSim * 0.7) + (timingMatch * 0.3);
    const finalScore = Math.floor(10 + (rawResult * 90));

    return {
      word: this.targetWord,
      recognized: this.recognizedText || "---",
      score: finalScore,
      accuracy: Math.floor(phoneticSim * 100),
      fluency: Math.floor(timingMatch * 100),
      timestamp: new Date().toISOString(),
      feedback: this.getFeedback(rawResult, !!recognized)
    };
  }

  private getFeedback(score: number, hasRecognized: boolean): string {
    if (!hasRecognized) return "I didn't understand that. Try again?";
    if (score > 0.85) return "Perfect! You sound like a native.";
    if (score > 0.70) return "Great job! Keep going.";
    if (score > 0.40) return "Good, but try to be clearer.";
    return "Keep practicing, you'll get it!";
  }

  /**
   * Progress & Badges Logic
   */
  async getProgress(): Promise<UserProgress> {
    try {
      const exists = await RNFS.exists(this.progressPath);
      if (!exists) return { items: {}, badges: [], totalStars: 0 };
      const content = await RNFS.readFile(this.progressPath);
      return JSON.parse(content);
    } catch (e) {
      return { items: {}, badges: [], totalStars: 0 };
    }
  }

  private async updateProgress(result: PronunciationResult, category?: string, difficulty?: string) {
    try {
      const progress = await this.getProgress();
      const wordKey = result.word.toLowerCase();
      
      // Calculate star (Binary: 1 star only if 100% correct)
      const hasStar = result.score === 100 ? 1 : 0;

      const currentItem = progress.items[wordKey] || { stars: 0, bestScore: 0 };
      
      // Award star if 100% and not already earned
      if (hasStar && currentItem.stars === 0) {
        progress.totalStars += 1;
        currentItem.stars = 1;
      }
      if (result.score > currentItem.bestScore) {
        currentItem.bestScore = result.score;
      }
      
      progress.items[wordKey] = currentItem;

      // Check for Badge Completion (Category + Difficulty)
      if (category && difficulty) {
        const badgeId = `${category.toLowerCase()}_${difficulty.toLowerCase()}`;
        if (!progress.badges.includes(badgeId)) {
          // Load vocab to check all items in this section
          const vocab = require('../../assets/ar/vocabulary-data.json');
          const catData = vocab.categories.find((c: any) => c.id.toLowerCase() === category.toLowerCase());
          const targetItems = catData.items.filter((i: any) => i.difficulty === difficulty.toLowerCase());
          
          const allPerfect = targetItems.every((item: any) => {
             const prog = progress.items[item.word.toLowerCase()];
             return prog && prog.bestScore === 100;
          });

          if (allPerfect && targetItems.length > 0) {
            progress.badges.push(badgeId);
          }
        }
      }

      await RNFS.writeFile(this.progressPath, JSON.stringify(progress, null, 2));
    } catch (e) {
      console.warn('Progress update error:', e);
    }
  }

  private async saveToHistory(result: PronunciationResult) {
    try {
      let history = [];
      const exists = await RNFS.exists(this.historyPath);
      if (exists) {
        const content = await RNFS.readFile(this.historyPath);
        history = JSON.parse(content);
      }
      history.push(result);
      if (history.length > 50) history.shift();
      await RNFS.writeFile(this.historyPath, JSON.stringify(history, null, 2));
    } catch (e) {}
  }

  cleanup() {
    Voice.destroy().then(Voice.removeAllListeners);
  }
}

export const speechAssessmentEngine = new SpeechAssessmentEngine();