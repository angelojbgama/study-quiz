import React, { useState } from 'react';
import { View, Text, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { importText } from '../util/importer';
import useAppStyles from '../ui/useAppStyles';

export default function ImportScreen({ navigation }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('file'); // 'file' | 'paste'
  const [pasted, setPasted] = useState('');
  const styles = useAppStyles();
  const { colors } = useTheme();

  const pick = async () => {
    try {
      setStatus('');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json', 'text/plain'],
        copyToCacheDirectory: true
      });
      if (result.canceled) return;
      setLoading(true);
      const asset = result.assets[0];
      setStatus('Lendo arquivo...');
      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      await doImport(text);
    } catch (e) {
      console.error(e);
      setStatus('Erro ao importar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const doImport = async (text) => {
    setStatus('Importando...');
    const { importedCount, quizzesCount } = await importText(text);
    setStatus(`Importado com sucesso! Itens: ${importedCount} • Quizzes: ${quizzesCount}`);
    setTimeout(() => navigation.goBack(), 800);
  };

  const importFromPaste = async () => {
    if (!pasted.trim()) { setStatus('Cole o conteúdo primeiro.'); return; }
    try {
      setLoading(true);
      await doImport(pasted);
    } catch (e) {
      console.error(e);
      setStatus('Erro ao importar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const Tab = ({ selected, label, onPress }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: selected ? styles.card.backgroundColor : '#eee', marginRight: 6 },
        pressed && { opacity: 0.9 }
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.text, selected && { fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Tab label="Arquivo" selected={mode === 'file'} onPress={() => setMode('file')} />
            <Tab label="Colar JSON/CSV" selected={mode === 'paste'} onPress={() => setMode('paste')} />
          </View>

          {mode === 'file' ? (
            <View style={styles.panel}>
              <Text style={styles.text}>Selecione um arquivo CSV ou JSON com perguntas e respostas.</Text>
              <View style={{ height: 12 }} />
              <PrimaryButton title={loading ? 'Processando...' : 'Escolher arquivo'} onPress={pick} disabled={loading} />
            </View>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.text}>Cole seu conteúdo abaixo (JSON, JSONL ou CSV):</Text>
              <TextInput
                style={[styles.input, { minHeight: 220, marginTop: 8, textAlignVertical: 'top' }]}
                multiline
                value={pasted}
                onChangeText={setPasted}
                placeholder={`Exemplos:

JSON (array):
[
  {"quiz":"Biologia","question":"DNA é...","answer":"ácido desoxirribonucleico","tags":"bio, genética"},
  {"quiz":"Biologia","pergunta":"RNA é...","resposta":"ácido ribonucleico","tags":"bio"}
]

JSONL (um por linha):
{"quiz":"História","question":"Independência?","answer":"1822"}
{"quiz":"História","question":"Primeiro imperador?","answer":"D. Pedro I","tags":"brasil,monarquia"}

CSV:
quiz,pergunta,resposta,explicacao,tags
Biologia,DNA é...,ácido desoxirribonucleico,,bio;genética
`}
              />
              <View style={{ height: 8 }} />
              <PrimaryButton title={loading ? 'Importando...' : 'Importar do texto'} onPress={importFromPaste} disabled={loading} />
            </View>
          )}

          <View style={{ height: 16 }} />
          {loading ? <ActivityIndicator /> : <Text style={styles.muted}>{status}</Text>}
          <View style={{ height: 12 }} />
          <Text style={styles.muted}>CSV: quiz,pergunta,resposta,explicacao,tags</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
