import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { getQuestionsByQuiz } from '../db';

export default function QuestionListScreen({ route, navigation }) {
  const { quizId, title } = route.params || {};
  const [questions, setQuestions] = useState([]);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    sa: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    actions: { marginBottom: 10, alignItems: 'flex-end' },
    list: { flex: 1 },
    card: { padding: 12, backgroundColor: colors.card, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    q: { fontWeight: '700', fontSize: 16, flexWrap: 'wrap', color: colors.text },
    a: { marginTop: 6, color: colors.text },
    exp: { marginTop: 6, color: colors.text },
    tags: { marginTop: 4, color: colors.muted },
    footer: { flexDirection: 'row', marginTop: 8 }
  }), [colors]);

  useEffect(() => { navigation.setOptions({ title: title || 'Perguntas' }); }, [title]);

  const load = async () => { setQuestions(await getQuestionsByQuiz(quizId)); };
  useEffect(() => { const unsub = navigation.addListener('focus', load); return unsub; }, [navigation]);

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.actions}>
          <PrimaryButton title="Adicionar" onPress={() => navigation.navigate('QuestionEditor', { quizId })} />
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }}>
          {questions.map(item => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.q}>{item.text}</Text>
              <Text style={styles.a}>Resposta: {item.answer}</Text>
              {item.explanation ? <Text style={styles.exp}>Explicação: {item.explanation}</Text> : null}
              {item.tags ? <Text style={styles.tags}>Tags: {item.tags}</Text> : null}
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Cartões" onPress={() => navigation.navigate('Cards', { quizId })} />
          </View>
          <View style={{ width: 8 }} />
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Aprender" onPress={() => navigation.navigate('Learn', { quizId })} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
