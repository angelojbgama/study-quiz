// src/screens/HomeScreen.js
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import PrimaryButton from "../components/PrimaryButton";
import { getQuizzes, deleteQuiz, getQuestionsByQuiz } from "../db";
import useAppStyles from "../ui/useAppStyles";
import { VStack, HStack } from "../ui/Stack";

export default function HomeScreen({ navigation }) {
  const [quizzes, setQuizzes] = useState([]);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { colors } = useTheme();
  const styles = useAppStyles();
  const tabBarHeight = useBottomTabBarHeight();

  const local = useMemo(
    () =>
      StyleSheet.create({
        listWrap: { gap: 6, paddingTop: 2, paddingBottom: 2 },
        item: {
          flex: 1,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.card,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 66,
        },
        itemPressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
        itemTitle: {
          fontSize: 15,
          lineHeight: 20,
          fontWeight: "600",
          color: colors.text,
        },
        badgesRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
        badgePrimary: {
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: colors.primary,
        },
        badgePrimaryText: {
          color: colors.buttonText,
          fontSize: 11,
          fontWeight: "700",
        },
        badgeNeutral: {
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          marginRight: 6,
        },
        badgeNeutralText: {
          color: colors.text,
          fontSize: 11,
          fontWeight: "700",
        },
        helper: { marginTop: 6, color: colors.muted, fontSize: 12 },
        searchBox: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: colors.card,
          color: colors.text,
          marginTop: 16,
        },
        quickScroll: { paddingVertical: 2 },
        quickItemH: { marginRight: 8, minWidth: 120, maxWidth: 170 },
      }),
    [colors]
  );

  const load = useCallback(async () => {
    const list = await getQuizzes();
    const now = Date.now();

    const withMeta = [];
    for (const q of list) {
      const qs = await getQuestionsByQuiz(q.id);
      const total = qs.length;
      const due = qs.filter((x) => Number(x.due_at || 0) <= now).length;
      withMeta.push({ ...q, total, due });
    }
    setQuizzes(withMeta);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (id, title) => {
    Alert.alert("Excluir", `Deseja excluir o quiz "${title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => {}
            );
            await deleteQuiz(id);
            await load();
          } catch {
            /* noop */
          }
        },
      },
    ]);
  };

  const goTab = (routeName) => {
    const parent = navigation.getParent();
    if (parent) parent.navigate(routeName);
    else navigation.navigate(routeName);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quizzes;
    return quizzes.filter((it) => it.title.toLowerCase().includes(q));
  }, [quizzes, query]);

  return (
    // edges={[]} → não aplica safe area no topo aqui (o App já aplica)
    <SafeAreaView style={styles.sa} edges={[]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          // mantém os cards acima da Tab Bar
          paddingBottom: tabBarHeight + 8,
        }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <VStack space={14}>
          <View style={styles.panel}>
            <Text style={[styles.h2, { marginBottom: 4 }]}>Bem-vindo 👋</Text>
            <Text style={styles.muted}>
              Monte seus baralhos e comece a estudar
            </Text>

            <View style={{ height: 10 }} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={local.quickScroll}
            >
              <View style={local.quickItemH}>
                <PrimaryButton
                  title="Estudar Hoje"
                  icon="book-open-variant"
                  size="sm"
                  onPress={() => goTab("Estudar")}
                />
              </View>
              <View style={local.quickItemH}>
                <PrimaryButton
                  title="Estatísticas"
                  icon="chart-line-variant"
                  size="sm"
                  onPress={() => goTab("Estatísticas")}
                />
              </View>
              <View style={local.quickItemH}>
                <PrimaryButton
                  title="Backup"
                  variant="secondary"
                  icon="cloud-upload"
                  size="sm"
                  onPress={() => goTab("Backup")}
                />
              </View>
              <View style={local.quickItemH}>
                <PrimaryButton
                  title="Importar"
                  variant="secondary"
                  icon="tray-arrow-down"
                  size="sm"
                  onPress={() => navigation.navigate("Import")}
                />
              </View>
            </ScrollView>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar quiz pelo título..."
              placeholderTextColor={colors.muted}
              style={local.searchBox}
              accessibilityLabel="Buscar quizzes"
              returnKeyType="search"
            />

            <View style={{ height: 12 }} />

            <HStack
              space={8}
              style={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Text style={styles.h2}>Seus Quizzes</Text>
              <PrimaryButton
                title="Novo Quiz"
                icon="plus"
                size="md"
                onPress={() => navigation.navigate("QuizEditor")}
                accessibilityLabel="Criar novo quiz"
              />
            </HStack>
          </View>

          {filtered.length === 0 ? (
            <Text style={styles.muted}>
              Nenhum resultado. Crie um quiz ou importe perguntas.
            </Text>
          ) : (
            <VStack space={6} style={local.listWrap}>
              {filtered.map((item) => (
                <Pressable
                  key={item.id}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  onPress={() =>
                    navigation.navigate("QuestionList", {
                      quizId: item.id,
                      title: item.title,
                    })
                  }
                  onLongPress={() => handleDelete(item.id, item.title)} // segurar para excluir
                  android_ripple={{ color: colors.border }}
                  style={({ pressed }) => [
                    local.item,
                    pressed && local.itemPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir quiz ${item.title}`}
                >
                  <Text style={local.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={local.badgesRow}>
                    <View style={local.badgeNeutral}>
                      <Text style={local.badgeNeutralText}>
                        {item.total} cartões
                      </Text>
                    </View>
                    <View
                      style={local.badgePrimary}
                      accessibilityLabel={`${item.due} cartões vencidos`}
                    >
                      <Text style={local.badgePrimaryText}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={11}
                          color={colors.buttonText}
                        />{" "}
                        {item.due}
                      </Text>
                    </View>
                  </View>

                  <Text style={local.helper}>
                    Toque para abrir • Segure para excluir
                  </Text>
                </Pressable>
              ))}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
