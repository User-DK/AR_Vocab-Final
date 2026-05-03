import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PermissionsAndroid,
  Platform,
  Alert,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice from '@dev-amirzubair/react-native-voice';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

export default function VoiceTestScreen({ navigation }: any) {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Idle');
  const [nativeModulesList, setNativeModulesList] = useState<string[]>([]);
  const [voiceModuleExists, setVoiceModuleExists] = useState<boolean | string>(false);

  useEffect(() => {
    // Audit what native modules we actually have
    const modules = Object.keys(NativeModules).sort();
    setNativeModulesList(modules);

    // Check if 'Voice' or 'RCTVoice' exists
    if (NativeModules.Voice) setVoiceModuleExists('Voice');
    else if (NativeModules.RCTVoice) setVoiceModuleExists('RCTVoice');
    else setVoiceModuleExists(false);

    Voice.onSpeechStart = () => {
      setIsListening(true);
      setStatus('Listening...');
    };
    Voice.onSpeechEnd = () => {
      setIsListening(false);
      setStatus('Processing...');
    };
    Voice.onSpeechError = (e) => {
      setError(JSON.stringify(e.error));
      setIsListening(false);
      setStatus('Error');
    };
    Voice.onSpeechResults = (e) => {
      if (e.value) {
        setRecognizedText(e.value[0]);
        setStatus('Finished');
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startListening = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Microphone access is required');
          return;
        }
      }

      setRecognizedText('');
      setError('');

      console.log('Voice instance:', Voice);
      console.log('NativeModules.Voice:', NativeModules.Voice);
      console.log('NativeModules.RCTVoice:', NativeModules.RCTVoice);

      await Voice.start('en-US');
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      console.error(e);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Voice Diagnostic</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Detected Module:</Text>
          <Text style={[styles.statusValue, { color: voiceModuleExists ? '#10B981' : '#EF4444' }]}>
            {voiceModuleExists ? `Found (${voiceModuleExists})` : 'NOT FOUND'}
          </Text>
        </View>

        <View style={styles.resultBox}>
          <Text style={styles.label}>Result:</Text>
          <Text style={styles.resultText}>{recognizedText || '...'}</Text>
          {error ? <Text style={styles.errorText}>Error: {error}</Text> : null}
        </View>

        <View style={styles.debugBox}>
          <Text style={styles.label}>Available Native Modules:</Text>
          <Text style={styles.debugText}>{nativeModulesList.join(', ')}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.micBtn, isListening && styles.micBtnActive]}
          onPress={isListening ? stopListening : startListening}
        >
          <LinearGradient
            colors={isListening ? ['#EF4444', '#B91C1C'] : ['#6366F1', '#4F46E5']}
            style={styles.micGradient}
          >
            <Icon name={isListening ? "stop" : "mic"} size={40} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  statusCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  statusLabel: { color: '#6B7280' },
  statusValue: { fontWeight: 'bold' },
  resultBox: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 20 },
  label: { fontSize: 10, color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase' },
  resultText: { fontSize: 24, fontWeight: 'bold' },
  errorText: { color: '#EF4444', marginTop: 10, fontSize: 12 },
  debugBox: { backgroundColor: '#E5E7EB', padding: 15, borderRadius: 12 },
  debugText: { fontSize: 10, color: '#4B5563', fontFamily: 'monospace' },
  footer: { padding: 30, alignItems: 'center' },
  micBtn: { width: 80, height: 80, borderRadius: 40 },
  micBtnActive: { transform: [{ scale: 1.1 }] },
  micGradient: { flex: 1, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
});
