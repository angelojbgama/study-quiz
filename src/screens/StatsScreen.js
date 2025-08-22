// src/screens/StatsScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { getQuizzes, getQuestionsByQuiz } from "../db";
import { distinctTagsFromQuestions, parseTags } from "../util/tags";
import useAppStyles from "../ui/useAppStyles";

export default function StatsScreen() {
  const [rows, setRows] = useState([]);
  const { colors } = useTheme();
  const styles = useAppStyles();

  useEffect(() => {
    (async () => {
      const qz = await getQuizzes();
      let all = [];
      for (const q of qz) {
        const qs = await getQuestionsByQuiz(q.id);
        all = all.concat(qs);
      }
      const tags = distinctTagsFromQuestions(all);
      const now = Date.now();
      const items = tags
        .map((t) => {
          const qs = all.filter((q) =>
            parseTags(q.tags)
              .map((x) => x.toLowerCase())
              .includes(t.toLowerCase())
          );
          const total = qs.length;
          const due = qs.filter((q) => Number(q.due_at || 0) <= now).length;
          const correct = qs.reduce(
            (acc, q) => acc + Number(q.correct_count || 0),
            0
          );
          const wrong = qs.reduce(
            (acc, q) => acc + Number(q.wrong_count || 0),
            0
          );
          const attempts = correct + wrong;
          const accRate = attempts ? Math.round((correct / attempts) * 100) : 0;
          return { tag: t, total, due, accRate, attempts };
        })
        .sort((a, b) => a.tag.localeCompare(b.tag));
      setRows(items);
    })();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={[styles.text, { fontWeight: "700", marginBottom: 6 }]}>
        {item.tag}
      </Text>
      <Text style={styles.text}>
        Total: {item.total} • Vencidos: {item.due} • Acurácia: {item.accRate}% (
        {item.attempts})
      </Text>
      <View style={[styles.progressOuter, { marginTop: 6 }]}>
        <View style={[styles.progressInner, { width: `${item.accRate}%` }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.tag}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Text style={styles.h2}>Estatísticas por Tag</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.muted, { padding: 16 }]}>
            Nenhum dado ainda.
          </Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator
      />
    </SafeAreaView>
  );
}
