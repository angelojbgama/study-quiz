// src/screens/ImportScreen.js
import React, { useState } from "react";
import { View, Text, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import PrimaryButton from "../components/PrimaryButton";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { importText } from "../db";
import useAppStyles from "../ui/useAppStyles";
import { VStack } from "../ui/Stack";

export default function ImportScreen({ navigation }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [pasted, setPasted] = useState("");
  const { colors } = useTheme();
  const styles = useAppStyles();

  const pick = async () => {
    try {
      setStatus("");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setLoading(true);
      const asset = result.assets[0];
      setStatus("Lendo arquivo...");
      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      setStatus("Importando...");
      const { importedCount, quizzesCount } = await importText(text);
      setStatus(`Importado! Itens: ${importedCount} • Quizzes: ${quizzesCount}`);
      setTimeout(()=> navigation.goBack(), 800);
    } catch (e) {
      setStatus("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const importFromPaste = async () => {
    if (!pasted.trim()) { setStatus("Cole o conteúdo primeiro."); return; }
    try {
      setLoading(true);
      setStatus("Importando...");
      const res = await importText(pasted);
      setStatus(`Importado! Itens: ${res.importedCount} • Quizzes: ${res.quizzesCount}`);
      setTimeout(()=> navigation.goBack(), 800);
    } catch (e) {
      setStatus("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          <VStack space={12}>
            <View style={styles.panel}>
              <Text style={styles.text}>Importe CSV/JSON para criar quizzes com questões.</Text>
              <View style={{ height: 8 }} />
              <PrimaryButton title={loading ? "Processando..." : "Escolher arquivo (JSON/CSV)"} onPress={pick} disabled={loading} />
            </View>

            <View style={styles.panel}>
              <Text style={styles.text}>Colar (JSON/JSONL/CSV):</Text>
              <TextInput
                style={[styles.input, { minHeight: 220, textAlignVertical: "top" }]}
                multiline value={pasted} onChangeText={setPasted} placeholder="Cole aqui..."
              />
              <PrimaryButton title={loading ? "Importando..." : "Importar do texto"} onPress={importFromPaste} disabled={loading} />
            </View>

            {loading ? <ActivityIndicator /> : <Text style={styles.muted}>{status}</Text>}
            <Text style={styles.muted}>CSV sem cabeçalho: quiz,pergunta,resposta,explicacao,tags,wrong1,wrong2,wrong3</Text>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
