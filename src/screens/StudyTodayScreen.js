import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getQuizzes, getQuestionsByQuiz } from '../db';
import TagChips from '../components/TagChips';
import { distinctTagsFromQuestions, tagCounts, parseTags } from '../util/tags';

export default function StudyTodayScreen({ navigation }) {
  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [goal, setGoal] = useState('20');
  const [dueTotal, setDueTotal] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const qz = await getQuizzes();
      let allQ = [];
      for (const deck of qz) allQ = allQ.concat(await getQuestionsByQuiz(deck.id));
      setAll(allQ); setTags(distinctTagsFromQuestions(allQ)); setCounts(tagCounts(allQ));
    })();
  }, []);

  useEffect(() => {
    const now = Date.now();
    const filtered = all.filter(q => {
      if (selected.size > 0) {
        const t = parseTags(q.tags).map(x => x.toLowerCase());
        if (!t.some(x => selected.has(x))) return false;
      }
      const due = Number(q.due_at || 0);
      return !isNaN(due) && due <= now;
    });
    setDueTotal(filtered.length);
  }, [all, selected]);

  const startLearn = () => {
    navigation.navigate('Learn', { onlyDue: true, selectedTags: Array.from(selected), sessionLimit: Number(goal) || 20 });
  };

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.panel}>
          <Text style={styles.title}>Estudar Hoje</Text>
          <TagChips
            tags={tags}
            counts={counts}
            selected={selected}
            onToggle={(t)=>{
              if (!t) { setSelected(new Set()); return; }
              setSelected(prev => {
                const next = new Set(prev);
                const key = t.toLowerCase();
                if (next.has(key)) next.delete(key); else next.add(key);
                return next;
              });
            }}
          />
          <View style={styles.goalRow}>
            <Text>Meta do dia:</Text>
            <TextInput value={goal} onChangeText={setGoal} keyboardType="number-pad" style={styles.input} />
            <Text>itens</Text>
          </View>
          <Text style={{ marginTop: 8, color: '#555' }}>Vencidos no filtro: {dueTotal}</Text>
          <View style={{ height: 12 }} />
          <Button title="Iniciar sessão (Aprender)" onPress={startLearn} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: '#f7f7f7' },
  container: { flex: 1, padding: 16 },
  panel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  goalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  input: { width: 70, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, textAlign: 'center', marginHorizontal: 8 }
});
