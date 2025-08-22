// src/screens/StudyTodayScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { getQuizzes, getQuestionsByQuiz } from "../db";
import TagChips from "../components/TagChips";
import { distinctTagsFromQuestions, tagCounts, parseTags } from "../util/tags";
import useAppStyles from "../ui/useAppStyles";
import PrimaryButton from "../components/PrimaryButton";
import { VStack } from "../ui/Stack";

export default function StudyTodayScreen({ navigation }) {
  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [goal, setGoal] = useState("20");

  const [dueTotal, setDueTotal] = useState(0);
  const [availTotal, setAvailTotal] = useState(0);

  const { colors } = useTheme();
  const styles = useAppStyles();

  const local = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: "row", alignItems: "center" },
        metaRow: { marginTop: 8 },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.card,
          color: colors.text,
          width: 88,
          textAlign: "center",
          marginHorizontal: 10,
        },
        presetRow: {
          flexDirection: "row",
          gap: 8,
          marginTop: 8,
          flexWrap: "wrap",
        },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        chipTxt: { color: colors.text, fontWeight: "600" },
        chipTxtActive: { color: colors.buttonText },
        progWrap: {
          marginTop: 10,
          height: 8,
          backgroundColor: colors.border,
          borderRadius: 8,
          overflow: "hidden",
        },
        progFill: { height: 8, backgroundColor: colors.primary },
        stat: { color: colors.muted, marginTop: 8 },
        emptyHint: { marginTop: 10, color: colors.muted },
        tagsHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 6,
        },
        clearLink: { color: colors.primary, fontWeight: "600" },
      }),
    [colors]
  );

  // carregar tudo (todos os quizzes e questões) uma vez
  const loadAll = useCallback(async () => {
    const qz = await getQuizzes();
    let allQ = [];
    for (const deck of qz) {
      const qs = await getQuestionsByQuiz(deck.id);
      allQ = allQ.concat(qs);
    }
    setAll(allQ);
    setTags(distinctTagsFromQuestions(allQ));
    setCounts(tagCounts(allQ));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // recarregar ao focar a tela (voltar do Learn, editar etc.)
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  // Recalcula vencidos e disponíveis no filtro atual
  useEffect(() => {
    const now = Date.now();
    const matchesTags = (q) => {
      if (selected.size === 0) return true;
      const t = parseTags(q.tags).map((x) => x.toLowerCase());
      return t.some((x) => selected.has(x));
    };
    const inFilter = all.filter(matchesTags);
    const dueCount = inFilter.filter(
      (q) => Number(q.due_at || 0) <= now
    ).length;

    setAvailTotal(inFilter.length);
    setDueTotal(dueCount);
  }, [all, selected]);

  const sanitizeGoal = useCallback((txt) => {
    const onlyDigits = String(txt || "").replace(/\D/g, "");
    let n = parseInt(onlyDigits || "0", 10);
    if (!Number.isFinite(n)) n = 0;
    if (n < 1) n = 1;
    if (n > 500) n = 500;
    return String(n);
  }, []);

  const onChangeGoal = (txt) => setGoal(sanitizeGoal(txt));
  const goalNum = Math.max(1, parseInt(goal || "1", 10));
  const progressRatio = goalNum > 0 ? Math.min(dueTotal, goalNum) / goalNum : 0;

  const setPreset = async (n) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => {}
    );
    setGoal(String(n));
  };

  const startLearn = async () => {
    if (availTotal <= 0) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      Alert.alert(
        "Nenhuma questão no filtro",
        "Ajuste suas tags ou adicione questões antes de iniciar."
      );
      return;
    }

    const onlyDue = dueTotal > 0;
    if (!onlyDue) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => {}
      );
      Alert.alert(
        "Sem cartões vencidos",
        "Vamos iniciar com cartões não vencidos para você aquecer."
      );
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
        () => {}
      );
    }

    navigation.navigate("Learn", {
      onlyDue,
      selectedTags: Array.from(selected),
      sessionLimit: goalNum || 20,
    });
  };

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <VStack space={12}>
          <View style={styles.panel}>
            <Text style={styles.h2}>Estudar Hoje</Text>

            {/* Cabeçalho das tags + limpar */}
            <View style={local.tagsHeader}>
              <Text style={styles.text}>Filtrar por tags</Text>
              {selected.size > 0 ? (
                <Pressable onPress={() => setSelected(new Set())} hitSlop={6}>
                  <Text style={local.clearLink}>Limpar filtros</Text>
                </Pressable>
              ) : (
                <View />
              )}
            </View>

            {/* Filtro por tags */}
            <TagChips
              tags={tags}
              counts={counts}
              selected={selected}
              onToggle={(t) => {
                if (!t) {
                  setSelected(new Set());
                  return;
                }
                setSelected((prev) => {
                  const next = new Set(prev);
                  const key = t.toLowerCase();
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                });
              }}
            />

            {/* Meta + presets */}
            <View style={[local.row, local.metaRow]}>
              <Text style={styles.text}>Meta do dia:</Text>
              <TextInput
                value={goal}
                onChangeText={onChangeGoal}
                keyboardType="number-pad"
                style={local.input}
                accessibilityLabel="Meta de itens"
              />
              <Text style={styles.text}>itens</Text>
            </View>

            <View style={local.presetRow}>
              {[10, 20, 30, 50].map((n) => {
                const active = String(n) === goal;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setPreset(n)}
                    style={({ pressed }) => [
                      local.chip,
                      active && local.chipActive,
                      pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Meta ${n} itens`}
                    hitSlop={6}
                  >
                    <Text
                      style={[local.chipTxt, active && local.chipTxtActive]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Progresso vs meta */}
            <View style={local.progWrap}>
              <View
                style={[
                  local.progFill,
                  { width: `${Math.round(progressRatio * 100)}%` },
                ]}
              />
            </View>
            <Text style={local.stat}>
              Disponíveis no filtro: {availTotal} • Vencidos: {dueTotal} • Meta:{" "}
              {goalNum}
            </Text>

            <View style={{ height: 12 }} />
            <PrimaryButton
              title={
                dueTotal > 0
                  ? "Iniciar sessão (Aprender)"
                  : "Iniciar com não vencidos"
              }
              onPress={startLearn}
              disabled={availTotal <= 0}
              accessibilityLabel="Iniciar sessão de estudo"
              block
            />

            {availTotal <= 0 ? (
              <Text style={local.emptyHint}>
                Dica: limpe os filtros, adicione novas questões ou verifique se
                há cartões nos seus quizzes.
              </Text>
            ) : null}
          </View>
        </VStack>
        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
