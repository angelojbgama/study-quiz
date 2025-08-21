import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { importText } from '../util/importer';

export default function ImportScreen({ navigation }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
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
      setStatus('Importando...');
      await importText(text);
      setStatus('Importado com sucesso!');
      setTimeout(() => navigation.goBack(), 700);
    } catch (e) {
      console.error(e);
      setStatus('Erro ao importar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    sa: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, padding: 16 },
    status: { color: colors.muted },
    hint: { color: colors.muted }
  }), [colors]);

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={{ color: colors.text }}>Selecione um arquivo CSV ou JSON com perguntas e respostas.</Text>
        <View style={{ height: 12 }} />
        <PrimaryButton title={loading ? 'Processando...' : 'Escolher arquivo'} onPress={pick} disabled={loading} />
        <View style={{ height: 16 }} />
        {loading ? <ActivityIndicator /> : <Text style={styles.status}>{status}</Text>}
        <View style={{ height: 12 }} />
        <Text style={styles.hint}>CSV: quiz,pergunta,resposta,explicacao,tags</Text>
      </View>
    </SafeAreaView>
  );
}
