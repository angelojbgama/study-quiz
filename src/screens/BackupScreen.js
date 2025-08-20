import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as AuthSession from 'expo-auth-session';
import { exportAllData, importFullBackup } from '../db';

const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID_AQUI.apps.googleusercontent.com';
const DRIVE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export default function BackupScreen() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const onExport = async () => {
    try {
      setLoading(true);
      setStatus('Gerando backup...');
      const data = await exportAllData();
      const content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
      const uri = FileSystem.documentDirectory + 'studyquiz-backup.json';
      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
      setStatus('Backup salvo. Compartilhando...');
      await Sharing.shareAsync(uri, { mimeType: 'application/json' });
      setStatus('');
    } catch (e) {
      console.error(e);
      setStatus('Falha ao exportar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const onImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      setLoading(true);
      setStatus('Lendo arquivo...');
      const asset = result.assets[0];
      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(text);
      await importFullBackup(parsed.data || parsed);
      setStatus('Importação concluída!');
    } catch (e) {
      console.error(e);
      setStatus('Falha ao importar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const onDriveLoginAndUpload = async () => {
    try {
      setLoading(true);
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(DRIVE_UPLOAD_SCOPE)}`;
      const res = await AuthSession.startAsync({ authUrl });
      if (res.type !== 'success') return;
      const accessToken = res.params.access_token;

      const data = await exportAllData();
      const content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data });

      setStatus('Enviando para o Google Drive...');
      const boundary = 'foo_bar_baz';
      const metadata = { name: 'studyquiz-backup.json' };
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'multipart/related; boundary=' + boundary
        },
        body
      });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      setStatus('Backup enviado para o Drive!');
    } catch (e) {
      console.error(e);
      setStatus('Falha ao sincronizar com Drive: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Backup & Sincronização</Text>
        <View style={{ marginBottom: 8 }}><Button title="Exportar (JSON) & Compartilhar" onPress={onExport} /></View>
        <View style={{ marginBottom: 8 }}><Button title="Importar de arquivo (JSON)" onPress={onImport} /></View>
        <View style={{ marginBottom: 8 }}><Button title="Enviar backup para Google Drive" onPress={onDriveLoginAndUpload} /></View>
        {loading ? <ActivityIndicator /> : <Text style={{ color: '#555', marginTop: 8 }}>{status}</Text>}
        <Text style={{ color: '#777', marginTop: 12 }}>
          Observação: crie um OAuth Client (Expo) e coloque o CLIENT_ID em BackupScreen.js.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  panel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 }
});
