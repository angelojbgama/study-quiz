import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import { getQuestionsByQuiz } from '../db';
import useAppStyles from '../ui/useAppStyles';

export default function QuestionListScreen({ route, navigation }) {
  const { quizId, title } = route.params || {};
  const [questions, setQuestions] = useState([]);
  const styles = useAppStyles();

  useEffect(() => { navigation.setOptions({ title: title || 'Perguntas' }); }, [title]);
  useEffect(() => { const unsub = navigation.addListener('focus', async () => setQuestions(await getQuestionsByQuiz(quizId))); return unsub; }, [navigation]);

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <View style={styles.container}>
        <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <PrimaryButton title="Adicionar" onPress={() => navigation.navigate('QuestionEditor', { quizId })} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
          {questions.map(item => (
            <View key={item.id} style={styles.card}>
              <Text style={[styles.text, { fontWeight: '700', fontSize: 16 }]}>{item.text}</Text>
              <Text style={styles.text}>Resposta: {item.answer}</Text>
              {item.explanation ? <Text style={styles.text}>Explicação: {item.explanation}</Text> : null}
              {item.tags ? <Text style={styles.muted}>Tags: {item.tags}</Text> : null}
            </View>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16 }}>
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
