// src/screens/LearnScreen.js
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import PrimaryButton from "../components/PrimaryButton";
import { getQuestionsByQuiz, getQuizzes, applySrsResult } from "../db";
import TagChips from "../components/TagChips";
import { distinctTagsFromQuestions, tagCounts, parseTags } from "../util/tags";
import useAppStyles from "../ui/useAppStyles";
import SuccessCelebration from "../components/SuccessCelebration";
import FailFeedback from "../components/FailFeedback";

export default function LearnScreen({ route, navigation }) {
  const {
    quizId,
    onlyDue = false,
    selectedTags = [],
    sessionLimit = 0,
    questionIds = null,
  } = route.params || {};

  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(
    new Set(selectedTags.map((x) => x.toLowerCase()))
  );
  const [onlyDueState, setOnlyDue] = useState(onlyDue);

  const [seq, setSeq] = useState([]);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [answered, setAnswered] = useState(null);
  const [lock, setLock] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const tagStatsRef = useRef(new Map());
  const wrongMapRef = useRef(new Map());

  // Travas síncronas anti-multi-toque
  const answeringRef = useRef(false);
  const finishingRef = useRef(false);

  // Animações / overlays
  const [celebrate, setCelebrate] = useState(false);
  const [showFail, setShowFail] = useState(false);

  // shake no cartão em erro
  const shakeX = useRef(new Animated.Value(0)).current;
  const runShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 8,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -6,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const styles = useAppStyles();
  const { colors } = useTheme();

  const local = useMemo(
    () =>
      StyleSheet.create({
        panel: {
          padding: 12,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
        },
        switchRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        option: {
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          marginTop: 8,
          backgroundColor: colors.card,
        },
        progressOuter: {
          height: 8,
          backgroundColor: colors.border,
          borderRadius: 8,
          overflow: "hidden",
        },
        progressInner: { height: 8, backgroundColor: colors.primary },
        hint: { color: colors.muted },
        resultCorrect: { fontWeight: "700", color: colors.primary },
        resultWrong: { fontWeight: "700", color: colors.danger },
        answerText: {
          marginTop: 6,
          flexWrap: "wrap",
          color: colors.text,
          fontSize: 16,
          lineHeight: 22,
        },
        card: {
          padding: 16,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        question: { fontSize: 18, fontWeight: "700", color: colors.text },
      }),
    [colors]
  );

  const loadQuestions = useCallback(async () => {
    if (quizId) {
      const qs = await getQuestionsByQuiz(quizId);
      setAll(qs);
      setTags(distinctTagsFromQuestions(qs));
      setCounts(tagCounts(qs));
    } else {
      const qz = await getQuizzes();
      let allQ = [];
      for (const deck of qz) allQ = allQ.concat(await getQuestionsByQuiz(deck.id));
      setAll(allQ);
      setTags(distinctTagsFromQuestions(allQ));
      setCounts(tagCounts(allQ));
    }
  }, [quizId]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);
  useFocusEffect(useCallback(() => { loadQuestions(); }, [loadQuestions]));

  // Recalcula sequência / reseta estado de sessão
  useEffect(() => {
    const now = Date.now();
    let pool = all;
    if (questionIds && Array.isArray(questionIds) && questionIds.length) {
      const setIds = new Set(questionIds.map(Number));
      pool = all.filter(q => setIds.has(Number(q.id)));
    }
    const filtered = pool.filter(q => {
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

    // Zera travas síncronas e contadores
    answeringRef.current = false;
    finishingRef.current = false;

    setSeq(shuffled);
    setIndex(0);
    setOptions(shuffled.length ? buildOptions(shuffled[0], shuffled, selected) : []);
    setAnswered(null);
    setLock(false);
    setCelebrate(false);
    setShowFail(false);

    setCorrectCount(0);
    setWrongCount(0);
    tagStatsRef.current = new Map();
    wrongMapRef.current = new Map();
  }, [all, selected, onlyDueState, sessionLimit, questionIds]);

  const current = seq[index];
  const total = seq.length;

  const updateTagStats = (q, isCorrect) => {
    const tgs = parseTags(q.tags);
    tgs.forEach(tagRaw => {
      const tag = String(tagRaw || "").trim();
      if (!tag) return;
      const rec = tagStatsRef.current.get(tag) || { total: 0, correct: 0 };
      rec.total += 1;
      if (isCorrect) rec.correct += 1;
      tagStatsRef.current.set(tag, rec);
    });
  };

  const markWrong = (q) => {
    const prev = wrongMapRef.current.get(q.id) || { q, wrongs: 0 };
    prev.wrongs += 1;
    wrongMapRef.current.set(q.id, prev);
  };

  const onAnswer = async (choiceIdx) => {
    // trava sincrona + estados
    if (answeringRef.current || lock || !current || !options.length || answered) return;
    answeringRef.current = true;
    setLock(true);

    const chosen = options[choiceIdx];
    const isCorrect = chosen === current.answer;
    setAnswered({ isCorrect, chosen });

    applySrsResult(current.id, isCorrect).catch(() => {});

    try {
      if (isCorrect) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCelebrate((v) => v || true);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        runShake();
        setShowFail((v) => v || true);
      }
    } catch {}

    updateTagStats(current, isCorrect);
    if (isCorrect) setCorrectCount((c) => c + 1);
    else { setWrongCount((w) => w + 1); markWrong(current); }
  };

  const next = () => {
    if (!total) return;
    const nextIndex = index + 1;
    if (nextIndex >= total) {
      finishSession();
    } else {
      answeringRef.current = false; // libera toques para a próxima
      const nextQ = seq[nextIndex];
      setIndex(nextIndex);
      setOptions(buildOptions(nextQ, seq, selected));
      setAnswered(null);
      setLock(false);
      setCelebrate(false);
      setShowFail(false);
    }
  };

  const finishSession = () => {
    if (finishingRef.current) return; // evita replace() duplicado
    finishingRef.current = true;

    const correct = correctCount;
    const wrong = wrongCount;
    const totalQ = total;
    const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

    const byTag = Array.from(tagStatsRef.current.entries())
      .map(([tag, rec]) => ({
        tag,
        total: rec.total,
        correct: rec.correct,
        wrong: rec.total - rec.correct,
        accRate: rec.total > 0 ? Math.round((rec.correct / rec.total) * 100) : 0,
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag));

    const hardest = Array.from(wrongMapRef.current.values())
      .sort((a, b) => b.wrongs - a.wrongs)
      .slice(0, 10)
      .map(({ q, wrongs }) => ({
        id: q.id,
        quizId: q.quizId,
        text: q.text,
        answer: q.answer,
        tags: q.tags,
        wrong_count: wrongs,
      }));

    navigation.replace("Conclusion", {
      source: "learn",
      total: totalQ,
      correct,
      wrong,
      accuracy,
      byTag,
      hardest,
    });
  };

  if (!current) {
    return (
      <SafeAreaView style={styles.sa} edges={["bottom"]}>
        <View style={[styles.container, { paddingBottom: 16 }]}>
          <View style={local.panel}>
            <TagChips
              tags={tags}
              counts={counts}
              selected={selected}
              onToggle={toggleTag(setSelected)}
            />
            <View style={local.switchRow}>
              <Text style={{ color: colors.text }}>Somente vencidas (SRS)</Text>
              <Switch value={onlyDueState} onValueChange={setOnlyDue} />
            </View>
          </View>
          <Text style={local.hint}>Sem questões para este filtro.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = total ? (index + 1) / total : 0;

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <View style={[styles.container, { paddingBottom: 16 }]}>
        <View style={local.panel}>
          <TagChips
            tags={tags}
            counts={counts}
            selected={selected}
            onToggle={toggleTag(setSelected)}
          />
          <View style={local.switchRow}>
            <Text style={{ color: colors.text }}>Somente vencidas (SRS)</Text>
            <Switch value={onlyDueState} onValueChange={setOnlyDue} />
          </View>
        </View>

        <View style={local.panel}>
          <View style={local.progressOuter}>
            <View
              style={[
                local.progressInner,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={[local.hint, { marginTop: 8 }]}>
            {index + 1} de {total} — Acertos: {correctCount}
          </Text>
        </View>

        <Animated.View style={[local.card, { transform: [{ translateX: shakeX }] }]}>
          <Text style={local.question}>{current.text}</Text>

          {!answered ? (
            options.map((opt, idx) => (
              <Pressable
                key={idx}
                onPress={() => onAnswer(idx)}
                disabled={lock}
                style={({ pressed }) => [local.option, pressed && { opacity: 0.85 }]}
                android_ripple={{ color: colors.border }}
              >
                <Text style={{ color: colors.text }}>{String(opt)}</Text>
              </Pressable>
            ))
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={answered.isCorrect ? local.resultCorrect : local.resultWrong}>
                {answered.isCorrect ? "Correto!" : "Incorreto."}
              </Text>
              {!answered.isCorrect ? (
                <Text style={local.answerText}>Sua resposta: {String(answered.chosen)}</Text>
              ) : null}
              <Text style={local.answerText}>Resposta correta: {String(current.answer)}</Text>
              {current.explanation ? (
                <Text style={[local.answerText, { marginTop: 4 }]}>{current.explanation}</Text>
              ) : null}
              <View style={{ height: 12 }} />
              <PrimaryButton title={index + 1 >= total ? "Concluir" : "Próxima"} onPress={next} />
            </View>
          )}
        </Animated.View>
      </View>

      {/* Overlays de feedback */}
      {celebrate && <SuccessCelebration onDone={() => setCelebrate(false)} />}
      {showFail && <FailFeedback onDone={() => setShowFail(false)} />}
    </SafeAreaView>
  );
}

/* ===== Helpers ===== */
function toggleTag(setSelected) {
  return (t) => {
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
  };
}

function buildOptions(question, seq, selectedSet) {
  const correct = question.answer;
  let poolCandidates;
  if (selectedSet && selectedSet.size > 0) {
    poolCandidates = seq.filter((q) => {
      const tq = parseTags(q.tags).map((x) => x.toLowerCase());
      for (const t of tq) if (selectedSet.has(t)) return true;
      return false;
    });
  } else {
    const curTags = new Set(parseTags(question.tags).map((x) => x.toLowerCase()));
    poolCandidates = seq.filter((q) => {
      const tq = parseTags(q.tags).map((x) => x.toLowerCase());
      for (const t of tq) if (curTags.has(t)) return true;
      return false;
    });
  }
  const pool = Array.from(
    new Set(poolCandidates.map((q) => q.answer).filter((a) => a && a !== correct))
  );
  const distractors = sample(pool, 3);
  const unique = Array.from(new Set([correct, ...distractors]));
  return shuffle(unique);
}

function sample(arr, n) {
  const copy = [...arr];
  const res = [];
  while (res.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    res.push(copy.splice(i, 1)[0]);
  }
  while (res.length < n) res.push("Nenhuma das anteriores " + (res.length + 1));
  return res;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
