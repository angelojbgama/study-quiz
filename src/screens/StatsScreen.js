import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { getQuizzes, getQuestionsByQuiz } from '../db';
import { distinctTagsFromQuestions, parseTags } from '../util/tags';

export default function StatsScreen() {
  const [rows, setRows] = useState([]);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    sa: { flex: 1, backgroundColor: colors.background },
    header: { marginBottom: 8 },
    title: { fontSize: 18, fontWeight: '700', color: colors.text },
    row: { padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    tag: { fontWeight: '700', marginBottom: 6, flexWrap: 'wrap', color: colors.text },
    detail: { color: colors.text },
    empty: { color: colors.muted, textAlign: 'center', marginTop: 16 },
    progressOuter: { height: 6, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden', marginTop: 6 },
    progressInner: { height: 6, backgroundColor: colors.primary }
  }), [colors]);

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
      const items = tags.map(t => {
        const qs = all.filter(q =>
          parseTags(q.tags).map(x => x.toLowerCase()).includes(t.toLowerCase())
        );
        const total = qs.length;
        const due = qs.filter(q => Number(q.due_at || 0) <= now).length;
        const correct = qs.reduce((acc, q) => acc + Number(q.correct_count || 0), 0);
        const wrong = qs.reduce((acc, q) => acc + Number(q.wrong_count || 0), 0);
        const attempts = correct + wrong;
        const accRate = attempts ? Math.round((correct / attempts) * 100) : 0;
        return { tag: t, total, due, accRate, attempts };
      }).sort((a, b) => a.tag.localeCompare(b.tag));
      setRows(items);
    })();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.tag}>{item.tag}</Text>
      <Text style={styles.detail}>Total: {item.total} • Vencidos: {item.due} • Acurácia: {item.accRate}% ({item.attempts})</Text>
      <View style={styles.progressOuter}>
        <View style={[styles.progressInner, { width: `${item.accRate}%` }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.tag}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Estatísticas por Tag</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Nenhum dado ainda.</Text>}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator
      />
    </SafeAreaView>
  );
}
