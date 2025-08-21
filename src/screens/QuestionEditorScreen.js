import React, { useState, useMemo } from 'react';
import { View, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import { createQuestion } from '../db';

export default function QuestionEditorScreen({ route, navigation }) {
  const { quizId } = route.params || {};
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [tags, setTags] = useState('');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const save = async () => { await createQuestion(quizId, text, answer, explanation, tags); navigation.goBack(); };

  const styles = useMemo(() => StyleSheet.create({
    sa: { flex: 1, backgroundColor: colors.background },
    label: { fontWeight: '600', marginBottom: 6, color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: colors.card,
      marginBottom: 12,
      color: colors.text
    },
    footer: { paddingHorizontal: 16 }
  }), [colors]);

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Pergunta (termo)</Text>
          <TextInput style={[styles.input, { height: 100 }]} multiline value={text} onChangeText={setText} textAlignVertical="top" />
          <Text style={styles.label}>Resposta (definição)</Text>
          <TextInput style={styles.input} value={answer} onChangeText={setAnswer} />
          <Text style={styles.label}>Explicação (opcional)</Text>
          <TextInput style={styles.input} value={explanation} onChangeText={setExplanation} />
          <Text style={styles.label}>Tags (opcional)</Text>
          <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="separe por vírgulas" />
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <PrimaryButton title="Salvar" onPress={save} disabled={!text.trim() || !answer.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
