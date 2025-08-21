import React, { useState } from 'react';
<<<<<<< HEAD
import { View, TextInput, Button, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
=======
import { View, TextInput, StyleSheet, Text } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
>>>>>>> 642b7f6d21dfb5692952ed71aa2eba2824c6da18
import { createQuiz } from '../db';

export default function QuizEditorScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const insets = useSafeAreaInsets();

  const save = async () => { await createQuiz(title, desc); navigation.goBack(); };

  return (
<<<<<<< HEAD
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Biologia - Genética"
            accessibilityLabel="Título do quiz"
          />
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, { height: 120 }]}
            multiline
            value={desc}
            onChangeText={setDesc}
            placeholder="Resumo do conteúdo"
            textAlignVertical="top"
          />
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Button title="Salvar" onPress={save} disabled={!title.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
=======
    <View style={styles.container}>
      <Text style={styles.label}>Título</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput style={[styles.input, { height: 100 }]} multiline value={desc} onChangeText={setDesc} />
      <PrimaryButton title="Salvar" onPress={save} disabled={!title.trim()} />
    </View>
>>>>>>> 642b7f6d21dfb5692952ed71aa2eba2824c6da18
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: '#f7f7f7' },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 12 },
  footer: { paddingHorizontal: 16 }
});
