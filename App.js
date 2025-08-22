// App.js
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { navLightTheme } from './src/theme';

import HomeScreen from './src/screens/HomeScreen';
import QuizEditorScreen from './src/screens/QuizEditorScreen';
import QuestionListScreen from './src/screens/QuestionListScreen';
import QuestionEditorScreen from './src/screens/QuestionEditorScreen';
import ImportScreen from './src/screens/ImportScreen';
import LearnScreen from './src/screens/LearnScreen';
import CardsScreen from './src/screens/CardsScreen';
import ConclusionScreen from './src/screens/ConclusionScreen'; // 👈 novo
import OptionEditorScreen from './src/screens/OptionEditorScreen'; // 👈 novo

import StatsScreen from './src/screens/StatsScreen';
import StudyTodayScreen from './src/screens/StudyTodayScreen';
import BackupScreen from './src/screens/BackupScreen';
import { initDb } from './src/db';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  const colors = navLightTheme.colors;

  // 👉 SafeAreaView com edges=['top'] APENAS nas telas do Tab
  // Isso cria a “faixa branca” no topo somente onde não há botão de voltar.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }} edges={['top']}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 56,
            paddingTop: 6,
            paddingBottom: 6,
          },
        }}
      >
        <Tab.Screen
          name="Início"
          component={HomeScreen}
          options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-variant" color={color} size={size} /> }}
        />
        <Tab.Screen
          name="Estudar"
          component={StudyTodayScreen}
          options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="book-open-variant" color={color} size={size} /> }}
        />
        <Tab.Screen
          name="Estatísticas"
          component={StatsScreen}
          options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line-variant" color={color} size={size} /> }}
        />
        <Tab.Screen
          name="Backup"
          component={BackupScreen}
          options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cloud-upload" color={color} size={size} /> }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function App() {
  useEffect(() => { initDb(); }, []);
  const colors = navLightTheme.colors;

  return (
    <SafeAreaProvider>

      <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }} edges={['bottom']}>
        <NavigationContainer theme={navLightTheme}>
          <StatusBar style="dark" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.card },
              headerTitleStyle: { color: colors.text, fontSize: 16, fontWeight: '600' },
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerShadowVisible: false,

              // Header compacto no Android
              statusBarTranslucent: false,
              ...(Platform.OS === 'android' ? { headerStatusBarHeight: 0 } : null),

              contentStyle: { backgroundColor: colors.background },
            }}
          >
            {/* Tabs sem header, com safe-area superior próprio */}
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />

            {/* Demais telas (com botão de voltar) — sem safe-area top extra */}
            <Stack.Screen name="QuizEditor" component={QuizEditorScreen} options={{ title: 'Novo Quiz' }} />
            <Stack.Screen name="QuestionList" component={QuestionListScreen} options={{ title: 'Perguntas' }} />
            <Stack.Screen name="QuestionEditor" component={QuestionEditorScreen} options={{ title: 'Nova Pergunta' }} />
            <Stack.Screen name="Import" component={ImportScreen} options={{ title: 'Importar' }} />
            <Stack.Screen name="Cards" component={CardsScreen} options={{ title: 'Cartões' }} />
            <Stack.Screen name="Learn" component={LearnScreen} options={{ title: 'Aprender' }} />
            <Stack.Screen name="Conclusion" component={ConclusionScreen} options={{ title: 'Conclusão', headerBackVisible: false, gestureEnabled: false }} />
            <Stack.Screen name="OptionEditor" component={OptionEditorScreen} options={{ title: 'Alternativas' }} />

          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
