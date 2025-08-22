// src/screens/QuestionEditorScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "../components/PrimaryButton";
import useAppStyles from "../ui/useAppStyles";
import {
  createQuestion,
  getQuestionById,
  updateQuestion,
  replaceOptions,
} from "../db";
import { VStack } from "../ui/Stack";

export default function QuestionEditorScreen({ route, navigation }) {
  const { quizId, questionId } = route.params || {};
  const styles = useAppStyles(80);

  const isEditing = !!questionId;

  // Campos base
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [tags, setTags] = useState("");

  // Campo de resposta correta (sempre disponível)
  const [answer, setAnswer] = useState("");

  // Criação: atalho para alternativas erradas
  const [wrong1, setWrong1] = useState("");
  const [wrong2, setWrong2] = useState("");
  const [wrong3, setWrong3] = useState("");

  useEffect(() => {
    (async () => {
      if (!isEditing) return;
      const q = await getQuestionById(questionId);
      setText(q?.text || "");
      setExplanation(q?.explanation || "");
      setTags(q?.tags || "");
      setAnswer(q?.answer || "");
    })();
  }, [isEditing, questionId]);

  const saveCreate = async () => {
    const t = text.trim();
    const a = answer.trim();
    if (!t || !a) {
      Alert.alert("Atenção", "Preencha a pergunta e a resposta correta.");
      return;
    }

    // 1) cria a pergunta
    const newId = await createQuestion(quizId, t, a, explanation, tags);

    // 2) se tiver alternativas erradas, grava todas agora
    const opts = [
      { text: a, isCorrect: true },
      ...[wrong1, wrong2, wrong3]
        .map((w) => String(w || "").trim())
        .filter(Boolean)
        .map((w) => ({ text: w, isCorrect: false })),
    ];
    if (opts.length > 1) {
      await replaceOptions(newId, opts);
    }

    navigation.goBack();
  };

  const saveEdit = async () => {
    const t = text.trim();
    if (!t) {
      Alert.alert("Atenção", "Preencha a pergunta.");
      return;
    }
    await updateQuestion(questionId, {
      text: t,
      explanation,
      tags,
      answer: String(answer || "").trim(),
    });
    navigation.goBack();
  };

  const goEditOptions = () => {
    if (!isEditing) {
      Alert.alert(
        "Salve primeiro",
        "Crie a pergunta antes de editar as alternativas."
      );
      return;
    }
    navigation.navigate("OptionEditor", { questionId });
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
          showsVerticalScrollIndicator
        >
          <Text style={styles.h2}>
            {isEditing ? "Editar Pergunta" : "Nova Pergunta"}
          </Text>
          <View style={{ height: 8 }} />

          <Text style={styles.text}>Pergunta (termo)</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            multiline
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />

          <VStack space={12}>
            <View>
              <Text style={[styles.text, { marginTop: 12 }]}>
                Resposta correta
              </Text>
              <TextInput
                style={styles.input}
                value={answer}
                onChangeText={setAnswer}
                placeholder="Digite a resposta correta"
              />
            </View>

            {!isEditing ? (
              <>
                <Text style={styles.text}>
                  Alternativas erradas (opcional, até 3)
                </Text>
                <TextInput
                  style={styles.input}
                  value={wrong1}
                  onChangeText={setWrong1}
                  placeholder="Errada 1"
                />
                <TextInput
                  style={styles.input}
                  value={wrong2}
                  onChangeText={setWrong2}
                  placeholder="Errada 2"
                />
                <TextInput
                  style={styles.input}
                  value={wrong3}
                  onChangeText={setWrong3}
                  placeholder="Errada 3"
                />
              </>
            ) : null}

            <Text style={[styles.text, { marginTop: 12 }]}>
              Explicação (opcional)
            </Text>
            <TextInput
              style={styles.input}
              value={explanation}
              onChangeText={setExplanation}
              placeholder="Dica, passo, memória..."
            />

            <Text style={styles.text}>Tags (opcional)</Text>
            <TextInput
              style={styles.input}
              value={tags}
              onChangeText={setTags}
              placeholder="separe por vírgulas"
            />
          </VStack>

          {isEditing ? (
            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                variant="secondary"
                title="Editar alternativas"
                onPress={goEditOptions}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <PrimaryButton
            title="Salvar"
            onPress={isEditing ? saveEdit : saveCreate}
            disabled={!text.trim() || !String(answer || "").trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
