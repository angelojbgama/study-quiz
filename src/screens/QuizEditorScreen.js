import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createQuiz } from '../db';

export default function QuizEditorScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const save = async () => { await createQuiz(title, desc); navigation.goBack(); };

  return (
    <SafeAreaView style={styles.sa} edges={['top','bottom']}>
      <View style={styles.container}>
        <Text style={styles.label}>Título</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput style={[styles.input, { height: 100 }]} multiline value={desc} onChangeText={setDesc} />
        <Button title="Salvar" onPress={save} disabled={!title.trim()} />
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
