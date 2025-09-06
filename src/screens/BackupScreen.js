// src/screens/BackupScreen.js
import React, { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { exportAllData, importFullBackup } from "../db";
import PrimaryButton from "../components/PrimaryButton";
import useAppStyles from "../ui/useAppStyles";
import { VStack } from "../ui/Stack";
import { logCaughtError, shareLatestLog } from "../util/logger";

export default function BackupScreen({ navigation }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const styles = useAppStyles();

  const onExport = async () => {
    try {
      setLoading(true);
      setStatus("Gerando backup...");
      const data = await exportAllData();
      const content = JSON.stringify({ version:1, exportedAt:new Date().toISOString(), data }, null, 2);
      const uri = FileSystem.documentDirectory + "studyquiz-backup.json";
      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
      setStatus("Compartilhando arquivo...");
      await Sharing.shareAsync(uri, { mimeType: "application/json" });
      setStatus("");
    } catch (e) {
      setStatus("Falha ao exportar: " + e.message);
      await logCaughtError(e, 'backup-export');
    } finally { setLoading(false); }
  };

  const onImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json"], copyToCacheDirectory: true });
      if (result.canceled) return;
      setLoading(true);
      setStatus("Lendo backup...");
      const asset = result.assets[0];
      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed?.data)) throw new Error('Formato inválido');
      setStatus("Importando...");
      await importFullBackup(parsed.data);
      setStatus(`Importação concluída! Conjuntos: ${parsed.data.length}`);
      setTimeout(()=> navigation.getParent()?.navigate('Início'), 800);
    } catch (e) {
      setStatus("Falha ao importar: " + e.message);
      await logCaughtError(e, 'backup-import');
    } finally { setLoading(false); }
  };

  const onShareLastLog = async () => {
    try {
      setStatus("Abrindo último log de erro...");
      const path = await shareLatestLog();
      if (!path) setStatus("Nenhum log encontrado ainda.");
      else setStatus(`Log compartilhado: ${path}`);
    } catch (e) {
      setStatus("Falha ao compartilhar log: " + e.message);
      await logCaughtError(e, 'share-latest-log');
    }
  };

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <VStack space={12} style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.h2}>Backup (Local)</Text>
          <View style={{ height: 8 }} />
          <VStack space={8}>
            <PrimaryButton title="Exportar (JSON) & Compartilhar" onPress={onExport} disabled={loading} />
            <PrimaryButton title="Importar de arquivo (Backup JSON)" onPress={onImport} disabled={loading} />
            <PrimaryButton title="Compartilhar último log de erro (.txt)" onPress={onShareLastLog} disabled={loading} variant="secondary" />
          </VStack>
          <View style={{ height: 8 }} />
          {loading ? <ActivityIndicator /> : <Text style={styles.muted}>{status}</Text>}
        </View>
      </VStack>
    </SafeAreaView>
  );
}
