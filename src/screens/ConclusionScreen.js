// src/screens/ConclusionScreen.js
import React, { useMemo, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, CommonActions } from "@react-navigation/native";

import useAppStyles from "../ui/useAppStyles";
import PrimaryButton from "../components/PrimaryButton";
import { parseTags } from "../util/tags";

export default function ConclusionScreen({ route, navigation }) {
  const p = route?.params || {};
  const { colors } = useTheme();
  const styles = useAppStyles();

  // --- Normalização dos dados (aceita results "brutos" OU agregados) ---
  const {
    total,
    correct,
    wrong,
    accuracy,
    byTag,
    hardest,
    wrongIds,
    durationStr,
    source,
  } = useMemo(() => {
    const results = Array.isArray(p.results) ? p.results : null;

    const durMs = Number.isFinite(p.elapsedMs)
      ? p.elapsedMs
      : Number.isFinite(p.startedAt) && Number.isFinite(p.finishedAt)
      ? Math.max(0, p.finishedAt - p.startedAt)
      : 0;
    const durationStr = durMs ? formatDuration(durMs) : null;

    if (results && results.length) {
      const total = results.length;
      const correct = results.filter((r) => r.correct).length;
      const wrong = total - correct;
      const accuracy = total ? Math.round((correct / total) * 100) : 0;

      // tags com erro
      const errTagCount = {};
      const wrongItems = results.filter((r) => !r.correct);
      wrongItems.forEach((r) => {
        const tags = parseTags(r.tags);
        const list = tags && tags.length ? tags : ["Sem tag"];
        list.forEach((t) => {
          errTagCount[t] = (errTagCount[t] || 0) + 1;
        });
      });
      const byTag = Object.entries(errTagCount)
        .map(([tag, count]) => ({
          tag,
          total: count,
          correct: 0,
          wrong: count,
          accRate: 0,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // itens mais errados
      const wrongCount = {};
      wrongItems.forEach((r) => {
        wrongCount[r.id] = wrongCount[r.id] || {
          id: r.id,
          quizId: r.quizId,
          text: r.text,
          answer: r.answer,
          tags: r.tags,
          wrong_count: 0,
        };
        wrongCount[r.id].wrong_count += 1;
      });
      const hardest = Object.values(wrongCount)
        .sort((a, b) => b.wrong_count - a.wrong_count)
        .slice(0, 10);
      const wrongIds = wrongItems.map((r) => r.id);

      return {
        total,
        correct,
        wrong,
        accuracy,
        byTag,
        hardest,
        wrongIds,
        durationStr,
        source: p.source || "learn",
      };
    }

    // agregados
    const total = Number.isFinite(p.total)
      ? p.total
      : (p.correct || 0) + (p.wrong || 0);
    const correct = Number(p.correct || 0);
    const wrong = Number.isFinite(p.wrong)
      ? p.wrong
      : Math.max(0, total - correct);
    const accuracy = Number.isFinite(p.accuracy)
      ? p.accuracy
      : total
      ? Math.round((correct / total) * 100)
      : 0;
    const byTag = Array.isArray(p.byTag) ? p.byTag : [];
    const hardest = Array.isArray(p.hardest) ? p.hardest.slice(0, 10) : [];
    const wrongIds = hardest.length
      ? hardest.map((h) => h.id).filter(Boolean)
      : [];

    return {
      total,
      correct,
      wrong,
      accuracy,
      byTag,
      hardest,
      wrongIds,
      durationStr,
      source: p.source || "learn",
    };
  }, [p]);

  useEffect(() => {
    // remover botão/gesto de voltar
    navigation.setOptions({ headerBackVisible: false, gestureEnabled: false });
  }, [navigation]);

  const goHomeReset = () => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "Tabs" }] })
    );
    navigation.navigate("Início");
  };

  const handleReviewErrors = () => {
    if (!wrongIds || wrongIds.length === 0) {
      goHomeReset();
      return;
    }
    navigation.navigate("Learn", {
      quizId: p.quizId ?? undefined,
      questionIds: Array.from(new Set(wrongIds)),
      onlyDue: false,
      selectedTags: [],
      sessionLimit: wrongIds.length,
      fromConclusion: true,
    });
  };

  const local = useMemo(
    () =>
      StyleSheet.create({
        headerCard: {
          padding: 12,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        sub: { color: colors.muted },

        statsRow: {
          flexDirection: "row",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 12,
        },
        statCard: {
          flexGrow: 1,
          minWidth: 120,
          padding: 12,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
        },
        statNum: { fontSize: 24, fontWeight: "800", color: colors.text },
        statLbl: { marginTop: 4, color: colors.muted },

        section: {
          padding: 12,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 8,
        },

        tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        tagPill: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        tagText: { color: colors.text, fontWeight: "600" },

        listHeaderGap: { height: 12 },
        listFooterGap: { height: 12 },

        hardItem: {
          paddingVertical: 10,
          borderTopWidth: 1,
          borderColor: colors.border,
        },
        hardQ: { color: colors.text, fontWeight: "700" },
        hardA: { color: colors.text, marginTop: 4 },
        hardTags: { color: colors.muted, marginTop: 4, fontSize: 12 },

        ctasRow: { flexDirection: "row", gap: 8 },
      }),
    [colors]
  );

  // Cabeçalho para o FlatList
  const ListHeader = () => (
    <View>
      <View style={local.headerCard}>
        <Text style={styles.h2}>Sessão concluída</Text>
        <Text style={local.sub}>
          {source === "cards"
            ? "Modo Cartões"
            : source === "learn"
            ? "Modo Quiz"
            : "Resumo"}
          {durationStr ? ` • ${durationStr}` : ""}
        </Text>

        {/* Stats */}
        <View style={local.statsRow}>
          <View style={local.statCard}>
            <Text style={local.statNum}>
              {correct}/{total}
            </Text>
            <Text style={local.statLbl}>Acertos</Text>
          </View>
          <View style={local.statCard}>
            <Text style={local.statNum}>{accuracy}%</Text>
            <Text style={local.statLbl}>Acurácia</Text>
          </View>
          <View style={local.statCard}>
            <Text style={local.statNum}>{wrong}</Text>
            <Text style={local.statLbl}>Erros</Text>
          </View>
        </View>
      </View>

      {/* Tags com mais erros */}
      <View style={local.listHeaderGap} />
      <View style={local.section}>
        <Text style={local.sectionTitle}>Tags com mais erros</Text>
        {Array.isArray(byTag) && byTag.length > 0 ? (
          <View style={local.tagWrap}>
            {byTag.map((t, i) => (
              <View key={`${t.tag}-${i}`} style={local.tagPill}>
                <Text style={local.tagText}>
                  {t.tag} • {t.count ?? t.wrong ?? 0}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.muted }}>
            Nenhuma tag com erro nesta sessão.
          </Text>
        )}
      </View>

      {/* Mais desafiadoras (título acima da lista) */}
      <View style={local.listHeaderGap} />
      <View style={local.section}>
        <Text style={local.sectionTitle}>Mais desafiadoras</Text>
        {/* conteúdo virá no renderItem do FlatList */}
      </View>
    </View>
  );

  // Rodapé para o FlatList (CTAs)
  const ListFooter = () => (
    <View>
      <View style={local.listFooterGap} />
      <View style={local.section}>
        {wrongIds && wrongIds.length > 0 ? (
          <View style={local.ctasRow}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Revisar erros"
                onPress={handleReviewErrors}
                block
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Concluir"
                variant="secondary"
                onPress={goHomeReset}
                block
              />
            </View>
          </View>
        ) : (
          <PrimaryButton title="Concluir" onPress={goHomeReset} block />
        )}
      </View>
    </View>
  );

  // Item da lista "mais desafiadoras"
  const renderHardItem = ({ item, index }) => (
    <Pressable
      style={({ pressed }) => [
        local.hardItem,
        index === 0 && { borderTopWidth: 0 },
        pressed && { opacity: 0.9 },
      ]}
      android_ripple={{ color: colors.border }}
      onPress={() => {
        if (item.id && item.quizId) {
          navigation.navigate("QuestionEditor", {
            quizId: item.quizId,
            questionId: item.id,
          });
        }
      }}
      accessibilityRole="button"
      accessibilityLabel="Abrir pergunta"
    >
      <Text style={local.hardQ}>{item.text || "Pergunta"}</Text>
      {item.answer ? (
        <Text style={local.hardA}>Resposta: {item.answer}</Text>
      ) : null}
      {item.tags ? <Text style={local.hardTags}>Tags: {item.tags}</Text> : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <FlatList
        data={Array.isArray(hardest) ? hardest : []}
        keyExtractor={(it, idx) => String(it?.id ?? idx)}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        renderItem={renderHardItem}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        // 🔑 scroll liberado (nada de ScrollView por fora)
        // e contentContainerStyle sem flex:1
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator
      />
    </SafeAreaView>
  );
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
