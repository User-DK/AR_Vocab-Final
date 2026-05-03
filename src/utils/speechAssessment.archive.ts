/**
 * Advanced Speech Assessment & Persistence Engine
 * Features: Fast Phonetic Distance Algorithm + Stars & Badges System
 */
import { Platform } from 'react-native';
import Voice from '@dev-amirzubair/react-native-voice';
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
  phoneticAccuracy: number; // 0-100
  characterAccuracy: number; // 0-100
  fluency: number; // 0-100
  duration: number; // seconds
  timestamp: string;
  feedback: string;
  difficulty?: string;
}

export interface ClinicalReport {
  overallAccuracy: number;
  phoneticStrength: string[];
  phoneticWeakness: string[];
  improvementTrend: number[]; // Last 10 scores
  mostAttemptedWords: { word: string; count: number }[];
  clinicalNote: string;
  userStanding: string;
  responseTimeByLevel: { level: string; avgTime: number }[];
  curriculumMastery: { name: string; percentage: number }[];
  badges: string[];
  attempts: number;
  stars: number;
}

export interface UserProgress {
  items: { [key: string]: { stars: number; bestScore: number; isLearned?: boolean; attempts?: number } };
  badges: string[]; // e.g., "animals_easy"
  totalStars: number;
  totalAttempts: number;
}

export interface CategoryAnalytics {
  id: string;
  name: string;
  percentage: number;
  learnedCount: number;
  totalCount: number;
}

export interface overallAnalytics {
  categories: CategoryAnalytics[];
  totalLearned: number;
  totalAvailable: number;
  averageAccuracy: number;
  streak: number;
  userStanding: string;
  totalStars: number;
  badges: string[];
  nextStandingProgress: number;
  nextStandingName: string;
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

  public setupListeners() {
    try {
      console.log('[SpeechAssessment] Setting up listeners...');
      Voice.onSpeechResults = (e) => {
        if (e.value && e.value.length > 0) {
          this.recognizedText = e.value[0];
          console.log('[SpeechAssessment] Final Recognized:', this.recognizedText);
        }
      };
      Voice.onSpeechPartialResults = (e) => {
        if (e.value && e.value.length > 0) {
          // Update real-time if we don't have a final result yet or if this is better
          this.recognizedText = e.value[0];
          console.log('[SpeechAssessment] Partial Recognized:', this.recognizedText);
        }
      };
      Voice.onSpeechError = (e: any) => {
        // Log to console but not as error to avoid red-screen LogBox in development
        const errorMsg = e?.error?.message || e?.message || 'Unknown';
        const errorCode = e?.error?.code || e?.code;

        console.log(`[SpeechAssessment] Error (${errorCode}):`, errorMsg);

        // If it's code 7 (No match) or 11 (Didn't understand), 
        // we keep the recognizedText from partial results instead of clearing it
        this.isRecording = false;
        // Do NOT clear this.recognizedText here so we can still score partial matches
      };
      Voice.onSpeechStart = () => {
        console.log('[SpeechAssessment] Recording started');
      };
      Voice.onSpeechEnd = () => {
        console.log('[SpeechAssessment] Recording ended');
      };
    } catch (e) {
      console.warn('[SpeechAssessment] Voice listeners setup failed:', e);
    }
  }

  async startAssessment(word: string) {
    try {
      await this.cancelInternal();
      this.setupListeners();
      this.targetWord = word.toLowerCase().trim();
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
      if (Voice && typeof Voice.isRecognizing === 'function') {
        const recognizing = await Voice.isRecognizing();
        if (recognizing) await Voice.cancel();
      } else if (Voice && typeof Voice.cancel === 'function') {
        await Voice.cancel();
      }
    } catch (e) {
      console.warn('[SpeechAssessment] cancelInternal error:', e);
    }
  }

  async stopAssessment(category?: string, difficulty?: string): Promise<PronunciationResult | null> {
    // If it wasn't recording, we still might want the last result if called from UI
    const wasRecording = this.isRecording;
    this.isRecording = false;

    try {
      // Small pause to allow final partial results to arrive
      await new Promise(r => setTimeout(() => r(null), 300));
      await Voice.stop();
      const duration = (Date.now() - this.startTime) / 1000;

      return new Promise<PronunciationResult | null>((resolve) => {
        setTimeout(async () => {
          const result = this.calculateProScore(duration, difficulty);
          if (result) {
            await this.saveToHistory(result);
            await this.updateProgress(result, category, difficulty);
          }
          resolve(result);
        }, 300);
      });
    } catch (e) {
      return null;
    }
  }

