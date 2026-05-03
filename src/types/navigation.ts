export type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Categories: { initialMode?: 'learning' | 'practice' | 'vr' };
  Learning: { category: string; difficulty?: string; mode?: string };
  VRLearning: { category: string; difficulty?: string; mode?: string };
  Assessment: { category: string; difficulty?: string; mode?: string };
  SpeechAssessment: { category: string; itemIndex?: number };
  Progress: undefined;
  ClinicalReport: undefined;
  Settings: undefined;
  Help: undefined;
  VoiceTest: undefined;
};

export type TabStackParamList = {
  Dashboard: undefined;
  AR: { initialMode: 'learning' };
  VR: { initialMode: 'vr' };
  Analytics: undefined;
  Settings: undefined;
};

export interface NavigationProps {
  navigation: any;
  route?: any;
}