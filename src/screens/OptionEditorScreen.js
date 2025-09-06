// src/screens/OptionEditorScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "../components/PrimaryButton";
import useAppStyles from "../ui/useAppStyles";
import { getQuestionById, getOptionsByQuestion, replaceOptions, updateQuestion } from "../db";

export default function OptionEditorScreen({ route, navigation }) {
  const { questionId, prefill } = route.params || {};
  const styles = useAppStyles();

  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([
    { id:'opt-1', text:'', isCorrect:true },
    { id:'opt-2', text:'', isCorrect:false },
    { id:'opt-3', text:'', isCorrect:false },
    { id:'opt-4', text:'', isCorrect:false },
  ]);

  useEffect(() => {
    (async () => {
      const q = await getQuestionById(questionId);
      setQuestion(q);
      const rows = await getOptionsByQuestion(questionId);
      if (rows && rows.length) {
        setOptions(rows.map((o)=>({ id: String(o.id), text: o.text||'', isCorrect: !!o.isCorrect })));
      } else if (prefill?.answer) {
        const wrongs = prefill?.wrongs || [];
        const base = [{ id:'new-1', text: prefill.answer, isCorrect:true }];
        for (let i=0;i<Math.max(1,wrongs.length);i++) base.push({ id:'new-'+(i+2), text: wrongs[i]||'', isCorrect:false });
        while (base.length < 4) base.push({ id:'new-'+(base.length+1), text:'', isCorrect:false });
        setOptions(base);
      }
    })();
  }, [questionId, prefill]);

  const setCorrect = (idx) => {
    setOptions((prev)=> prev.map((o,i)=>({ ...o, isCorrect: i===idx })));
  };
  const setText = (idx, t) => { setOptions((prev)=> prev.map((o,i)=> i===idx?{...o, text:t}:o)); };
  const addWrong = () => { setOptions((prev)=> [...prev, { id:'new-'+(prev.length+1), text:'', isCorrect:false }]); };
  const remove = (idx) => {
    setOptions((prev)=> {
      const cp = [...prev];
      const [removed] = cp.splice(idx,1);
      if (removed?.isCorrect && cp.length>0) cp[0] = { ...cp[0], isCorrect:true };
      return cp;
    });
  };

  const save = async () => {
    const trimmed = options.map((o)=>({ ...o, text: String(o.text||'').trim() }));
    if (!trimmed.some((o)=>o.isCorrect)) { Alert.alert('Selecione uma correta.'); return; }
    if (trimmed.some((o)=>!o.text)) { Alert.alert('Preencha ou remova alternativas vazias.'); return; }
    await replaceOptions(questionId, trimmed);
    const correct = trimmed.find((o)=>o.isCorrect)?.text || '';
    if (correct) await updateQuestion(questionId, { answer: correct });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        <View style={styles.panel}>
          <Text style={styles.h2}>Alternativas</Text>
          <Text style={styles.muted}>{question?.text || 'Pergunta'}</Text>
          <View style={{ height: 8 }} />
          {options.map((o, idx)=>(
            <View key={o.id} style={[styles.card, { marginBottom: 8 }]}>
              <TextInput
                value={o.text}
                onChangeText={(t)=>setText(idx,t)}
                placeholder={o.isCorrect ? "Resposta correta" : `Distrator ${idx + 1}`}
                style={styles.input}
              />
              <View style={{ height: 6 }} />
              <View style={{ flexDirection:'row', gap:8 }}>
                {!o.isCorrect ? (
                  <PrimaryButton title="Marcar correta" onPress={()=>setCorrect(idx)} />
                ) : (
                  <PrimaryButton title="Correta" variant="secondary" />
                )}
                <PrimaryButton title="Remover" variant="dangerOutline" onPress={()=>remove(idx)} />
              </View>
            </View>
          ))}
          <PrimaryButton title="Adicionar alternativa" variant="secondary" icon="plus" onPress={addWrong} />
          <View style={{ height: 8 }} />
          <PrimaryButton title="Salvar" icon="content-save" onPress={save} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
