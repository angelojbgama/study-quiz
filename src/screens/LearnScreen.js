// src/screens/LearnScreen.js
import React, { useEffect, useMemo, useState, useRef, useCallback, useLayoutEffect } from "react";
import { View, Text, StyleSheet, Pressable, Switch, Animated, ScrollView, BackHandler, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";

import PrimaryButton from "../components/PrimaryButton";
import TagChips from "../components/TagChips";
import { distinctTagsFromQuestions, tagCounts, parseTags } from "../util/tags";
import useAppStyles from "../ui/useAppStyles";
import SuccessCelebration from "../components/SuccessCelebration";
import FailFeedback from "../components/FailFeedback";
import useAndroidNavHidden from "../ui/useAndroidNavHidden";

import { getQuizzes, getQuestionsByQuiz, applySrsResult, getOptionsByQuestion } from "../db";

export default function LearnScreen({ route, navigation }) {
  const params = route?.params ?? {};
  const quizId = params.quizId ?? undefined;
  const selectedTagsParam = Array.isArray(params.selectedTags) ? params.selectedTags : [];
  const sessionLimit = Number.isFinite(params.sessionLimit) ? params.sessionLimit : 0;
  const questionIds = Array.isArray(params.questionIds) ? params.questionIds : null;

  const styles = useAppStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Esconde a barra nativa (home/voltar/recentes) no Android
  useAndroidNavHidden(true);

  // === SAIR DO QUIZ ===
  const requestExit = useCallback(() => {
    Alert.alert(
      "Sair do quiz?",
      "Seu progresso desta sessão não finalizada não será contabilizado como sessão concluída. Deseja sair agora?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: () => {
            navigation.popToTop();
            navigation.getParent?.()?.navigate("Início");
          },
        },
      ]
    );
  }, [navigation]);

  // Botão físico "voltar" aciona a confirmação de saída (em vez de bloquear)
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      requestExit();
      return true;
    });
    return () => sub.remove();
  }, [requestExit]);

  // Botão "Sair do Quiz" no cabeçalho
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      gestureEnabled: false,
      headerRight: () => (
        <Pressable onPress={requestExit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Sair do Quiz">
          <Text style={{ color: colors.danger, fontWeight: "700" }}>Sair do Quiz</Text>
        </Pressable>
      ),
    });
  }, [navigation, requestExit, colors.danger]);

  // === estado principal ===
  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set(selectedTagsParam.map((x)=>String(x).toLowerCase())));
  const onlyDueInit = typeof params.onlyDue === 'boolean' ? params.onlyDue : true;
  const [onlyDue, setOnlyDue] = useState(onlyDueInit);

  const [seq, setSeq] = useState([]);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [answered, setAnswered] = useState(null);
  const [lock, setLock] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const wrongMapRef = useRef(new Map());
  const [celebrate, setCelebrate] = useState(false);
  const [showFail, setShowFail] = useState(false);

  const shakeX = useRef(new Animated.Value(0)).current;
  const runShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 90, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const local = useMemo(()=>StyleSheet.create({
    panel: { padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    option: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 8, backgroundColor: colors.card },
    progressOuter: { height: 8, backgroundColor: colors.border, borderRadius: 8, overflow: "hidden" },
    progressInner: { height: 8, backgroundColor: colors.primary },
    hint: { color: colors.muted },
    card: { padding: 16, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    question: { fontSize: 18, fontWeight: "700", color: colors.text },
    footerExitWrap: { position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 },
  }),[colors, insets.bottom]);

  // carregar questões
  useEffect(() => {
    (async () => {
      let allQ = [];
      if (quizId) {
        allQ = await getQuestionsByQuiz(quizId);
      } else {
        const decks = await getQuizzes();
        for (const d of decks) {
          const qs = await getQuestionsByQuiz(d.id);
          allQ = allQ.concat(qs);
        }
      }
      setAll(allQ);
      setTags(distinctTagsFromQuestions(allQ));
      setCounts(tagCounts(allQ));
    })();
  }, [quizId]);

  // recalcular sessão
  useEffect(() => {
    const now = Date.now();
    let pool = all;

    if (Array.isArray(questionIds) && questionIds.length) {
      const setIds = new Set(questionIds.map(Number));
      pool = all.filter((q)=> setIds.has(Number(q.id)));
    }

    const filtered = (pool||[]).filter((q) => {
      if (selected.size > 0) {
        const t = parseTags(q.tags).map((x)=>x.toLowerCase());
        if (!t.some((x)=> selected.has(x))) return false;
      }
      if (onlyDue) {
        const due = Number(q.due_at||0);
        if (!Number.isFinite(due) || due > now) return false;
      }
      return true;
    });

    let nextSeq = shuffle(filtered);
    if (sessionLimit && sessionLimit > 0) nextSeq = nextSeq.slice(0, sessionLimit);

    wrongMapRef.current = new Map();
    setSeq(nextSeq);
    setIndex(0);
    setAnswered(null);
    setLock(false);
    setCelebrate(false);
    setShowFail(false);
    setCorrectCount(0);
    setWrongCount(0);

    (async () => {
      if (nextSeq.length) setOptions(await buildOptions(nextSeq[0], nextSeq, selected));
      else setOptions([]);
    })();
  }, [all, selected, onlyDue, sessionLimit, questionIds]);

  const current = seq[index] || null;

  async function buildOptions(question, seq, selectedSet) {
    // tenta opções salvas
    try {
      const rows = await getOptionsByQuestion(question.id);
      const texts = Array.from(new Set((rows||[]).map((o)=> String(o.text||"").trim()).filter(Boolean)));
      const ans = String(question.answer||"").trim();
      if (ans && !texts.includes(ans)) texts.unshift(ans);
      if (texts.length >= 2) return shuffle(texts);
    } catch {}
    // fallback automático
    const correct = String(question.answer||"").trim();
    let poolCandidates;
    if (selectedSet && selectedSet.size > 0) {
      poolCandidates = (seq||[]).filter((q)=> {
        const tq = parseTags(q.tags).map((x)=>x.toLowerCase());
        for (const t of tq) if (selectedSet.has(t)) return true;
        return false;
      });
    } else {
      const curTags = new Set(parseTags(question.tags).map((x)=>x.toLowerCase()));
      poolCandidates = (seq||[]).filter((q)=> {
        const tq = parseTags(q.tags).map((x)=>x.toLowerCase());
        for (const t of tq) if (curTags.has(t)) return true;
        return false;
      });
    }
    const pool = Array.from(new Set(poolCandidates.map((q)=> String(q.answer||"").trim()).filter((a)=> a && a!==correct)));
    const distractors = sample(pool, 3);
    const unique = Array.from(new Set([correct, ...distractors])).filter(Boolean);
    return shuffle(unique.length>=2 ? unique : [correct, ...(distractors.length?distractors:["Nenhuma das anteriores"])]);
  }

  async function onAnswer(choiceIdx) {
    if (!current || !options.length || answered || lock) return;
    setLock(true);
    const chosen = options[choiceIdx];
    const isCorrect = String(chosen).trim() === String(current.answer).trim();
    setAnswered({ isCorrect, chosen });

    applySrsResult(current.id, isCorrect).catch(()=>{});

    try {
      if (isCorrect) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCelebrate(true);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        runShake();
        setShowFail(true);
      }
    } catch {}

    if (isCorrect) setCorrectCount((c)=>c+1);
    else {
      setWrongCount((w)=>w+1);
      const prev = wrongMapRef.current.get(current.id) || { q: current, wrongs: 0 };
      prev.wrongs += 1;
      wrongMapRef.current.set(current.id, prev);
    }
  }

  async function next() {
    const totalNow = seq.length;
    const nextIndex = index + 1;
    if (nextIndex >= totalNow) {
      finish();
      return;
    }
    const nextQ = seq[nextIndex];
    setIndex(nextIndex);
    setAnswered(null);
    setLock(false);
    setCelebrate(false);
    setShowFail(false);
    setOptions(await buildOptions(nextQ, seq, selected));
  }

  function finish() {
    const totalNow = seq.length;
    const accuracy = totalNow ? Math.round((correctCount/totalNow)*100) : 0;
    const hardest = Array.from(wrongMapRef.current.values())
      .sort((a,b)=> b.wrongs - a.wrongs)
      .slice(0, 10)
      .map(({q,wrongs})=>({ id:q.id, quizId:q.quizId, text:q.text, answer:q.answer, tags:q.tags, wrong_count:wrongs }));

    navigation.replace("Conclusion", {
      source: "learn",
      total: totalNow, correct: correctCount, wrong: wrongCount, accuracy,
      byTag: [], hardest,
    });
  }

  if (!current) {
    return (
      <SafeAreaView style={styles.sa} edges={["bottom"]}>
        <StatusBar hidden />
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 }]} showsVerticalScrollIndicator>
          <View style={local.panel}>
            <TagChips tags={tags} counts={counts} selected={selected} onToggle={(t)=>{
              if (!t) { setSelected(new Set()); return; }
              setSelected((prev)=> {
                const next = new Set(prev); const key = t.toLowerCase();
                if (next.has(key)) next.delete(key); else next.add(key); return next;
              });
            }} />
            <View style={local.switchRow}>
              <Text style={{ color: colors.text }}>Somente vencidas (SRS)</Text>
              <Switch value={onlyDue} onValueChange={setOnlyDue} />
            </View>
          </View>
          <Text style={{ color: colors.muted }}>Sem questões para este filtro.</Text>
        </ScrollView>

        <View pointerEvents="box-none" style={local.footerExitWrap}>
          <PrimaryButton title="Sair do Quiz" variant="dangerOutline" onPress={requestExit} />
        </View>
      </SafeAreaView>
    );
  }

  const total = seq.length;

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <StatusBar hidden />
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 }]} showsVerticalScrollIndicator>
        <View style={local.panel}>
          <TagChips tags={tags} counts={counts} selected={selected} onToggle={(t)=>{
            if (!t) { setSelected(new Set()); return; }
            setSelected((prev)=> {
              const next = new Set(prev); const key = t.toLowerCase();
              if (next.has(key)) next.delete(key); else next.add(key); return next;
            });
          }} />
          <View style={local.switchRow}>
            <Text style={{ color: colors.text }}>Somente vencidas (SRS)</Text>
            <Switch value={onlyDue} onValueChange={setOnlyDue} />
          </View>
        </View>

        <View style={local.panel}>
          <View style={local.progressOuter}><View style={[local.progressInner,{ width: `${Math.round((index+1)/total*100)}%` }]} /></View>
          <Text style={[local.hint,{ marginTop: 8 }]}>{index+1} de {total} — Acertos: {correctCount}</Text>
        </View>

        <Animated.View style={[local.card, { transform: [{ translateX: shakeX }] }]}>
          <Text style={local.question}>{current.text}</Text>
          {!answered ? (
            options.map((opt, i)=>(
              <Pressable key={i} onPress={()=>onAnswer(i)} disabled={lock} style={({pressed})=> [local.option, pressed&&{ opacity: 0.9 }]}>
                <Text style={{ color: colors.text }}>{String(opt)}</Text>
              </Pressable>
            ))
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight:"700", color: answered.isCorrect ? colors.primary : colors.danger }}>
                {answered.isCorrect ? "Correto!" : "Incorreto."}
              </Text>
              {!answered.isCorrect ? <Text style={{ color: colors.text, marginTop: 6 }}>Sua resposta: {String(answered.chosen)}</Text> : null}
              <Text style={{ color: colors.text, marginTop: 2 }}>Certa: {String(current.answer)}</Text>
              {current.explanation ? <Text style={{ color: colors.text, marginTop: 6 }}>{current.explanation}</Text> : null}
              <View style={{ height: 12 }} />
              <PrimaryButton title={index+1>=total?"Concluir":"Próxima"} onPress={next} />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {celebrate && <SuccessCelebration onDone={()=> setCelebrate(false)} />}
      {showFail && <FailFeedback onDone={()=> setShowFail(false)} />}

      <View pointerEvents="box-none" style={local.footerExitWrap}>
        <PrimaryButton title="Sair do Quiz" variant="dangerOutline" onPress={requestExit} />
      </View>
    </SafeAreaView>
  );
}

function shuffle(arr){ return [...arr].sort(()=>Math.random()-0.5); }
function sample(arr,n){ const cp=[...arr], out=[]; while(out.length<n && cp.length){ out.push(cp.splice(Math.floor(Math.random()*cp.length),1)[0]); } while(out.length<n) out.push("Nenhuma das anteriores "+(out.length+1)); return out; }
