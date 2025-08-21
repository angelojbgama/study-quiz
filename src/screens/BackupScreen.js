import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as AuthSession from 'expo-auth-session';
import { exportAllData, importFullBackup } from '../db';
import PrimaryButton from '../components/PrimaryButton';
import useAppStyles from '../ui/useAppStyles';

const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID_AQUI.apps.googleusercontent.com';
const DRIVE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export default function BackupScreen() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const styles = useAppStyles();
  const { colors } = useTheme();

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
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.h2}>Backup & Sincronização</Text>

          <View style={{ marginTop: 8 }}>
            <PrimaryButton title="Exportar (JSON) & Compartilhar" onPress={onExport} disabled={loading} />
          </View>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton title="Importar de arquivo (JSON)" onPress={onImport} disabled={loading} />
          </View>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton title="Enviar backup para Google Drive" onPress={onDriveLoginAndUpload} disabled={loading} />
          </View>

          <View style={{ marginTop: 12 }}>
            {loading ? <ActivityIndicator /> : <Text style={styles.muted}>{status}</Text>}
          </View>
          <Text style={[styles.muted, { marginTop: 12 }]}>
            Observação: crie um OAuth Client (Expo) e coloque o CLIENT_ID em BackupScreen.js.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
