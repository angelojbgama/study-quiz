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
  getOptionsByQuestion,
  addOption,
  updateOption,
  deleteOption,
  setCorrectOption,
  setQuestionAnswer,
} from "../db";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HStack, VStack } from "../ui/Stack";

export default function QuestionEditorScreen({ route, navigation }) {
  const { quizId, questionId } = route.params || {};
  const styles = useAppStyles(80);

  // Campos base
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [tags, setTags] = useState("");

  // Criação (simples)
  const [answer, setAnswer] = useState("");
  const [wrong1, setWrong1] = useState("");
  const [wrong2, setWrong2] = useState("");
  const [wrong3, setWrong3] = useState("");

  // Edição (completa)
  const [options, setOptions] = useState([]); // [{id,text,isCorrect}]

  const isEditing = !!questionId;

  useEffect(() => {
    (async () => {
      if (!isEditing) return;
      const q = await getQuestionById(questionId);
      setText(q?.text || "");
      setExplanation(q?.explanation || "");
      setTags(q?.tags || "");
      const opts = await getOptionsByQuestion(questionId);
      setOptions(opts);
    })();
  }, [isEditing, questionId]);

  const saveCreate = async () => {
    if (!text.trim() || !answer.trim()) return;
    await createQuestion(
      quizId,
      text,
      answer,
      explanation,
      tags,
      wrong1,
      wrong2,
      wrong3
    );
    navigation.goBack();
  };

  const saveEdit = async () => {
    if (!text.trim()) return;
    await updateQuestion(questionId, { text, explanation, tags });
    navigation.goBack();
  };

  const addWrong = async () => {
    const wrongCount = options.filter((o) => !o.isCorrect).length;
    if (wrongCount >= 3) {
      Alert.alert("Limite", "No máximo 3 alternativas erradas.");
      return;
    }
    const id = await addOption(questionId, "Nova alternativa", 0);
    const fresh = await getOptionsByQuestion(questionId);
    setOptions(fresh);
  };

  const onChangeOption = async (opt, newText) => {
    setOptions((opts) =>
      opts.map((o) => (o.id === opt.id ? { ...o, text: newText } : o))
    );
  };
  const onBlurOption = async (opt) => {
    await updateOption(opt.id, opt.text);
    if (opt.isCorrect) await setQuestionAnswer(questionId, opt.text);
  };

  const onDeleteOption = async (opt) => {
    const corrects = options.filter((o) => o.isCorrect);
    if (opt.isCorrect && corrects.length === 1) {
      Alert.alert("Ops", "Pelo menos uma alternativa correta é necessária.");
      return;
    }
    await deleteOption(opt.id);
    const fresh = await getOptionsByQuestion(questionId);
    setOptions(fresh);
  };

  const onMarkCorrect = async (opt) => {
    await setCorrectOption(questionId, opt.id);
    const fresh = await getOptionsByQuestion(questionId);
    setOptions(fresh);
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

          {isEditing ? (
            <VStack space={12}>
              <Text style={styles.h2}>Alternativas</Text>
              <VStack space={8}>
                {options.map((opt) => (
                  <View key={opt.id} style={[styles.card, { padding: 12 }]}>
                    <HStack space={8} style={{ alignItems: "center" }}>
                      <MaterialCommunityIcons
                        name={
                          opt.isCorrect
                            ? "checkbox-marked-circle"
                            : "checkbox-blank-circle-outline"
                        }
                        size={24}
                        color={opt.isCorrect ? "#2e7d32" : "#777"}
                        onPress={() => onMarkCorrect(opt)}
                      />
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.input}
                          value={opt.text}
                          onChangeText={(t) => onChangeOption(opt, t)}
                          onBlur={() => onBlurOption(opt)}
                          placeholder={
                            opt.isCorrect
                              ? "Resposta correta"
                              : "Alternativa errada"
                          }
                        />
                      </View>
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={22}
                        color="#dc3545"
                        onPress={() => onDeleteOption(opt)}
                      />
                    </HStack>
                    {opt.isCorrect ? (
                      <Text style={styles.muted}>Correta</Text>
                    ) : null}
                  </View>
                ))}
              </VStack>

              <PrimaryButton
                variant="secondary"
                title="Adicionar alternativa errada"
                onPress={addWrong}
                accessibilityHint="Adiciona uma alternativa incorreta"
              />
            </VStack>
          ) : (
            <VStack space={12}>
              <Text style={styles.text}>Resposta correta</Text>
              <TextInput
                style={styles.input}
                value={answer}
                onChangeText={setAnswer}
              />

              <Text style={styles.text}>Alternativas erradas (até 3)</Text>
              <TextInput
                style={styles.input}
                value={wrong1}
                onChangeText={setWrong1}
                placeholder="Opcional"
              />
              <TextInput
                style={styles.input}
                value={wrong2}
                onChangeText={setWrong2}
                placeholder="Opcional"
              />
              <TextInput
                style={styles.input}
                value={wrong3}
                onChangeText={setWrong3}
                placeholder="Opcional"
              />
            </VStack>
          )}

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
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <PrimaryButton
            title="Salvar"
            onPress={isEditing ? saveEdit : saveCreate}
            disabled={!text.trim() || (!isEditing && !answer.trim())}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
