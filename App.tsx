import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from './src/styles/constants';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CategorySelectionScreen from './src/screens/CategorySelectionScreen';
import ARLearningScreen from './src/screens/ARLearningScreen';
import SpeechAssessmentScreen from './src/screens/SpeechAssessmentScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HelpScreen from './src/screens/HelpScreen';
import VoiceTestScreen from './src/screens/VoiceTestScreen';
import ClinicalReportScreen from './src/screens/ClinicalReportScreen';
import VRLearningScreen from './src/screens/VRLearningScreen';

// Types
import { RootStackParamList, TabStackParamList } from './src/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabStackParamList>();

// Tab Wrappers to pass initialMode
const ARTab = ({ navigation }: any) => (
  <CategorySelectionScreen navigation={navigation} route={{ params: { initialMode: 'learning' } }} />
);

const VRTab = ({ navigation }: any) => (
  <CategorySelectionScreen navigation={navigation} route={{ params: { initialMode: 'vr' } }} />
);

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home-outline';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'AR') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'VR') {
            iconName = focused ? 'glasses' : 'glasses-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="AR" component={ARTab} options={{ tabBarLabel: 'AR Room' }} />
      <Tab.Screen name="VR" component={VRTab} options={{ tabBarLabel: 'VR Practice' }} />
      <Tab.Screen name="Analytics" component={ProgressScreen} options={{ tabBarLabel: 'Analytics' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <Stack.Navigator
            initialRouteName="MainTabs"
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
            }}
          >
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="VoiceTest" component={VoiceTestScreen} />
            <Stack.Screen name="Categories" component={CategorySelectionScreen} />
            <Stack.Screen name="Learning" component={ARLearningScreen} />
            <Stack.Screen name="VRLearning" component={VRLearningScreen} />
            <Stack.Screen name="Assessment" component={SpeechAssessmentScreen} />
            <Stack.Screen name="Progress" component={ProgressScreen} />
            <Stack.Screen name="ClinicalReport" component={ClinicalReportScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
