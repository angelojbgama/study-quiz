// src/screens/CardsScreen.js
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import PrimaryButton from "../components/PrimaryButton";
import { getQuestionsByQuiz, applySrsResult } from "../db";
import TagChips from "../components/TagChips";
import { distinctTagsFromQuestions, tagCounts, parseTags } from "../util/tags";
import useAppStyles from "../ui/useAppStyles";
import SuccessCelebration from "../components/SuccessCelebration";

const SP = 14;
const SP_SM = 8;

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
  const [celebrate, setCelebrate] = useState(false);

  const [locked, setLocked] = useState(false);
  const actedRef = useRef(false);

  // coleta resultados da sessão
  const resultsRef = useRef([]);
  const startedAtRef = useRef(Date.now());

  const styles = useAppStyles();
  const { colors } = useTheme();

  // ------- animações (uma única declaração de cada) -------
  const shakeX = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const local = useMemo(
    () =>
      StyleSheet.create({
        section: { marginTop: SP },
        switchRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: SP_SM,
        },
        cardBox: {
          minHeight: 230,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 12,
        },
        term: {
          fontSize: 18,
          fontWeight: "700",
          textAlign: "center",
          color: colors.text,
        },
        sub: { marginTop: SP_SM, color: colors.muted, textAlign: "center" },
        row: { flexDirection: "row", marginTop: SP },
        centerRow: { alignItems: "center", marginTop: SP },
        progressOuter: {
          height: 8,
          backgroundColor: colors.border,
          borderRadius: 8,
          overflow: "hidden",
        },
        progressInner: { height: 8, backgroundColor: colors.primary },
        expl: {
          marginTop: SP_SM,
          color: colors.text,
          textAlign: "center",
          fontSize: 16,
          lineHeight: 22,
        },
        tagRow: {
          marginTop: SP_SM,
          flexDirection: "row",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 6,
        },
        tagBubble: {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        tagTxt: { color: colors.muted, fontSize: 12, fontWeight: "600" },
        wideBtn: { minWidth: 220 },
      }),
    [colors]
  );

  useEffect(() => {
    (async () => {
      const qs = await getQuestionsByQuiz(quizId);
      setAll(qs);
      setTags(distinctTagsFromQuestions(qs));
      setCounts(tagCounts(qs));
      resultsRef.current = [];
      startedAtRef.current = Date.now();
    })();
  }, [quizId]);

  useEffect(() => {
    const now = Date.now();
    const filtered = (all || []).filter((q) => {
      if (selected.size > 0) {
        const t = parseTags(q.tags).map((x) => x.toLowerCase());
        if (!t.some((x) => selected.has(x))) return false;
      }
      if (onlyDue) {
        const due = Number(q.due_at || 0);
        if (isNaN(due) || due > now) return false;
      }
      return true;
    });
    setCards(shuffle(filtered));
    setIdx(0);
    setShow(false);
    setScore({ right: 0, wrong: 0 });
    setLocked(false);
    actedRef.current = false;
    resultsRef.current = [];
    startedAtRef.current = Date.now();
  }, [all, selected, onlyDue]);

  useEffect(() => {
    setLocked(false);
    actedRef.current = false;
  }, [idx]);

  useEffect(() => {
    if (show) {
      fade.setValue(0);
      pulse.setValue(0);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(pulse, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [show, fade, pulse]);

  const progress = cards.length ? (idx + 1) / cards.length : 0;

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.sa} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: SP }]}
        >
          <View style={styles.panel}>
            <TagChips
              tags={tags}
              counts={counts}
              selected={selected}
              onToggle={toggleTag(setSelected)}
            />
            <View style={local.switchRow}>
              <Text style={styles.text}>Somente vencidos (SRS)</Text>
              <Switch value={onlyDue} onValueChange={setOnlyDue} />
            </View>
          </View>
          <Text style={[styles.muted, { marginTop: SP_SM }]}>
            Sem cartões para este filtro.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cur = cards[idx];

  const goToConclusion = () => {
    const finishedAt = Date.now();
    navigation.navigate("Conclusion", {
      source: "cards",
      quizId,
      results: resultsRef.current,
      startedAt: startedAtRef.current,
      finishedAt,
    });
  };

  const next = () => {
    if (idx + 1 >= cards.length) {
      goToConclusion();
    } else {
      setIdx(idx + 1);
      setShow(false);
    }
  };

  // animação de “shake” no erro (usa a MESMA instância de shakeX)
  const runShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: 1,
        duration: 40,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -1,
        duration: 40,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 1,
        duration: 40,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 40,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pushResult = (ok) => {
    resultsRef.current.push({
      id: cur.id,
      text: cur.text,
      answer: cur.answer,
      tags: cur.tags,
      correct: ok,
    });
  };

  const onWrong = async () => {
    if (locked || actedRef.current) return;
    setLocked(true);
    actedRef.current = true;

    setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
    pushResult(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {}
    );
    runShake();
    await applySrsResult(cur.id, false);
    setTimeout(next, 140);
  };

  const onCorrect = () => {
    if (locked || actedRef.current) return;
    setLocked(true);
    actedRef.current = true;

    setScore((s) => ({ ...s, right: s.right + 1 }));
    pushResult(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    setCelebrate(true);
    applySrsResult(cur.id, true).catch(() => {});
  };

  const translateX = shakeX.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-6, 0, 6],
  });

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: SP }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* filtros */}
        <View style={styles.panel}>
          <TagChips
            tags={tags}
            counts={counts}
            selected={selected}
            onToggle={toggleTag(setSelected)}
          />
          <View style={local.switchRow}>
            <Text style={styles.text}>Somente vencidos (SRS)</Text>
            <Switch value={onlyDue} onValueChange={setOnlyDue} />
          </View>
        </View>

        {/* progresso */}
        <View style={local.section}>
          <View style={local.progressOuter}>
            <View
              style={[
                local.progressInner,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={[styles.muted, { marginTop: SP_SM }]}>
            {idx + 1} de {cards.length} • Acertos: {score.right}
          </Text>
        </View>

        {/* cartão */}
        <Animated.View
          style={[
            styles.card,
            local.cardBox,
            local.section,
            { transform: [{ translateX }] },
          ]}
        >
          {!show ? (
            <Pressable
              onPress={() => setShow(true)}
              style={{ alignItems: "center" }}
            >
              <Text style={local.term}>{cur.text}</Text>
              <Text style={local.sub}>Toque para ver a resposta</Text>
            </Pressable>
          ) : (
            <Animated.View
              style={{
                alignItems: "center",
                opacity: fade,
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              }}
            >
              <Text style={local.term}>{cur.answer}</Text>
              {cur.explanation ? (
                <Text style={local.expl}>💡 {cur.explanation}</Text>
              ) : null}
              {cur.tags ? (
                <View style={local.tagRow}>
                  {parseTags(cur.tags).map((t) => (
                    <View key={t} style={local.tagBubble}>
                      <Text style={local.tagTxt}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={local.sub}>Use os botões abaixo para marcar</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ações */}
        {show ? (
          <View style={[local.row]}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Errei"
                variant="danger"
                onPress={onWrong}
                block
                disabled={locked}
              />
            </View>
            <View style={{ width: SP_SM }} />
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Acertei"
                onPress={onCorrect}
                block
                disabled={locked}
              />
            </View>
          </View>
        ) : (
          <View style={local.centerRow}>
            <PrimaryButton
              title="Mostrar resposta"
              onPress={() => setShow(true)}
              style={local.wideBtn}
              size="lg"
              disabled={locked}
            />
          </View>
        )}
      </ScrollView>

      {celebrate && (
        <SuccessCelebration
          onDone={() => {
            setCelebrate(false);
            next();
          }}
        />
      )}
    </SafeAreaView>
  );
}

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
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
