/* ===== INÍCIO: App.js ===== */
// App.js
import 'react-native-gesture-handler';
import React, { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';

import { navLightTheme } from './src/theme';
import { initDb } from './src/db';
import useAndroidNavHidden from './src/ui/useAndroidNavHidden';
import { initErrorLogging } from './src/util/logger';

// Telas
import HomeScreen from './src/screens/HomeScreen';
import QuestionListScreen from './src/screens/QuestionListScreen';
import QuestionEditorScreen from './src/screens/QuestionEditorScreen';
import OptionEditorScreen from './src/screens/OptionEditorScreen';
import ImportScreen from './src/screens/ImportScreen';
import LearnScreen from './src/screens/LearnScreen';
import ConclusionScreen from './src/screens/ConclusionScreen';
import StatsScreen from './src/screens/StatsScreen';
import StudyTodayScreen from './src/screens/StudyTodayScreen';
import BackupScreen from './src/screens/BackupScreen';

const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const StudyStack = createNativeStackNavigator();
const StatsStack = createNativeStackNavigator();
const BackupStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const baseStackOptions = (colors) => ({
  headerStyle: { backgroundColor: colors.card },
  headerTitleStyle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  headerTintColor: colors.primary,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
});

function HomeStackNavigator() {
  const colors = navLightTheme.colors;
  return (
    <HomeStack.Navigator screenOptions={baseStackOptions(colors)}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
      <HomeStack.Screen name="QuestionList" component={QuestionListScreen} options={{ title: 'Perguntas' }} />
      <HomeStack.Screen name="QuestionEditor" component={QuestionEditorScreen} options={{ title: 'Pergunta' }} />
      <HomeStack.Screen name="OptionEditor" component={OptionEditorScreen} options={{ title: 'Alternativas' }} />
      <HomeStack.Screen name="Import" component={ImportScreen} options={{ title: 'Importar' }} />
      <HomeStack.Screen
        name="Learn"
        component={LearnScreen}
        options={{ title: 'Quiz', headerBackVisible: false, gestureEnabled: false }}
      />
      <HomeStack.Screen
        name="Conclusion"
        component={ConclusionScreen}
        options={{ title: 'Conclusão', headerBackVisible: false, gestureEnabled: false }}
      />
    </HomeStack.Navigator>
  );
}

function StudyStackNavigator() {
  const colors = navLightTheme.colors;
  return (
    <StudyStack.Navigator screenOptions={baseStackOptions(colors)}>
      <StudyStack.Screen name="StudyToday" component={StudyTodayScreen} options={{ title: 'Estudar' }} />
    </StudyStack.Navigator>
  );
}

function StatsStackNavigator() {
  const colors = navLightTheme.colors;
  return (
    <StatsStack.Navigator screenOptions={baseStackOptions(colors)}>
      <StatsStack.Screen name="Stats" component={StatsScreen} options={{ title: 'Estatísticas' }} />
    </StatsStack.Navigator>
  );
}

function BackupStackNavigator() {
  const colors = navLightTheme.colors;
  return (
    <BackupStack.Navigator screenOptions={baseStackOptions(colors)}>
      <BackupStack.Screen name="BackupMain" component={BackupScreen} options={{ title: 'Backup' }} />
    </BackupStack.Navigator>
  );
}

function Tabs() {
  const colors = navLightTheme.colors;
  const defaultTabBarStyle = {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    height: 56,
    paddingTop: 6,
    paddingBottom: 6,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: defaultTabBarStyle,
        tabBarHideOnKeyboard: true,
        sceneContainerStyle: { backgroundColor: colors.background }, // prop correta
      }}
    >
      <Tab.Screen
        name="Início"
        component={HomeStackNavigator}
        options={({ route }) => {
          const rn = getFocusedRouteNameFromRoute(route) ?? 'Home';
          const shouldHide = ['Learn', 'Conclusion'].includes(rn);
          return {
            tabBarStyle: [defaultTabBarStyle, shouldHide && { display: 'none' }],
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-variant" color={color} size={size} />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Estudar"
        component={StudyStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-variant" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Estatísticas"
        component={StatsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line-variant" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Backup"
        component={BackupStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cloud-upload" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: navLightTheme.colors.background } }}
    >
      <RootStack.Screen name="Tabs" component={Tabs} />
    </RootStack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    initDb();
    initErrorLogging();
  }, []);

  // Global: manter sempre em imersivo
  useAndroidNavHidden(true, { reapplyOnFocus: false }); // (compat) segundo argumento é ignorado

  // Reaplicar hide a cada mudança de rota (cobre OEMs teimosos)
  const rehideOnNavChange = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        // NÃO chamar setBehaviorAsync aqui para evitar WARN com edge-to-edge
      } catch {}
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navLightTheme} onStateChange={rehideOnNavChange}>
        <StatusBar hidden />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
/* =====  FIM  : App.js ===== */
