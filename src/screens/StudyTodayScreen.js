// src/screens/StudyTodayScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Switch, ScrollView, Alert, TextInput, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TagChips from "../components/TagChips";
import PrimaryButton from "../components/PrimaryButton";
import useAppStyles from "../ui/useAppStyles";
import { distinctTagsFromQuestions, tagCounts, parseTags } from "../util/tags";
import { getQuizzes, getQuestionsByQuiz } from "../db";
import * as Haptics from 'expo-haptics';
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const clampGoal = (n) => Math.max(1, Math.min(500, Number.isFinite(n) ? n : 20));

export default function StudyTodayScreen({ navigation }) {
  const styles = useAppStyles();
  const { colors } = useTheme();

  const [all, setAll] = useState([]);
  const [tags, setTags] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [goal, setGoal] = useState(20);
  const [onlyDue, setOnlyDue] = useState(true);

  useEffect(()=>{(async ()=>{
    const decks = await getQuizzes();
    let allQ = [];
    for (const d of decks) {
      const qs = await getQuestionsByQuiz(d.id);
      allQ = allQ.concat(qs||[]);
    }
    setAll(allQ);
    setTags(distinctTagsFromQuestions(allQ));
    setCounts(tagCounts(allQ));
  })();},[]);

  const { availTotal, dueTotal } = useMemo(()=>{
    const now = Date.now();
    const inFilter = (all||[]).filter((q) => {
      if (selected.size>0) {
        const t = parseTags(q.tags).map((x)=>x.toLowerCase());
        if (!t.some((x)=>selected.has(x))) return false;
      }
      return true;
    });
    const due = inFilter.filter((q)=> Number(q.due_at||0) <= now).length;
    return { availTotal: inFilter.length, dueTotal: due };
  },[all, selected]);

  const adjustGoal = useCallback((delta) => {
    setGoal((g) => clampGoal((parseInt(g, 10) || 0) + delta));
  }, []);

  const onChangeGoal = useCallback((t) => {
    const v = parseInt(String(t).replace(/[^\d]/g, ''), 10);
    setGoal(clampGoal(Number.isFinite(v) ? v : 0));
  }, []);

  const start = async () => {
    if (onlyDue && dueTotal <= 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sem questões vencidas', 'Não há questões vencidas para o filtro atual. Desative "Somente vencidos (SRS)" ou ajuste as tags.');
      return;
    }
    if (availTotal <= 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sem questões', 'Não há questões disponíveis para o filtro atual.');
      return;
    }
    const limit = clampGoal(parseInt(goal, 10));
    // Navega para a tela Learn dentro da aba "Início"
    navigation.getParent()?.navigate('Início', {
      screen: 'Learn',
      params: {
        onlyDue,
        selectedTags: Array.from(selected),
        sessionLimit: limit,
      },
    });
  };

  const local = useMemo(()=>StyleSheet.create({
    rowBetween: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
    stepBtn: {
      width: 42, height: 42, borderRadius: 10, alignItems:'center', justifyContent:'center',
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card
    },
    goalInput: {
      width: 72, textAlign: 'center',
      borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colors.card, color: colors.text
    },
    spacer: { width: 8 },
  }), [colors]);

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator>
        <View style={styles.panel}>
          <Text style={styles.h2}>Estudar Hoje</Text>

          <TagChips tags={tags} counts={counts} selected={selected} onToggle={(t)=>{
            if (!t) { setSelected(new Set()); return; }
            setSelected((prev)=>{ const next=new Set(prev); const key=t.toLowerCase(); if(next.has(key)) next.delete(key); else next.add(key); return next;});
          }} />

          <View style={{ height: 8 }} />
          <View style={local.rowBetween}>
            <Text style={{ color: colors.text }}>Somente vencidos (SRS)</Text>
            <Switch value={onlyDue} onValueChange={setOnlyDue} />
          </View>

          <View style={{ height: 8 }} />
          <Text style={styles.muted}>Disponíveis: {availTotal} • Vencidos: {dueTotal}</Text>

          <View style={{ height: 12 }} />
          <Text style={styles.h2}>Meta da sessão</Text>
          <View style={local.rowBetween}>
            <Pressable onPress={()=>adjustGoal(-5)} style={({pressed})=> [local.stepBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel="Diminuir meta">
              <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
            </Pressable>
            <TextInput
              value={String(goal)}
              onChangeText={onChangeGoal}
              keyboardType="number-pad"
              selectTextOnFocus
              style={local.goalInput}
              accessibilityLabel="Quantidade de questões da sessão"
            />
            <Pressable onPress={()=>adjustGoal(5)} style={({pressed})=> [local.stepBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel="Aumentar meta">
              <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ height: 12 }} />
          <PrimaryButton title={`Começar (${goal})`} icon="play" onPress={start} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
