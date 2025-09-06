// src/screens/QuestionListScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PrimaryButton from "../components/PrimaryButton";
import TagChips from "../components/TagChips";
import useAppStyles from "../ui/useAppStyles";
import { distinctTagsFromQuestions, tagCounts, parseTags } from "../util/tags";
import { getQuestionsByQuiz, deleteQuestion } from "../db";

export default function QuestionListScreen({ route, navigation }) {
  const { quizId, title } = route.params || {};
  const [questions, setQuestions] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const styles = useAppStyles();
  const { colors } = useTheme();

  useEffect(() => {
    navigation.setOptions?.({ title: title || "Perguntas" });
  }, [navigation, title]);

  const load = useCallback(async () => {
    const list = await getQuestionsByQuiz(quizId);
    setQuestions(list);
    setTags(distinctTagsFromQuestions(list));
    setCounts(tagCounts(list));
  }, [quizId]);

  useEffect(() => { load(); }, [load]);

  function toggleTag(t) {
    if (!t) {
      setSelected(new Set());
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(t).toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const hasTag = selected.size > 0;
    const q = String(query || "").trim().toLowerCase();
    return (questions || []).filter((it) => {
      if (q) {
        const hay = `${it.text} ${it.answer} ${it.explanation || ""} ${it.tags || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (hasTag) {
        const t = parseTags(it.tags).map((x) => x.toLowerCase());
        if (!t.some((x) => selected.has(x))) return false;
      }
      return true;
    });
  }, [questions, query, selected]);

  const remove = (id, text) => {
    Alert.alert("Excluir pergunta", `Tem certeza?\n\n"${text}"`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await deleteQuestion(id);
          if (expandedId === id) setExpandedId(null);
          await load();
        },
      },
    ]);
  };

  const onToggleItem = (id) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View style={styles.panel}>
          <TagChips
            tags={tags}
            counts={counts}
            selected={selected}
            onToggle={toggleTag}
          />

          <View style={styles.divider8} />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar (pergunta / resposta / tags)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="search"
            accessibilityLabel="Buscar perguntas"
          />

          <View style={styles.divider12} />

          <View style={[styles.row, styles.gap8]}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Adicionar Pergunta"
                icon="plus"
                onPress={() =>
                  navigation.navigate("QuestionEditor", { quizId })
                }
                block
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Estudar este Quiz"
                icon="play-circle-outline"
                onPress={() => navigation.navigate("Learn", { quizId })}
                block
                variant="secondary"
              />
            </View>
          </View>
        </View>

        <View style={styles.divider12} />

        {filtered.map((q) => {
          const isOpen = expandedId === q.id;
          return (
            <View key={q.id} style={styles.card}>
              <Pressable
                onPress={() => onToggleItem(q.id)}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center" },
                  pressed && { opacity: 0.95 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Abrir opções da pergunta"
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}
                  >
                    {q.text}
                  </Text>
                  {q.tags ? (
                    <Text style={{ color: colors.muted, marginTop: 4 }}>
                      Tags: {q.tags}
                    </Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={colors.muted}
                />
              </Pressable>

              {isOpen ? (
                <>
                  <View style={styles.divider12} />
                  <View style={[styles.row, styles.gap8, { flexWrap: "wrap" }]}>
                    <View style={{ flexGrow: 1, minWidth: 140 }}>
                      <PrimaryButton
                        title="Editar"
                        variant="secondary"
                        icon="pencil-outline"
                        onPress={() =>
                          navigation.navigate("QuestionEditor", {
                            quizId,
                            questionId: q.id,
                          })
                        }
                        block
                      />
                    </View>
                    <View style={{ flexGrow: 1, minWidth: 140 }}>
                      <PrimaryButton
                        title="Alternativas"
                        variant="secondary"
                        icon="format-list-bulleted"
                        onPress={() =>
                          navigation.navigate("OptionEditor", {
                            questionId: q.id,
                          })
                        }
                        block
                      />
                    </View>
                    <View style={{ flexGrow: 1, minWidth: 140 }}>
                      <PrimaryButton
                        title="Praticar"
                        icon="play-circle-outline"
                        onPress={() =>
                          navigation.navigate("Learn", {
                            quizId,
                            questionIds: [q.id],
                            sessionLimit: 1,
                            onlyDue: false, // garante que 1 questão sempre abre
                          })
                        }
                        block
                      />
                    </View>
                    <View style={{ flexGrow: 1, minWidth: 140 }}>
                      <PrimaryButton
                        title="Excluir"
                        variant="dangerOutline"
                        icon="trash-can-outline"
                        onPress={() => remove(q.id, q.text)}
                        block
                      />
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          );
        })}

        {filtered.length === 0 ? (
          <Text style={styles.muted}>Nenhuma pergunta para este filtro.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
