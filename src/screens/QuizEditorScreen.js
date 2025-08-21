import React, { useState, useMemo } from 'react';
import { View, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import { createQuiz } from '../db';

export default function QuizEditorScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const save = async () => { await createQuiz(title, desc); navigation.goBack(); };

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
          <PrimaryButton title="Salvar" onPress={save} disabled={!title.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
