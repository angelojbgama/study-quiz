import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { navTheme } from './src/theme';

import HomeScreen from './src/screens/HomeScreen';
import QuizEditorScreen from './src/screens/QuizEditorScreen';
import QuestionListScreen from './src/screens/QuestionListScreen';
import QuestionEditorScreen from './src/screens/QuestionEditorScreen';
import ImportScreen from './src/screens/ImportScreen';
import LearnScreen from './src/screens/LearnScreen';
import CardsScreen from './src/screens/CardsScreen';
import StatsScreen from './src/screens/StatsScreen';
import StudyTodayScreen from './src/screens/StudyTodayScreen';
import BackupScreen from './src/screens/BackupScreen';
import { initDb } from './src/db';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: navTheme.colors.primary,
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          height: 56,
          paddingTop: 6,
          paddingBottom: 6
        }
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
  );
}

export default function App() {
  const scheme = useColorScheme();
  useEffect(() => { initDb(); }, []);
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Navigator>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="QuizEditor" component={QuizEditorScreen} options={{ title: 'Novo Quiz' }} />
          <Stack.Screen name="QuestionList" component={QuestionListScreen} options={{ title: 'Perguntas' }} />
          <Stack.Screen name="QuestionEditor" component={QuestionEditorScreen} options={{ title: 'Nova Pergunta' }} />
          <Stack.Screen name="Import" component={ImportScreen} options={{ title: 'Importar' }} />
          <Stack.Screen name="Cards" component={CardsScreen} options={{ title: 'Cartões' }} />
          <Stack.Screen name="Learn" component={LearnScreen} options={{ title: 'Aprender' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
