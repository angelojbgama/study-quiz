import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { getQuestionsByQuiz, applySrsResult } from '../db';
import TagChips from '../components/TagChips';
import { distinctTagsFromQuestions, tagCounts, parseTags } from '../util/tags';
import useAppStyles from '../ui/useAppStyles';

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
  const styles = useAppStyles();
  const { colors } = useTheme();

  const local = useMemo(() => StyleSheet.create({
    switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    cardBox: { minHeight: 200, justifyContent: 'center', alignItems: 'center' },
    term: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: colors.text },
    row: { flexDirection: 'row', marginTop: 12 }
  }), [colors]);

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
      <View style={styles.container}>
        <View style={styles.panel}>
          <TagChips tags={tags} counts={counts} selected={selected} onToggle={toggleTag(setSelected)} />
          <View style={local.switchRow}>
            <Text style={styles.text}>Somente vencidos (SRS)</Text>
            <Switch value={onlyDue} onValueChange={setOnlyDue} />
          </View>
        </View>
        <Text style={styles.muted}>Sem cartões para este filtro.</Text>
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
      <View style={styles.container}>
        <View style={styles.panel}>
          <TagChips tags={tags} counts={counts} selected={selected} onToggle={toggleTag(setSelected)} />
          <View style={local.switchRow}>
            <Text style={styles.text}>Somente vencidos (SRS)</Text>
            <Switch value={onlyDue} onValueChange={setOnlyDue} />
          </View>
        </View>

        <Pressable onPress={() => setShow(!show)} style={[styles.card, local.cardBox]}>
          <Text style={local.term}>{!show ? cur.text : cur.answer}</Text>
          <Text style={styles.muted}>{!show ? 'Toque para ver a resposta' : 'Toque para ocultar'}</Text>
        </Pressable>

        {show ? (
          <View style={local.row}>
            <View style={{ flex: 1 }}><PrimaryButton title="Errei" onPress={async () => { setScore(s => ({ ...s, wrong: s.wrong + 1 })); await applySrsResult(cur.id, false); next(); }} style={{ flex: 1 }} /></View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}><PrimaryButton title="Acertei" onPress={async () => { setScore(s => ({ ...s, right: s.right + 1 })); await applySrsResult(cur.id, true); next(); }} style={{ flex: 1 }} /></View>
          </View>
        ) : (
          <PrimaryButton title="Mostrar resposta" onPress={() => setShow(true)} />
        )}

        <Text style={[styles.muted, { marginTop: 10 }]}>{idx + 1} / {cards.length} • Acertos: {score.right}</Text>
      </View>
    </SafeAreaView>
  );
}

function Controls() { return null; } // (não usado mais)
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
