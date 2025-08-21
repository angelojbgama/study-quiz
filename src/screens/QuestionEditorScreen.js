import React, { useState } from 'react';
import { View, TextInput, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import { createQuestion } from '../db';
import useAppStyles from '../ui/useAppStyles';

export default function QuestionEditorScreen({ route, navigation }) {
  const { quizId } = route.params || {};
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [tags, setTags] = useState('');
  const styles = useAppStyles(80);

  const save = async () => { await createQuestion(quizId, text, answer, explanation, tags); navigation.goBack(); };

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.h2}>Nova Pergunta</Text>
          <View style={{ height: 8 }} />
          <Text style={styles.text}>Pergunta (termo)</Text>
          <TextInput style={[styles.input, { height: 100 }]} multiline value={text} onChangeText={setText} textAlignVertical="top" />
          <Text style={styles.text}>Resposta (definição)</Text>
          <TextInput style={styles.input} value={answer} onChangeText={setAnswer} />
          <Text style={styles.text}>Explicação (opcional)</Text>
          <TextInput style={styles.input} value={explanation} onChangeText={setExplanation} />
          <Text style={styles.text}>Tags (opcional)</Text>
          <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="separe por vírgulas" />
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <PrimaryButton title="Salvar" onPress={save} disabled={!text.trim() || !answer.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
