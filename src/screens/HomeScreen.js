import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import { getQuizzes, countQuestions, deleteQuiz } from '../db';
import useAppStyles from '../ui/useAppStyles';

export default function HomeScreen({ navigation }) {
  const [quizzes, setQuizzes] = useState([]);
  const { colors } = useTheme();
  const styles = useAppStyles(90); // espaço extra p/ FAB

  const load = async () => {
    const list = await getQuizzes();
    const withCounts = await Promise.all(list.map(async (q) => ({
      ...q, total: await countQuestions(q.id)
    })));
    setQuizzes(withCounts);
  };

  const handleDelete = (id) => {
    Alert.alert('Excluir', 'Deseja excluir este quiz?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await deleteQuiz(id); load(); } }
    ]);
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const goTab = (routeName) => {
    const parent = navigation.getParent();
    if (parent) parent.navigate(routeName); else navigation.navigate(routeName);
  };

  const local = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    btn: { minWidth: 140, marginRight: 8, marginTop: 8 },
    headerRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemRow: { flexDirection: 'row', alignItems: 'center' },
    item: { flex: 1, padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    delBtn: { marginLeft: 8, minWidth: 90 },
    itemTitle: { fontSize: 16, fontWeight: '600', flexWrap: 'wrap', color: colors.text },
    itemDesc: { color: colors.muted, marginTop: 2 },
    empty: { color: colors.muted, paddingHorizontal: 16 },
    fab: { position: 'absolute', right: 16 }
  }), [colors]);

  const renderItem = ({ item }) => (
    <View style={local.itemRow}>
      <Pressable
        key={item.id}
        onPress={() => navigation.navigate('QuestionList', { quizId: item.id, title: item.title })}
        style={({ pressed }) => [local.item, pressed && { opacity: 0.85 }]}
        android_ripple={{ color: colors.border }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Abrir quiz ${item.title}`}
      >
        <Text style={local.itemTitle}>{item.title}</Text>
        <Text style={local.itemDesc}>{item.total} cartões</Text>
      </Pressable>
      <View style={local.delBtn}>
        <PrimaryButton title="Excluir" onPress={() => handleDelete(item.id)} style={{ backgroundColor: colors.danger }} />
      </View>
    </View>
  );

  const listHeader = useMemo(() => (
    <View style={styles.panel}>
      <Text style={styles.title}>Bem-vindo 👋</Text>
      <Text style={styles.subtitle}>Monte seus baralhos e comece a estudar</Text>
      <View style={local.row}>
        <View style={local.btn}><PrimaryButton title="Estudar Hoje" onPress={() => goTab('Estudar')} /></View>
        <View style={local.btn}><PrimaryButton title="Estatísticas" onPress={() => goTab('Estatísticas')} /></View>
        <View style={local.btn}><PrimaryButton title="Backup" onPress={() => goTab('Backup')} /></View>
      </View>
      <View style={local.headerRow}>
        <Text style={styles.h2}>Seus Quizzes</Text>
        <PrimaryButton title="Importar" onPress={() => navigation.navigate('Import')} />
      </View>
    </View>
  ), [styles, local, navigation]);

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <FlatList
        data={quizzes}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<Text style={local.empty}>Crie um quiz ou importe perguntas.</Text>}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 + 90 }}
        ItemSeparatorComponent={() => <View style={styles.listSep} />}
        showsVerticalScrollIndicator
      />
      <View style={[local.fab, { bottom: 16 }]}>
        <PrimaryButton title="Novo Quiz" onPress={() => navigation.navigate('QuizEditor')} />
      </View>
    </SafeAreaView>
  );
}
