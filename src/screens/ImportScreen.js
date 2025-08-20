import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { importText } from '../util/importer';

export default function ImportScreen({ navigation }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    try {
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
      setTimeout(() => navigation.goBack(), 600);
    } catch (e) {
      console.error(e);
      setStatus('Erro ao importar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Selecione um arquivo CSV ou JSON com perguntas e respostas.</Text>
      <View style={{ height: 12 }} />
      <Button title="Escolher arquivo" onPress={pick} />
      <View style={{ height: 16 }} />
      {loading ? <ActivityIndicator /> : <Text style={{ color: '#555' }}>{status}</Text>}
      <View style={{ height: 12 }} />
      <Text style={{ color: '#777' }}>CSV: quiz,pergunta,resposta,explicacao,tags</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
