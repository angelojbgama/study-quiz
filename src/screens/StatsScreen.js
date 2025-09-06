// src/screens/StatsScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useAppStyles from "../ui/useAppStyles";
import { getQuizzes, getQuestionsByQuiz } from "../db";
import { distinctTagsFromQuestions, parseTags } from "../util/tags";

export default function StatsScreen() {
  const styles = useAppStyles();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ (async ()=>{
    setLoading(true);
    try {
      const decks = await getQuizzes();
      let all = [];
      for (const q of decks) {
        const qs = await getQuestionsByQuiz(q.id);
        all = all.concat(qs || []);
      }
      const tags = distinctTagsFromQuestions(all);
      const now = Date.now();
      const items = tags.map((t) => {
        const qs = all.filter((q)=> parseTags(q.tags).map((x)=>x.toLowerCase()).includes(String(t).toLowerCase()));
        const total = qs.length;
        const due = qs.filter((q)=> Number(q.due_at||0) <= now).length;
        const correct = qs.reduce((acc, q)=> acc + Number(q.correct_count||0), 0);
        const wrong = qs.reduce((acc, q)=> acc + Number(q.wrong_count||0), 0);
        const attempts = correct + wrong;
        const accRate = attempts ? Math.round((correct/attempts)*100) : 0;
        return { tag: t, total, due, accRate, attempts };
      }).sort((a,b)=> a.tag.localeCompare(b.tag));
      setRows(items);
    } finally { setLoading(false); }
  })(); },[]);

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator>
        <View style={styles.panel}>
          <Text style={styles.h2}>Estatísticas por Tag</Text>
          {!rows.length ? <Text style={styles.muted}>{loading?'Carregando...':'Sem dados.'}</Text> : null}
        </View>

        {rows.map((r)=>(
          <View key={r.tag} style={[styles.card, { marginTop: 8 }]}>
            <Text style={{ fontWeight:'700' }}>{r.tag}</Text>
            <Text style={styles.muted}>Questões: {r.total} • Vencidos: {r.due}</Text>
            <Text style={styles.muted}>Acurácia: {r.accRate}% • Tentativas: {r.attempts}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
