import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getQuestionsByQuiz, applySrsResult } from '../db';
import TagChips from '../components/TagChips';
import { distinctTagsFromQuestions, tagCounts, parseTags } from '../util/tags';

export default function CardsScreen({ route, navigation }) {
  const { quizId } = route.params || {};
  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [onlyDue, setOnlyDue] = useState(false);
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const qs = await getQuestionsByQuiz(quizId);
      setAll(qs); setTags(distinctTagsFromQuestions(qs)); setCounts(tagCounts(qs));
    })();
  }, [quizId]);

  useEffect(() => {
    const now = Date.now();
    let filtered = (all || []).filter(q => {
      if (selected.size > 0) {
        const t = parseTags(q.tags).map(x => x.toLowerCase());
        if (!t.some(x => selected.has(x))) return false;
      }
      if (onlyDue) {
        const due = Number(q.due_at || 0);
        if (isNaN(due) || due > now) return false;
      }
      return true;
    });
    setCards(shuffle(filtered));
    setIdx(0); setShow(false); setScore({ right: 0, wrong: 0 });
  }, [all, selected, onlyDue]);

  if (cards.length === 0) return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <Controls tags={tags} counts={counts} selected={selected} onToggle={toggleTag(setSelected)} onlyDue={onlyDue} setOnlyDue={setOnlyDue} />
        <Text>Sem cartões para este filtro.</Text>
      </View>
    </SafeAreaView>
  );

  const cur = cards[idx];

  const next = () => {
    if (idx + 1 >= cards.length) {
      alert(`Fim! Acertos: ${score.right}/${cards.length}`);
      navigation.goBack();
    } else { setIdx(idx + 1); setShow(false); }
  };

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <Controls tags={tags} counts={counts} selected={selected} onToggle={toggleTag(setSelected)} onlyDue={onlyDue} setOnlyDue={setOnlyDue} />

        <Pressable onPress={() => setShow(!show)} style={styles.card}>
          <Text style={styles.term}>{!show ? cur.text : cur.answer}</Text>
          <Text style={styles.hint}>{!show ? 'Toque para ver a resposta' : 'Toque para ocultar'}</Text>
        </Pressable>

        {show ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}><PrimaryButton title="Errei" onPress={async () => { setScore(s => ({ ...s, wrong: s.wrong + 1 })); await applySrsResult(cur.id, false); next(); }} style={{ flex: 1 }} /></View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}><PrimaryButton title="Acertei" onPress={async () => { setScore(s => ({ ...s, right: s.right + 1 })); await applySrsResult(cur.id, true); next(); }} style={{ flex: 1 }} /></View>
          </View>
        ) : (
          <PrimaryButton title="Mostrar resposta" onPress={() => setShow(true)} />
        )}

        <Text style={{ marginTop: 12, color: '#555' }}>{idx + 1} / {cards.length} • Acertos: {score.right}</Text>
      </View>
    </SafeAreaView>
  );
}

function Controls({ tags, counts, selected, onToggle, onlyDue, setOnlyDue }) {
  return (
    <View style={styles.panel}>
      <TagChips tags={tags} counts={counts} selected={selected} onToggle={onToggle} />
      <View style={styles.switchRow}>
        <Text style={{ marginRight: 8 }}>Somente vencidos (SRS)</Text>
        <Switch value={onlyDue} onValueChange={setOnlyDue} />
      </View>
    </View>
  );
}

function toggleTag(setSelected) {
  return (t) => {
    if (!t) { setSelected(new Set()); return; }
    setSelected(prev => {
      const next = new Set(prev);
      const key = t.toLowerCase();
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
}
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: '#f7f7f7' },
  container: { flex: 1, padding: 16 },
  panel: { padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  card: { minHeight: 200, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 16, justifyContent: 'center', alignItems: 'center' },
  term: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { marginTop: 8, color: '#666' },
  row: { flexDirection: 'row', marginTop: 12 }
});
