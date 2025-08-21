import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Button, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getQuizzes, countQuestions, deleteQuiz } from '../db';

export default function HomeScreen({ navigation }) {
  const [quizzes, setQuizzes] = useState([]);
  const insets = useSafeAreaInsets();

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

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <Pressable
        key={item.id}
        onPress={() => navigation.navigate('QuestionList', { quizId: item.id, title: item.title })}
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
        android_ripple={{ color: '#e9e9e9' }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Abrir quiz ${item.title}`}
      >
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDesc}>{item.total} cartões</Text>
      </Pressable>
      <View style={styles.delBtn}>
        <Button title="Excluir" color="#b00020" onPress={() => handleDelete(item.id)} />
      </View>
    </View>
  );

  const listHeader = useMemo(() => (
    <View style={styles.panel}>
      <Text style={styles.title}>Bem-vindo 👋</Text>
      <Text style={styles.subtitle}>Monte seus baralhos e comece a estudar</Text>
      <View style={styles.row}>
        <View style={styles.btn}><Button title="Estudar Hoje" onPress={() => goTab('Estudar')} /></View>
        <View style={styles.btn}><Button title="Estatísticas" onPress={() => goTab('Estatísticas')} /></View>
        <View style={styles.btn}><Button title="Backup" onPress={() => goTab('Backup')} /></View>
      </View>
      <View style={styles.headerRow}>
        <Text style={styles.titleSmall}>Seus Quizzes</Text>
        <Button title="Importar" onPress={() => navigation.navigate('Import')} />
      </View>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.sa} edges={['bottom']}>
      <FlatList
        data={quizzes}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<Text style={styles.empty}>Crie um quiz ou importe perguntas.</Text>}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator
      />

      {/* FAB nativo (Button) posicionado acima da barra do sistema */}
      <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
        <Button title="Novo Quiz" onPress={() => navigation.navigate('QuizEditor')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: '#f7f7f7' },
  panel: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  btn: { minWidth: 140, marginRight: 8, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  titleSmall: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  subtitle: { color: '#555', marginTop: 4 },
  headerRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  delBtn: { marginLeft: 8 },
  itemTitle: { fontSize: 16, fontWeight: '600', flexWrap: 'wrap' },
  itemDesc: { color: '#666', marginTop: 2 },
  empty: { color: '#666', paddingHorizontal: 16 },
  fab: { position: 'absolute', right: 16, minWidth: 140 }
});
