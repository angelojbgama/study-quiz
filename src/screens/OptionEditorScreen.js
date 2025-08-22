// src/screens/OptionEditorScreen.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PrimaryButton from "../components/PrimaryButton";
import useAppStyles from "../ui/useAppStyles";
import { getQuestionById, getOptionsByQuestion, replaceOptions, updateQuestion } from "../db"; // 👈 import updateQuestion

export default function OptionEditorScreen({ route, navigation }) {
  const { questionId } = route.params || {};
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const { colors } = useTheme();
  const styles = useAppStyles();

  useEffect(() => {
    (async () => {
      const q = await getQuestionById(questionId);
      const opts = await getOptionsByQuestion(questionId);
      const normalized =
        opts && opts.length
          ? opts.map((o) => ({
              id: o.id,
              text: o.text || "",
              isCorrect: !!o.isCorrect,
            }))
          : [
              { id: "new-1", text: q?.answer || "", isCorrect: true },
              { id: "new-2", text: "", isCorrect: false },
              { id: "new-3", text: "", isCorrect: false },
              { id: "new-4", text: "", isCorrect: false },
            ];
      setQuestion(q);
      setOptions(normalized);
      navigation.setOptions({ title: "Alternativas" });
    })();
  }, [questionId, navigation]);

  const local = useMemo(
    () =>
      StyleSheet.create({
        label: { fontWeight: "600", marginBottom: 8, color: colors.text },
        itemRow: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
        radio: {
          width: 22,
          height: 22,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        },
        radioDot: {
          width: 12,
          height: 12,
          borderRadius: 999,
          backgroundColor: colors.primary,
        },
        input: {
          flex: 1,
          color: colors.text,
          paddingVertical: 6,
          paddingHorizontal: 8,
        },
        trash: { marginLeft: 10, padding: 6, borderRadius: 999 },
        addRow: {
          flexDirection: "row",
          justifyContent: "flex-end",
          marginTop: 8,
        },
      }),
    [colors]
  );

  const setCorrect = (index) => {
    setOptions((prev) =>
      prev.map((o, i) => ({ ...o, isCorrect: i === index }))
    );
  };

  const updateTextLocal = (index, text) => {
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, text } : o))
    );
  };

  const removeOption = (index) => {
    setOptions((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed?.isCorrect && next.length > 0) {
        next[0] = { ...next[0], isCorrect: true };
      }
      return next;
    });
  };

  const addWrong = () => {
    setOptions((prev) => [
      ...prev,
      { id: "new-" + (prev.length + 1), text: "", isCorrect: false },
    ]);
  };

  const onSave = async () => {
    const trimmed = options.map((o) => ({ ...o, text: (o.text || "").trim() }));
    if (!trimmed.some((o) => o.isCorrect)) {
      Alert.alert("Atenção", "Selecione uma alternativa como correta.");
      return;
    }
    if (trimmed.some((o) => !o.text)) {
      Alert.alert(
        "Atenção",
        "Preencha o texto de todas as alternativas ou remova as vazias."
      );
      return;
    }

    await replaceOptions(questionId, trimmed);

    // 🔐 Mantém question.answer consistente com a alternativa correta
    const correctText = trimmed.find((o) => o.isCorrect)?.text || "";
    if (correctText) {
      await updateQuestion(questionId, { answer: correctText });
    }

    navigation.goBack();
  };

  if (!question) {
    return (
      <SafeAreaView style={styles.sa} edges={["bottom"]}>
        <View style={styles.container}>
          <Text style={styles.muted}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={styles.panel}>
            <Text style={styles.h3}>Pergunta</Text>
            <Text style={[styles.text, { marginTop: 6 }]}>{question.text}</Text>
            {question.explanation ? (
              <Text style={[styles.muted, { marginTop: 4 }]}>
                Explicação: {question.explanation}
              </Text>
            ) : null}
          </View>

          <View style={styles.panel}>
            <Text style={styles.h3}>Alternativas</Text>
            <View style={{ height: 8 }} />
            {options.map((opt, idx) => (
              <View key={opt.id ?? idx} style={[local.itemRow, { marginBottom: 8 }]}>
                <Pressable onPress={() => setCorrect(idx)} hitSlop={8} accessibilityLabel="Marcar como correta">
                  <View style={local.radio}>
                    {opt.isCorrect ? <View style={local.radioDot} /> : null}
                  </View>
                </Pressable>
                <TextInput
                  value={opt.text}
                  onChangeText={(t) => updateTextLocal(idx, t)}
                  placeholder={opt.isCorrect ? "Resposta correta" : "Resposta incorreta"}
                  placeholderTextColor={colors.muted}
                  style={local.input}
                />
                <Pressable onPress={() => removeOption(idx)} hitSlop={8} style={({ pressed }) => [local.trash, pressed && { opacity: 0.7 }]}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger || "#dc3545"} />
                </Pressable>
              </View>
            ))}

            <View style={local.addRow}>
              <PrimaryButton title="Adicionar incorreta" variant="secondary" onPress={addWrong} />
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <PrimaryButton title="Salvar" onPress={onSave} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
