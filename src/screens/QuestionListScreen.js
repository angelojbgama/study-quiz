import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getQuestionsByQuiz } from '../db';

export default function QuestionListScreen({ route, navigation }) {
  const { quizId, title } = route.params || {};
  const [questions, setQuestions] = useState([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({ title: title || 'Perguntas' });
  }, [title]);

  const load = async () => {
    const list = await getQuestionsByQuiz(quizId);
    setQuestions(list);
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.actions}>
          <Button title="Adicionar" onPress={() => navigation.navigate('QuestionEditor', { quizId })} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator
        >
          {questions.map(item => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.q}>{item.text}</Text>
              <Text style={styles.a}>Resposta: {item.answer}</Text>
              {item.explanation ? <Text style={styles.exp}>Explicação: {item.explanation}</Text> : null}
              {item.tags ? <Text style={styles.tags}>Tags: {item.tags}</Text> : null}
            </View>
          ))}
        </ScrollView>

        {/* Rodapé com espaço para a barra do sistema */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={{ flex: 1 }}>
            <Button title="Cartões" onPress={() => navigation.navigate('Cards', { quizId })} />
          </View>
          <View style={{ width: 8 }} />
          <View style={{ flex: 1 }}>
            <Button title="Aprender" onPress={() => navigation.navigate('Learn', { quizId })} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: '#f7f7f7' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  actions: { marginBottom: 10, alignItems: 'flex-end' },
  list: { flex: 1 },
  card: {
    padding: 12, backgroundColor: '#fff', borderRadius: 8,
    marginBottom: 8, borderWidth: 1, borderColor: '#eee'
  },
  q: { fontWeight: '700', fontSize: 16, flexWrap: 'wrap' },
  a: { marginTop: 6 },
  exp: { marginTop: 6, color: '#333' },
  tags: { marginTop: 4, color: '#555' },
  footer: { flexDirection: 'row', marginTop: 8 }
});
