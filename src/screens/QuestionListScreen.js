// src/screens/QuestionListScreen.js
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PrimaryButton from "../components/PrimaryButton";
import { getQuestionsByQuiz, deleteQuestion } from "../db";
import useAppStyles from "../ui/useAppStyles";
import { VStack } from "../ui/Stack";
import TagChips from "../components/TagChips";
import { distinctTagsFromQuestions, tagCounts, parseTags } from "../util/tags";

export default function QuestionListScreen({ route, navigation }) {
  const { quizId, title } = route.params || {};
  const [questions, setQuestions] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());

  const [menuFor, setMenuFor] = useState(null); // { id, text, ... } | null
  const menuAnchorRef = useRef(null);

  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useAppStyles();

  useEffect(() => {
    navigation.setOptions({ title: title || "Perguntas" });
  }, [title, navigation]);

  const load = useCallback(async () => {
    const list = await getQuestionsByQuiz(quizId);
    setQuestions(list);
  }, [quizId]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const tags = useMemo(() => distinctTagsFromQuestions(questions), [questions]);
  const counts = useMemo(() => tagCounts(questions), [questions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hasTag = selected.size > 0;
    return questions.filter((it) => {
      if (q) {
        const hay = `${it.text} ${it.answer} ${it.explanation || ""} ${
          it.tags || ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (hasTag) {
        const t = parseTags(it.tags).map((x) => x.toLowerCase());
        if (!t.some((x) => selected.has(x))) return false;
      }
      return true;
    });
  }, [questions, query, selected]);

  const local = useMemo(
    () =>
      StyleSheet.create({
        // grid 2-col dos botões
        grid: {
          flexDirection: "row",
          gap: 8,
          marginTop: 2,
          marginBottom: 12, // garante espaço antes da busca
        },
        col: { flex: 1 },

        searchBox: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.card,
          color: colors.text,
          marginTop: 12,
        },

        // Card da pergunta
        card: {
          padding: 12,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 88,
        },
        qTitle: {
          fontWeight: "700",
          fontSize: 16,
          color: colors.text,
          paddingRight: 80,
        },
        ans: { marginTop: 4, color: colors.text },
        exp: { marginTop: 6, color: colors.text, fontSize: 15, lineHeight: 21 },
        tagsRow: {
          marginTop: 6,
          flexDirection: "row",
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

        // badge vencida — à esquerda do menu
        badge: {
          position: "absolute",
          top: 8,
          right: 44,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: colors.primary,
        },
        badgeTxt: { color: colors.buttonText, fontSize: 12, fontWeight: "700" },

        // botão de menu (3 pontinhos) — canto superior direito
        menuBtn: {
          position: "absolute",
          top: 8,
          right: 8,
          padding: 6,
          borderRadius: 999,
          zIndex: 2,
        },

        separator: { height: 6 },
        listContent: { paddingBottom: 80 }, // respiro pro FAB

        // bottom-sheet reto
        sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
        sheet: {
          backgroundColor: colors.card,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          padding: 12,
          borderTopWidth: 1,
          borderColor: colors.border,
        },
        sheetItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 6,
        },
        sheetIcon: { marginRight: 10 },
        sheetText: { color: colors.text, fontSize: 16 },
        sheetDanger: { color: colors.danger || "#dc3545" },
        headerPad: { height: 2 },

        // FAB (+)
        fab: {
          position: "absolute",
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          elevation: 5,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          zIndex: 10,
        },
      }),
    [colors]
  );

  const openMenu = (item) => setMenuFor(item);
  const closeMenu = () => setMenuFor(null);

  const onEdit = (id) => {
    closeMenu();
    navigation.navigate("QuestionEditor", { quizId, questionId: id });
  };

  const onEditOptions = (id) => {
    closeMenu();
    navigation.navigate("OptionEditor", { questionId: id });
  };

  const onPracticeSingle = (id) => {
    closeMenu();
    navigation.navigate("Learn", {
      quizId,
      questionIds: [id],
      onlyDue: false,
      selectedTags: [],
      sessionLimit: 1,
    });
  };

  const onDelete = (id, text) => {
    closeMenu();
    Alert.alert(
      "Excluir pergunta",
      `Tem certeza que deseja excluir?\n\n"${text}"`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteQuestion(id);
            await load();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const now = Date.now();
    const due = Number(item.due_at || 0);
    const isDue = !Number.isNaN(due) && due <= now;

    return (
      <View style={local.card} ref={menuAnchorRef}>
        {/* botão menu — canto superior direito */}
        <Pressable
          hitSlop={8}
          style={({ pressed }) => [local.menuBtn, pressed && { opacity: 0.7 }]}
          onPress={() => openMenu(item)}
          onLongPress={() => openMenu(item)}
          accessibilityLabel="Mais opções"
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            size={18}
            color={colors.muted}
          />
        </Pressable>

        {/* badge vencida — deslocado para a esquerda do menu */}
        {isDue ? (
          <View style={local.badge} accessibilityLabel="Cartão vencido">
            <Text style={local.badgeTxt}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={12}
                color={colors.buttonText}
              />{" "}
              vencida
            </Text>
          </View>
        ) : null}

        <Text style={local.qTitle}>{item.text}</Text>
        <Text style={local.ans}>Resposta: {item.answer}</Text>
        {item.explanation ? (
          <Text style={local.exp}>Explicação: {item.explanation}</Text>
        ) : null}

        {item.tags ? (
          <View style={local.tagsRow}>
            {parseTags(item.tags).map((t) => (
              <View key={t} style={local.tagBubble}>
                <Text style={local.tagTxt}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <View style={styles.container}>
        <VStack space={12}>
          {/* Painel topo */}
          <View style={styles.panel}>
            <View style={local.headerPad} />

            {/* Grid 2 colunas: Cartões | Quiz */}
            <View style={local.grid}>
              <View style={local.col}>
                <PrimaryButton
                  title="Cartões"
                  onPress={() => navigation.navigate("Cards", { quizId })}
                  accessibilityLabel="Abrir cartões"
                  style={{ alignSelf: "stretch" }}
                />
              </View>
              <View style={local.col}>
                <PrimaryButton
                  title="Quiz"
                  onPress={() => navigation.navigate("Learn", { quizId })}
                  accessibilityLabel="Abrir quiz (modo de aprendizado)"
                  style={{ alignSelf: "stretch" }}
                />
              </View>
            </View>

            {/* Busca — vem depois do grid, com margem superior */}
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por texto, resposta ou tags..."
              placeholderTextColor={colors.muted}
              style={local.searchBox}
              accessibilityLabel="Buscar perguntas"
              returnKeyType="search"
            />

            {/* Filtro por tags */}
            <View style={{ marginTop: 10 }}>
              <TagChips
                tags={tags}
                counts={counts}
                selected={selected}
                onToggle={(t) => {
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
                }}
              />
            </View>
          </View>

          {/* Lista com scroll */}
          {filtered.length === 0 ? (
            <Text style={styles.muted}>Nenhum item encontrado.</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(it) => String(it.id)}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={local.separator} />}
              contentContainerStyle={local.listContent}
              showsVerticalScrollIndicator
            />
          )}
        </VStack>
      </View>

      {/* FAB (+) para adicionar pergunta */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Adicionar nova pergunta"
        hitSlop={8}
        android_ripple={{ color: colors.border }}
        onPress={() => navigation.navigate("QuestionEditor", { quizId })}
        style={[local.fab, { bottom: 16 + Math.max(insets.bottom, 0) }]}
      >
        <MaterialCommunityIcons
          name="plus"
          size={28}
          color={colors.buttonText || "#fff"}
        />
      </Pressable>

      {/* Bottom sheet: menu contextual */}
      <Modal
        transparent
        visible={!!menuFor}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={local.sheetBackdrop} />
        </TouchableWithoutFeedback>
        <View style={local.sheet}>
          <Pressable
            style={({ pressed }) => [
              local.sheetItem,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => onEdit(menuFor.id)}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color={colors.text}
              style={local.sheetIcon}
            />
            <Text style={local.sheetText}>Editar pergunta</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              local.sheetItem,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => onEditOptions(menuFor.id)}
          >
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={18}
              color={colors.text}
              style={local.sheetIcon}
            />
            <Text style={local.sheetText}>Editar alternativas</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              local.sheetItem,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => onPracticeSingle(menuFor.id)}
          >
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={18}
              color={colors.text}
              style={local.sheetIcon}
            />
            <Text style={local.sheetText}>Praticar só esta</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              local.sheetItem,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => onDelete(menuFor.id, menuFor.text)}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color={colors.danger || "#dc3545"}
              style={local.sheetIcon}
            />
            <Text style={[local.sheetText, local.sheetDanger]}>Excluir</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
