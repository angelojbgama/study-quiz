import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createQuestion } from '../db';

export default function QuestionEditorScreen({ route, navigation }) {
  const { quizId } = route.params || {};
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [tags, setTags] = useState('');

  const save = async () => {
    await createQuestion(quizId, text, answer, explanation, tags);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.sa} edges={['top','bottom']}>
      <View style={styles.container}>
        <Text style={styles.label}>Pergunta (termo)</Text>
        <TextInput style={[styles.input, { height: 100 }]} multiline value={text} onChangeText={setText} />
        <Text style={styles.label}>Resposta (definição)</Text>
        <TextInput style={styles.input} value={answer} onChangeText={setAnswer} />
        <Text style={styles.label}>Explicação (opcional)</Text>
        <TextInput style={styles.input} value={explanation} onChangeText={setExplanation} />
        <Text style={styles.label}>Tags (opcional)</Text>
        <TextInput style={styles.input} value={tags} onChangeText={setTags} />
        <Button title="Salvar" onPress={save} disabled={!text.trim() || !answer.trim()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: '#f7f7f7' },
  container: { flex: 1, padding: 16, gap: 8 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }
});
