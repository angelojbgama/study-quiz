// src/screens/HomeScreen.js
import React, { useMemo, useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import PrimaryButton from "../components/PrimaryButton";
import { VStack, HStack } from "../ui/Stack";
import useAppStyles from "../ui/useAppStyles";

import { getQuizzes, getQuestionsByQuiz, createQuiz, deleteQuiz } from "../db";

export default function HomeScreen({ navigation }) {
  const [quizzes, setQuizzes] = useState([]);
  const [query, setQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { colors } = useTheme();
  const styles = useAppStyles();
  const tabBarHeight = useBottomTabBarHeight();

  async function load() {
    const list = await getQuizzes();
    const withMeta = [];
    const now = Date.now();
    for (const q of list) {
      const qs = await getQuestionsByQuiz(q.id);
      const total = qs.length;
      const due = qs.filter((x)=> Number(x.due_at||0) <= now).length;
      withMeta.push({ ...q, total, due });
    }
    setQuizzes(withMeta);
  }

  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

  const filtered = useMemo(() => {
    const q = String(query||'').trim().toLowerCase();
    if (!q) return quizzes;
    return quizzes.filter((it)=> String(it.title||'').toLowerCase().includes(q));
  }, [quizzes, query]);

  const local = useMemo(()=>StyleSheet.create({
    searchBox:{ borderWidth:1,borderColor:colors.border,borderRadius:10,paddingHorizontal:12,paddingVertical:12,backgroundColor:colors.card,color:colors.text,marginTop:12 },
    item:{ padding:12, backgroundColor:colors.card, borderRadius:10, borderWidth:1, borderColor:colors.border },
    itemPressed:{ transform:[{scale:0.985}], opacity:0.96 },
    itemTitle:{ fontSize:15, fontWeight:"700", color:colors.text },
    badgesRow:{ flexDirection:"row", alignItems:"center", marginTop:6 },
    badge:{ paddingHorizontal:6, paddingVertical:3, borderRadius:999, backgroundColor:colors.card, borderWidth:1, borderColor:colors.border, marginRight:6 },
    badgeText:{ color:colors.text, fontSize:11, fontWeight:"700" },
    badgePrimary:{ paddingHorizontal:6, paddingVertical:3, borderRadius:999, backgroundColor:colors.primary },
    badgePrimaryText:{ color:colors.buttonText, fontSize:11, fontWeight:"700" },
  }),[colors]);

  const createNew = async () => {
    const t = String(newTitle||'').trim();
    if (!t) { Alert.alert('Informe um título'); return; }
    await createQuiz(t, '');
    setNewTitle('');
    await load();
  };

  const handleDelete = async (item) => {
    Alert.alert('Excluir quiz', `Excluir "${item.title}"?`, [
      { text:'Cancelar', style:'cancel' },
      { text:'Excluir', style:'destructive', onPress: async ()=>{ await deleteQuiz(item.id); await load(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.sa} edges={[]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 8 }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <VStack space={14}>
          <View style={styles.panel}>
            <Text style={[styles.h2, { marginBottom: 4 }]}>Bem-vindo 👋</Text>
            <Text style={styles.muted}>Crie quizzes e comece a estudar.</Text>

            <View style={{ height: 10 }} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack space={8}>
                <PrimaryButton title="Estudar Hoje" icon="book-open-variant" size="sm" onPress={()=>navigation.getParent()?.navigate('Estudar')} />
                <PrimaryButton title="Estatísticas" icon="chart-line-variant" size="sm" onPress={()=>navigation.getParent()?.navigate('Estatísticas')} />
                <PrimaryButton title="Backup" variant="secondary" icon="cloud-upload" size="sm" onPress={()=>navigation.getParent()?.navigate('Backup')} />
                <PrimaryButton title="Importar" variant="secondary" icon="tray-arrow-down" size="sm" onPress={()=>navigation.navigate('Import')} />
              </HStack>
            </ScrollView>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar quiz pelo título..."
              placeholderTextColor={colors.muted}
              style={local.searchBox}
              returnKeyType="search"
            />

            <View style={{ height: 12 }} />

            <Text style={styles.h2}>Novo Quiz</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Título do quiz..."
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <View style={{ height: 6 }} />
            <PrimaryButton title="Criar" icon="plus" onPress={createNew} />
          </View>

          <Text style={styles.h2}>Seus Quizzes</Text>
          {filtered.length === 0 ? (
            <Text style={styles.muted}>Nenhum resultado. Crie um quiz ou importe perguntas.</Text>
          ) : (
            <VStack space={8}>
              {filtered.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => navigation.navigate('QuestionList', { quizId: item.id, title: item.title })}
                  onLongPress={() => handleDelete(item)}
                  android_ripple={{ color: colors.border }}
                  style={({ pressed }) => [local.item, pressed && local.itemPressed]}
                >
                  <Text style={local.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={local.badgesRow}>
                    <View style={local.badge}><Text style={local.badgeText}>{item.total} questões</Text></View>
                    <View style={local.badgePrimary}>
                      <Text style={local.badgePrimaryText}>
                        <MaterialCommunityIcons name="clock-outline" size={11} color={colors.buttonText} /> {item.due}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