  private phoneticEncode(s: string): string {
    if (!s) return "";
    let code = s.toUpperCase().trim();
    if (code.length === 0) return "";

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

  private calculateProScore(duration: number, difficulty?: string): PronunciationResult | null {
    const target = this.targetWord;
    let recognized = (this.recognizedText || '').toLowerCase().trim();

    // Aggressive normalization for short educational targets
    const normalize = (s: string) => {
      let val = s.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
        .replace(/\b(the|is|it|its|a|an|letter|number|this|that)\b/g, "") // Remove fillers (even at end)
        .replace(/\s+/g, " ") // Collapse spaces
        .trim();

      const numMap: { [key: string]: string } = {
        "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
        "6": "six", "7": "seven", "8": "eight", "9": "nine", "0": "zero",
        "won": "one", "too": "two", "to": "two", "for": "four", "ate": "eight",
        "bee": "b", "see": "c", "dee": "d", "ee": "e", "ef": "f", "gee": "g"
      };
      // For exact match in numMap
      if (numMap[val]) return numMap[val];
      // For character + junk
      if (val.length > 2) {
        for (const [key, word] of Object.entries(numMap)) {
          if (val.includes(word) || val.includes(key)) return word;
        }
      }
      return val;
    };

    const normTarget = normalize(target);
    const normRecognized = normalize(recognized);

    // 1. Phonetic Similarity (Soundex-based)
    const p1 = this.phoneticEncode(normTarget);
    const p2 = this.phoneticEncode(normRecognized);
    const pDist = this.editDist(p1, p2);
    const phoneticSim = normRecognized ? Math.max(0, 1 - pDist / Math.max(p1.length, p2.length, 1)) : 0;

    // 2. Character Similarity
    const cDist = this.editDist(normTarget, normRecognized);
    const charSim = normRecognized ? Math.max(0, 1 - cDist / Math.max(normTarget.length, normRecognized.length, 1)) : 0;

    // Lenient match for single characters (e.g. Alphabets)
    let isLenientMatch = false;
    if (normTarget.length === 1 && normRecognized.length > 0) {
      // If target is 'A', and they said 'apple' or 'ay' or 'eight' (homophones/starting sounds)
      if (normRecognized[0] === normTarget[0]) isLenientMatch = true;
      // Common mishearings for letters
      const letterFuzzy: { [key: string]: string[] } = {
        'a': ['ay', 'hey', 'eight'],
        'b': ['be', 'bee', 'bee.'],
        'c': ['see', 'sea', 'she'],
        'd': ['dee', 'the'],
        'e': ['ee', 'he', 'i'],
        'f': ['ef', 'if'],
        'g': ['gee', 'jee', 'she']
      };
      if (letterFuzzy[normTarget] && letterFuzzy[normTarget].some(f => normRecognized.includes(f))) isLenientMatch = true;
    }

    // 3. Timing Match (Wider window)
    const idealDuration = (target.length * 0.2) + 0.4;
    const timingMatch = Math.max(0, 1 - Math.abs(duration - idealDuration) / 3);

    // Combine: 40% Phonetic, 40% Character, 20% timing
    let finalRaw = normRecognized
      ? (phoneticSim * 0.4) + (charSim * 0.4) + (timingMatch * 0.2)
      : 0;

    // SCORING BOOSTS
    // 1. Exact match boost
    if (normRecognized === normTarget) {
      finalRaw = Math.max(0.95, finalRaw);
    }
    // 2. Lenient match boost (for short educational targets)
    else if (isLenientMatch) {
      finalRaw = Math.max(0.80, finalRaw);
    }
    // 3. Simple inclusion boost (if they said the word as part of a phrase)
    else if (normRecognized.includes(normTarget) && normTarget.length > 2) {
      finalRaw = Math.max(0.70, finalRaw);
    }

    const finalScore = Math.floor(10 + (finalRaw * 90));

    return {
      word: this.targetWord,
      recognized: this.recognizedText || "---",
      score: finalScore,
      phoneticAccuracy: Math.floor(phoneticSim * 100),
      characterAccuracy: Math.floor(charSim * 100),
      fluency: Math.floor(timingMatch * 100),
      duration: Number(duration.toFixed(2)),
      timestamp: new Date().toISOString(),
      feedback: this.getFeedback(finalRaw, !!normRecognized),
      difficulty: difficulty
    };
  }

  private getFeedback(score: number, hasRecognized: boolean): string {
    if (!hasRecognized) return "I didn't understand that. Try again?";
    if (score > 0.90) return "Perfect pronunciation! Well done.";
    if (score > 0.75) return "Great job! Very clear.";
    if (score > 0.50) return "Good attempt, keep practicing.";
    if (score > 0.30) return "I heard you, but try to be clearer.";
    return "Let's try that word again.";
  }

  async getClinicalReport(): Promise<ClinicalReport> {
    try {
      const historyStr = await RNFS.exists(this.historyPath) ? await RNFS.readFile(this.historyPath) : "[]";
      const history: PronunciationResult[] = JSON.parse(historyStr);
      const progress = await this.getProgress();

      const last10 = history.slice(-10).map(h => h.score);

      const wordStats = Object.entries(progress.items)
        .sort(([, a], [, b]) => (b.attempts || 0) - (a.attempts || 0))
        .slice(0, 5)
        .map(([word, data]) => ({ word, count: data.attempts || 0 }));

      // Analyze phonetic strengths/weaknesses
      const avgPhonetic = history.length > 0
        ? history.reduce((acc, h) => acc + (h.phoneticAccuracy || h.score || 0), 0) / history.length
        : 0;

      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (avgPhonetic > 80) strengths.push("Strong phonetic consistency");
      else if (avgPhonetic < 50) weaknesses.push("Needs work on phonetic clarity");

      const avgDuration = history.length > 0
        ? history.reduce((acc, h) => acc + h.duration, 0) / history.length
        : 0;

      if (avgDuration > 3) weaknesses.push("Slow response time/Hesitation");

      // Standing Logic
      let standing = "Novice Learner";
      const totalStars = progress.totalStars || 0;
      if (totalStars >= 50) standing = "Speech Master";
      else if (totalStars >= 25) standing = "Expert Communicator";
      else if (totalStars >= 10) standing = "Steady Progressor";
      else if (totalStars >= 2) standing = "Developing Speaker";

      // Time per difficulty level
      const responseTimes = ["easy", "medium", "hard"].map(lvl => {
        const lvlHistory = history.filter(h => h.difficulty === lvl);
        const avg = lvlHistory.length > 0
          ? lvlHistory.reduce((acc, h) => acc + h.duration, 0) / lvlHistory.length
          : 0;
        return { level: lvl, avgTime: Number(avg.toFixed(2)) };
      });

      const categoryAnalytics = await this.getAnalytics();

      return {
        overallAccuracy: Math.floor(avgPhonetic),
        phoneticStrength: strengths.length > 0 ? strengths : ["Building foundations"],
        phoneticWeakness: weaknesses.length > 0 ? weaknesses : ["No consistent errors"],
        improvementTrend: last10,
        mostAttemptedWords: wordStats,
        clinicalNote: this.generateClinicalNote(avgPhonetic, last10),
        userStanding: standing,
        responseTimeByLevel: responseTimes,
        curriculumMastery: categoryAnalytics.categories.map(c => ({ name: c.name, percentage: c.percentage })),
        badges: progress.badges || [],
        attempts: progress.totalAttempts || 0,
        stars: progress.totalStars || 0
      };
    } catch (e) {
      console.warn('Clinical report error:', e);
      return {
        overallAccuracy: 0,
        phoneticStrength: [],
        phoneticWeakness: [],
        improvementTrend: [],
        mostAttemptedWords: [],
        clinicalNote: "",
        userStanding: "New User",
        responseTimeByLevel: [],
        curriculumMastery: [],
        badges: [],
        attempts: 0,
        stars: 0
      };
    }
  }

  private generateClinicalNote(avgAcc: number, trend: number[]): string {
    if (trend.length < 2) return "Continue sessions to gather more diagnostic data.";
    const start = trend[0];
    const end = trend[trend.length - 1];
    const diff = end - start;

    let note = `The user shows an average phonetic accuracy of ${Math.floor(avgAcc || 0)}%. `;
    if (diff > 5) note += "A clear positive trend in clarity is observed over recent attempts.";
    else if (diff < -5) note += "Some decline in consistency noted; may indicate fatigue or increased difficulty.";
    else note += "Performance remains stable across practiced vocabulary.";

    return note;
  }

  /**
   * Progress & Badges Logic
   */
  async getProgress(): Promise<UserProgress> {
    try {
      const exists = await RNFS.exists(this.progressPath);
      if (!exists) return { items: {}, badges: [], totalStars: 0, totalAttempts: 0 };
      const content = await RNFS.readFile(this.progressPath);
      return JSON.parse(content);
    } catch (e) {
      return { items: {}, badges: [], totalStars: 0, totalAttempts: 0 };
    }
  }

  async recordLearning(word: string) {
    try {
      const progress = await this.getProgress();
      const wordKey = word.toLowerCase().trim();
      const currentItem = progress.items[wordKey] || { stars: 0, bestScore: 0, isLearned: false, attempts: 0 };

      if (!currentItem.isLearned) {
        currentItem.isLearned = true;
        progress.items[wordKey] = currentItem;
        await RNFS.writeFile(this.progressPath, JSON.stringify(progress, null, 2));
        console.log(`[SpeechAssessment] Recorded learning for: ${wordKey}`);
      }
    } catch (e) {
      console.warn('Record learning error:', e);
    }
  }

  async getAnalytics(): Promise<overallAnalytics> {
    try {
      const progress = await this.getProgress();
      const vocab = require('../../assets/ar/vocabulary-data.json');

      const categoryAnalytics: CategoryAnalytics[] = vocab.categories.map((cat: any) => {
        const items = cat.items || [];
        const learnedInCat = items.filter((item: any) => {
          const prog = progress.items[item.word.toLowerCase().trim()];
          return prog && (prog.isLearned || prog.bestScore > 0);
        }).length;

        return {
          id: cat.id,
          name: cat.name,
          totalCount: items.length,
          learnedCount: learnedInCat,
          percentage: items.length > 0 ? Math.floor((learnedInCat / items.length) * 100) : 0
        };
      });

      const totalAvailable = categoryAnalytics.reduce((acc, cat) => acc + cat.totalCount, 0);
      const totalLearned = Object.values(progress.items).filter(i => i.isLearned || i.bestScore > 0).length;

      // Accuracy calculation (average of best scores > 0)
      const practicedItems = Object.values(progress.items).filter(i => i.bestScore > 0);
      const averageAccuracy = practicedItems.length > 0
        ? Math.floor(practicedItems.reduce((acc, i) => acc + i.bestScore, 0) / practicedItems.length)
        : 0;

      const totalStars = progress.totalStars || 0;
      const { progress: nextProg, nextName } = this.calculateStandingProgress(totalStars);

      return {
        categories: categoryAnalytics,
        totalLearned,
        totalAvailable,
        averageAccuracy,
        streak: 1, // Placeholder for now
        userStanding: this.calculateStanding(totalStars),
        totalStars: totalStars,
        badges: progress.badges || [],
        nextStandingProgress: nextProg,
        nextStandingName: nextName
      };
    } catch (e) {
      console.warn('Get analytics error:', e);
      return {
        categories: [],
        totalLearned: 0,
        totalAvailable: 0,
        averageAccuracy: 0,
        streak: 0,
        userStanding: "New User",
        totalStars: 0,
        badges: [],
        nextStandingProgress: 0,
        nextStandingName: "Developing Speaker"
      };
    }
  }

  private calculateStandingProgress(stars: number): { progress: number; nextName: string } {
    if (stars >= 50) return { progress: 100, nextName: "Max Level Reached" };
    if (stars >= 25) return { progress: Math.floor(((stars - 25) / 25) * 100), nextName: "Speech Master" };
    if (stars >= 10) return { progress: Math.floor(((stars - 10) / 15) * 100), nextName: "Expert Communicator" };
    if (stars >= 2) return { progress: Math.floor(((stars - 2) / 8) * 100), nextName: "Steady Progressor" };
    return { progress: Math.floor((stars / 2) * 100), nextName: "Developing Speaker" };
  }

  private calculateStanding(totalStars: number): string {
    if (totalStars >= 50) return "Speech Master";
    if (totalStars >= 25) return "Expert Communicator";
    if (totalStars >= 10) return "Steady Progressor";
    if (totalStars >= 2) return "Developing Speaker";
    return "Novice Learner";
  }

  private async updateProgress(result: PronunciationResult, category?: string, difficulty?: string) {
    try {
      const progress = await this.getProgress();
      const wordKey = result.word.toLowerCase().trim();

      // Calculate star (Binary: 1 star only if 100% correct)
      const hasStar = result.score >= 95 ? 1 : 0; // Relaxed slightly from 100 for better user feel

      const currentItem = progress.items[wordKey] || { stars: 0, bestScore: 0, isLearned: false, attempts: 0 };

      currentItem.attempts = (currentItem.attempts || 0) + 1;
      progress.totalAttempts = (progress.totalAttempts || 0) + 1;

      // Award star if high score and not already earned
      if (hasStar && currentItem.stars === 0) {
        progress.totalStars = (progress.totalStars || 0) + 1;
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
            return prog && prog.bestScore === 90;
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
      if (history.length > 200) history.shift();
      await RNFS.writeFile(this.historyPath, JSON.stringify(history, null, 2));
    } catch (e) { }
  }

  cleanup() {
    Voice.destroy().then(Voice.removeAllListeners);
  }
}

export const speechAssessmentEngine = new SpeechAssessmentEngine();