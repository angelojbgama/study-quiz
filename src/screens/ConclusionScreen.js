// src/screens/ConclusionScreen.js
import React, { useMemo, useEffect } from "react";
import { View, Text, FlatList, Pressable, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, CommonActions } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import useAppStyles from "../ui/useAppStyles";
import useAndroidNavHidden from "../ui/useAndroidNavHidden";
import PrimaryButton from "../components/PrimaryButton";

export default function ConclusionScreen({ route, navigation }) {
  const p = route?.params || {};
  const { colors } = useTheme();
  const styles = useAppStyles();

  // Esconde a barra nativa (home/voltar/recentes) no Android
  useAndroidNavHidden(true);

  const { total, correct, wrong, accuracy, hardest, wrongIds } = useMemo(() => {
    const total = Number.isFinite(p.total) ? p.total : (p.correct||0)+(p.wrong||0);
    const correct = Number(p.correct||0);
    const wrong = Number.isFinite(p.wrong) ? p.wrong : Math.max(0, total - correct);
    const accuracy = total ? Math.round((correct/total)*100) : 0;
    const hardest = Array.isArray(p.hardest) ? p.hardest.slice(0,10) : [];
    const wrongIds = hardest.length ? hardest.map((h)=>h.id).filter(Boolean) : [];
    return { total, correct, wrong, accuracy, hardest, wrongIds };
  }, [p]);

  useEffect(()=> {
    navigation.setOptions({ headerBackVisible:false, gestureEnabled:false });
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [navigation]);

  const goHomeReset = () => {
    navigation.dispatch(CommonActions.reset({ index:0, routes:[{ name:"Tabs" }] }));
    navigation.navigate("Início");
  };

  const handleReviewErrors = () => {
    if (!wrongIds || !wrongIds.length) { goHomeReset(); return; }
    navigation.navigate("Learn", { questionIds: Array.from(new Set(wrongIds)), onlyDue: false, selectedTags: [], sessionLimit: wrongIds.length });
  };

  const renderHardItem = ({ item, index }) => (
    <Pressable
      onPress={() => navigation.navigate('Learn', { questionIds: [item.id], onlyDue: false, sessionLimit: 1 })}
      style={({ pressed }) => [{ paddingVertical: 10, borderTopWidth: index===0?0:1, borderColor: colors.border }, pressed && { opacity: 0.9 }]}
      android_ripple={{ color: colors.border }}
    >
      <Text style={{ color: colors.text, fontWeight: "700" }}>{item.text || "Pergunta"}</Text>
      {item.answer ? <Text style={{ color: colors.text, marginTop: 4 }}>Resposta: {item.answer}</Text> : null}
      {item.tags ? <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>Tags: {item.tags}</Text> : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.sa} edges={["bottom"]}>
      <StatusBar hidden />
      <FlatList
        data={Array.isArray(hardest)?hardest:[]}
        keyExtractor={(it, idx)=> String(it?.id ?? idx)}
        ListHeaderComponent={() => (
          <View style={{ paddingHorizontal:16, paddingTop:16 }}>
            <View style={styles.card}>
              <Text style={styles.h2}>Sessão concluída</Text>
              <Text style={styles.muted}>Resumo</Text>
              <View style={{ flexDirection:"row", gap:8, flexWrap:"wrap", marginTop: 12 }}>
                <Stat label="Acertos" value={`${correct}/${total}`} colors={colors} />
                <Stat label="Acurácia" value={`${accuracy}%`} colors={colors} />
                <Stat label="Erros" value={`${wrong}`} colors={colors} />
              </View>
            </View>
            <View style={{ height: 12 }} />
            <View style={styles.card}><Text style={styles.h2}>Mais desafiadoras</Text></View>
          </View>
        )}
        ListFooterComponent={() => (
          <View style={{ paddingHorizontal:16, paddingBottom:16 }}>
            <View style={styles.card}>
              {wrongIds && wrongIds.length>0 ? (
                <View style={{ flexDirection:"row", gap:8 }}>
                  <View style={{ flex:1 }}><Action title="Revisar erros" onPress={handleReviewErrors} /></View>
                  <View style={{ flex:1 }}><Action title="Concluir" variant="secondary" onPress={goHomeReset} /></View>
                </View>
              ) : <Action title="Concluir" onPress={goHomeReset} />}
            </View>
          </View>
        )}
        renderItem={renderHardItem}
        ItemSeparatorComponent={()=><View style={{ height:6 }} />}
        contentContainerStyle={{ paddingHorizontal:16, paddingBottom:16 }}
        showsVerticalScrollIndicator
      />
    </SafeAreaView>
  );
}

function Action(props){ return <PrimaryButton block {...props} />; }
function Stat({ label, value, colors }) {
  return (
    <View style={{ flexGrow: 1, minWidth: 120, padding: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>{value}</Text>
      <Text style={{ marginTop: 4, color: colors.muted }}>{label}</Text>
    </View>
  );
}
