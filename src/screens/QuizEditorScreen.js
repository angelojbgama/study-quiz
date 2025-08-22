import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "../components/PrimaryButton";
import { createQuiz } from "../db";
import useAppStyles from "../ui/useAppStyles";

export default function QuizEditorScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const styles = useAppStyles(80);

  const save = async () => {
    await createQuiz(title, desc);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.h2}>Novo Quiz</Text>
          <View style={{ height: 8 }} />
          <Text style={styles.text}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Biologia - Genética"
            accessibilityLabel="Título do quiz"
          />
          <Text style={styles.text}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, { height: 120 }]}
            multiline
            value={desc}
            onChangeText={setDesc}
            placeholder="Resumo do conteúdo"
            textAlignVertical="top"
          />
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <PrimaryButton
            title="Salvar"
            onPress={save}
            disabled={!title.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
