// src/screens/QuestionEditorScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "../components/PrimaryButton";
import useAppStyles from "../ui/useAppStyles";
import { createQuestion, getQuestionById, updateQuestion } from "../db";

export default function QuestionEditorScreen({ route, navigation }) {
  const { quizId, questionId } = route.params || {};
  const isEditing = !!questionId;
  const styles = useAppStyles();

  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [tags, setTags] = useState('');
  const [wrong1, setWrong1] = useState('');
  const [wrong2, setWrong2] = useState('');
  const [wrong3, setWrong3] = useState('');

  useEffect(() => {
    (async () => {
      if (!isEditing) return;
      const q = await getQuestionById(questionId);
      if (q) {
        setText(q.text || '');
        setAnswer(q.answer || '');
        setExplanation(q.explanation || '');
        setTags(q.tags || '');
      }
    })();
  }, [isEditing, questionId]);

  const save = async () => {
    const t = String(text||'').trim();
    const a = String(answer||'').trim();
    if (!t || !a) { Alert.alert('Preencha pergunta e resposta.'); return; }

    if (!isEditing) {
      const id = await createQuestion(quizId, t, a, explanation, tags);
      // se tiver alternativas já digitadas, cria na tela de opções
      if ([wrong1, wrong2, wrong3].some((w)=>String(w||'').trim())) {
        navigation.replace('OptionEditor', {
          questionId: id,
          prefill: { answer: a, wrongs: [wrong1, wrong2, wrong3].map((w)=>String(w||'').trim()).filter(Boolean) }
        });
        return;
      }
      navigation.goBack();
      return;
    }

    await updateQuestion(questionId, { text: t, answer: a, explanation, tags });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          <View style={styles.panel}>
            <Text style={styles.h2}>{isEditing ? 'Editar Pergunta' : 'Nova Pergunta'}</Text>
            <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Pergunta" />
            <TextInput style={styles.input} value={answer} onChangeText={setAnswer} placeholder="Resposta correta" />
            <TextInput style={[styles.input, { minHeight: 120, textAlignVertical:'top' }]} value={explanation} onChangeText={setExplanation} placeholder="Explicação (opcional)" multiline />
            <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="tags separadas por vírgula" />

            {!isEditing ? (
              <>
                <Text style={[styles.h2, { marginTop: 12 }]}>Alternativas (opcional)</Text>
                <TextInput style={styles.input} value={wrong1} onChangeText={setWrong1} placeholder="Distrator 1" />
                <TextInput style={styles.input} value={wrong2} onChangeText={setWrong2} placeholder="Distrator 2" />
                <TextInput style={styles.input} value={wrong3} onChangeText={setWrong3} placeholder="Distrator 3" />
              </>
            ) : null}

            <View style={{ height: 8 }} />
            <PrimaryButton title="Salvar" icon="content-save" onPress={save} />
            {isEditing ? (
              <>
                <View style={{ height: 8 }} />
                <PrimaryButton title="Editar Alternativas" variant="secondary" onPress={()=> navigation.navigate('OptionEditor', { questionId })} />
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
