import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { getQuestionsByQuiz, getQuizzes, applySrsResult } from '../db';
import TagChips from '../components/TagChips';
import { distinctTagsFromQuestions, tagCounts, parseTags } from '../util/tags';

export default function LearnScreen({ route, navigation }) {
  const { quizId, onlyDue = false, selectedTags = [], sessionLimit = 0 } = route.params || {};
  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set(selectedTags.map(x => x.toLowerCase())));
  const [onlyDueState, setOnlyDue] = useState(onlyDue);
  const [state, setState] = useState({ index: 0, total: 0, score: 0, current: null, options: [], answered: null });
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    sa: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, padding: 16 },
    panel: { padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 18, fontWeight: '700', marginVertical: 8, color: colors.text },
    option: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 8, backgroundColor: colors.card },
    progressOuter: { height: 8, backgroundColor: colors.border, borderRadius: 8, overflow: 'hidden' },
    progressInner: { height: 8, backgroundColor: colors.primary },
    hint: { color: colors.muted },
    resultCorrect: { fontWeight: '700', color: colors.primary },
    resultWrong: { fontWeight: '700', color: colors.danger },
    answerText: { marginTop: 6, flexWrap: 'wrap', color: colors.text },
    muted: { color: colors.muted }
  }), [colors]);

  useEffect(() => {
    (async () => {
      if (quizId) {
        const qs = await getQuestionsByQuiz(quizId);
        setAll(qs); setTags(distinctTagsFromQuestions(qs)); setCounts(tagCounts(qs));
      } else {
        const qz = await getQuizzes();
        let allQ = [];
        for (const deck of qz) allQ = allQ.concat(await getQuestionsByQuiz(deck.id));
        setAll(allQ); setTags(distinctTagsFromQuestions(allQ)); setCounts(tagCounts(allQ));
      }
    })();
  }, [quizId]);

  useEffect(() => {
    const now = Date.now();
    const filtered = (all || []).filter(q => {
      if (selected.size > 0) {
        const t = parseTags(q.tags).map(x => x.toLowerCase());
        if (!t.some(x => selected.has(x))) return false;
      }
      if (onlyDueState) {
        const due = Number(q.due_at || 0);
        if (isNaN(due) || due > now) return false;
      }
      return true;
    });
    let shuffled = shuffle(filtered);
    if (sessionLimit && sessionLimit > 0) shuffled = shuffled.slice(0, sessionLimit);
    if (shuffled.length === 0) {
      setState({ index: 0, total: 0, score: 0, current: null, options: [], answered: null });
      return;
    }
    const first = shuffled[0];
    const opts = buildOptions(first, shuffled, selected);
    setState({ index: 0, total: shuffled.length, score: 0, current: first, options: opts, _qs: shuffled, answered: null });
  }, [all, selected, onlyDueState, sessionLimit]);

  const onAnswer = async (choiceIdx) => {
    const chosen = state.options[choiceIdx];
    const isCorrect = chosen === state.current.answer;
    setState(st => ({ ...st, answered: { isCorrect, chosen } }));
    await applySrsResult(state.current.id, isCorrect);
  };

  const next = () => {
    const st = state;
    const nextScore = st.score + (st.answered?.isCorrect ? 1 : 0);
    const nextIndex = st.index + 1;
    if (nextIndex >= st.total) {
      setState({ ...st, score: nextScore, finished: true });
    } else {
      const nextQ = st._qs[nextIndex];
      const opts = buildOptions(nextQ, st._qs, selected);
      setState({ ...st, index: nextIndex, score: nextScore, current: nextQ, options: opts, answered: null });
    }
  };

  if (!state.current) {
    return (
      <SafeAreaView style={styles.sa} edges={['bottom']}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.panel}>
            <TagChips tags={tags} counts={counts} selected={selected} onToggle={toggleTag(setSelected)} />
            <View style={styles.switchRow}>
              <Text style={{ color: colors.text }}>Somente vencidas (SRS)</Text>
              <Switch value={onlyDueState} onValueChange={setOnlyDue} />
            </View>
          </View>
          <Text style={styles.hint}>Sem questões para este filtro.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.finished) {
    return (
      <SafeAreaView style={styles.sa} edges={['bottom']}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.panel}>
            <Text style={styles.title}>Sessão concluída</Text>
            <Text style={{ color: colors.text }}>Pontuação: {state.score}/{state.total}</Text>
            <View style={{ height: 12 }} />
            <PrimaryButton title="Concluir" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const progress = state.total ? (state.index + 1) / state.total : 0;

  return (
      <SafeAreaView style={styles.sa} edges={['bottom']}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.panel}>
            <TagChips tags={tags} counts={counts} selected={selected} onToggle={toggleTag(setSelected)} />
            <View style={styles.switchRow}>
              <Text style={{ color: colors.text }}>Somente vencidas (SRS)</Text>
              <Switch value={onlyDueState} onValueChange={setOnlyDue} />
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.progressOuter}><View style={[styles.progressInner, { width: `${Math.round(progress * 100)}%` }]} /></View>
            <Text style={styles.title}>{state.current.text}</Text>

            {!state.answered ? (
              state.options.map((opt, idx) => (
                <Pressable key={idx} onPress={() => onAnswer(idx)} style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }] }>
                  <Text style={{ flexWrap: 'wrap', color: colors.text }}>{String(opt)}</Text>
                </Pressable>
              ))
            ) : (
              <View>
                <Text style={state.answered.isCorrect ? styles.resultCorrect : styles.resultWrong}>
                  {state.answered.isCorrect ? 'Correto!' : 'Incorreto.'}
                </Text>
                {!state.answered.isCorrect ? <Text style={styles.answerText}>Sua resposta: {String(state.answered.chosen)}</Text> : null}
                <Text style={styles.answerText}>Resposta correta: {String(state.current.answer)}</Text>
                {state.current.explanation ? <Text style={styles.answerText}>Explicação: {state.current.explanation}</Text> : null}
                <View style={{ height: 12 }} />
                <PrimaryButton title="Próxima" onPress={next} />
              </View>
            )}
            <Text style={[styles.muted, { marginTop: 10 }]}>{state.index + 1} de {state.total}</Text>
          </View>
        </View>
      </SafeAreaView>
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

function buildOptions(question, seq, selectedSet) {
  const correct = question.answer;
  let poolCandidates;
  if (selectedSet && selectedSet.size > 0) {
    poolCandidates = seq.filter(q => {
      const tq = parseTags(q.tags).map(x => x.toLowerCase());
      for (const t of tq) if (selectedSet.has(t)) return true;
      return false;
    });
  } else {
    const curTags = new Set(parseTags(question.tags).map(x => x.toLowerCase()));
    poolCandidates = seq.filter(q => {
      const tq = parseTags(q.tags).map(x => x.toLowerCase());
      for (const t of tq) if (curTags.has(t)) return true;
      return false;
    });
  }
  const pool = Array.from(new Set(poolCandidates.map(q => q.answer).filter(a => a && a !== correct)));
  const distractors = sample(pool, 3);
  const unique = Array.from(new Set([correct, ...distractors]));
  return shuffle(unique);
}

function sample(arr, n) {
  const copy = [...arr];
  const res = [];
  while (res.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    res.push(copy.splice(i,1)[0]);
  }
  while (res.length < n) res.push('Nenhuma das anteriores ' + (res.length + 1));
  return res;
}

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

