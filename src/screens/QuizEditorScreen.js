import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { createQuiz } from '../db';

export default function QuizEditorScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const save = async () => { await createQuiz(title, desc); navigation.goBack(); };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Título</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput style={[styles.input, { height: 100 }]} multiline value={desc} onChangeText={setDesc} />
      <Button title="Salvar" onPress={save} disabled={!title.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }
});
