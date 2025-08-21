import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { getQuestionsByQuiz, getQuizzes, applySrsResult } from '../db';
import TagChips from '../components/TagChips';
import { distinctTagsFromQuestions, tagCounts, parseTags } from '../util/tags';
import useAppStyles from '../ui/useAppStyles';
import SuccessCelebration from '../components/SuccessCelebration';

export default function LearnScreen({ route, navigation }) {
  const { quizId, onlyDue = false, selectedTags = [], sessionLimit = 0 } = route.params || {};
  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set(selectedTags.map(x => x.toLowerCase())));
  const [onlyDueState, setOnlyDue] = useState(onlyDue);
  const [state, setState] = useState({ index: 0, total: 0, score: 0, current: null, options: [], answered: null });
  const [celebrate, setCelebrate] = useState(false);

  const styles = useAppStyles();
  const { colors } = useTheme();

  const local = useMemo(() => StyleSheet.create({
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    option: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 8, backgroundColor: colors.card },
    optionCorrect: { borderColor: colors.primary, backgroundColor: '#e6f2ff' },
    optionWrong: { borderColor: '#dc3545', backgroundColor: '#fdecee' },
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
    if (isCorrect) setCelebrate(true);
    // não bloquear a animação: aplica SRS em paralelo
    applySrsResult(state.current.id, isCorrect).catch(()=>{});
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
        <View style={styles.container}>
          <View style={styles.panel}>
            <TagChips tags={tags} counts={counts} selected={selected} onToggle={toggleTag(setSelected)} />
            <View style={local.switchRow}>
              <Text style={styles.text}>Somente vencidas (SRS)</Text>
              <Switch value={onlyDueState} onValueChange={setOnlyDue} />
            </View>
          </View>
          <Text style={styles.muted}>Sem questões para este filtro.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.finished) {
    return (
      <SafeAreaView style={styles.sa} edges={['bottom']}>
        <View style={styles.container}>
          <View style={styles.panel}>
            <Text style={styles.h2}>Sessão concluída</Text>
            <Text style={styles.text}>Pontuação: {state.score}/{state.total}</Text>
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
      <View style={styles.container}>
        <View style={styles.panel}>
          <TagChips tags={tags} counts={counts} selected={selected} onToggle={toggleTag(setSelected)} />
          <View style={local.switchRow}>
            <Text style={styles.text}>Somente vencidas (SRS)</Text>
            <Switch value={onlyDueState} onValueChange={setOnlyDue} />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.progressOuter}><View style={[styles.progressInner, { width: `${Math.round(progress * 100)}%` }]} /></View>
          <Text style={[styles.h2, { marginVertical: 8 }]}>{state.current.text}</Text>

          {!state.answered ? (
            state.options.map((opt, idx) => (
              <Pressable key={idx} onPress={() => onAnswer(idx)} style={({ pressed }) => [local.option, pressed && { opacity: 0.85 }]}>
                <Text style={styles.text}>{String(opt)}</Text>
              </Pressable>
            ))
          ) : (
            <View>
              {state.options.map((opt, idx) => {
                const isCorrect = opt === state.current.answer;
                const isChosen = opt === state.answered?.chosen;
                const styleVariant = isCorrect ? local.optionCorrect : (isChosen ? local.optionWrong : null);
                return (
                  <View key={idx} style={[local.option, styleVariant]}>
                    <Text style={styles.text}>{String(opt)}</Text>
                  </View>
                );
              })}
              <View style={{ height: 12 }} />
              <PrimaryButton title="Próxima" onPress={() => { setCelebrate(false); next(); }} />
            </View>
          )}

          <Text style={[styles.muted, { marginTop: 10 }]}>{state.index + 1} de {state.total}</Text>
        </View>
      </View>

      {celebrate && (
        <SuccessCelebration onDone={() => setCelebrate(false)} />
      )}
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
function sample(arr, n) { const copy = [...arr]; const res = []; while (res.length < n && copy.length) { const i = Math.floor(Math.random()*copy.length); res.push(copy.splice(i,1)[0]); } while (res.length < n) res.push('Nenhuma das anteriores ' + (res.length + 1)); return res; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
