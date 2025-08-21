import React, { useEffect, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import { getQuizzes, getQuestionsByQuiz } from '../db';
import TagChips from '../components/TagChips';
import { distinctTagsFromQuestions, tagCounts, parseTags } from '../util/tags';
import useAppStyles from '../ui/useAppStyles';

export default function StudyTodayScreen({ navigation }) {
  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [goal, setGoal] = useState('20');
  const [dueTotal, setDueTotal] = useState(0);
  const styles = useAppStyles();

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
      <View style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.h2}>Estudar Hoje</Text>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={styles.text}>Meta do dia:</Text>
            <TextInput
              value={goal}
              onChangeText={setGoal}
              keyboardType="number-pad"
              style={[styles.input, { width: 70, marginHorizontal: 8, textAlign: 'center' }]}
            />
            <Text style={styles.text}>itens</Text>
          </View>
          <Text style={[styles.muted, { marginTop: 8 }]}>Vencidos no filtro: {dueTotal}</Text>

          {/* BOTÃO UNIFICADO */}
          <View style={{ marginTop: 12 }}>
            <PrimaryButton title="Iniciar sessão (Aprender)" onPress={startLearn} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
