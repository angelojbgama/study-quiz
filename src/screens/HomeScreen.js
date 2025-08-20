import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Pressable } from 'react-native';
import { getQuizzes, countQuestions } from '../db';

export default function HomeScreen({ navigation }) {
  const [quizzes, setQuizzes] = useState([]);

  const load = async () => {
    const list = await getQuizzes();
    const withCounts = await Promise.all(list.map(async (q) => ({
      ...q, total: await countQuestions(q.id)
    })));
    setQuizzes(withCounts);
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const goTab = (routeName) => {
    const parent = navigation.getParent();
    if (parent) parent.navigate(routeName); else navigation.navigate(routeName);
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Bem-vindo 👋</Text>
        <Text style={styles.subtitle}>Monte seus baralhos e comece a estudar</Text>
        <View style={styles.row}>
          <View style={styles.btn}><Button title="Estudar Hoje" onPress={() => goTab('Estudar')} /></View>
          <View style={styles.btn}><Button title="Estatísticas" onPress={() => goTab('Estatísticas')} /></View>
          <View style={styles.btn}><Button title="Backup" onPress={() => goTab('Backup')} /></View>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.headerRow}>
          <Text style={styles.titleSmall}>Seus Quizzes</Text>
          <Button title="Importar" onPress={() => navigation.navigate('Import')} />
        </View>
        {quizzes.length === 0 ? (
          <Text style={{ color: '#666' }}>Crie um quiz ou importe perguntas.</Text>
        ) : quizzes.map(item => (
          <Pressable key={item.id} style={styles.item} onPress={() => navigation.navigate('QuestionList', { quizId: item.id, title: item.title })}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDesc}>{item.total} cartões</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.fab}><Button title="Novo Quiz" onPress={() => navigation.navigate('QuizEditor')} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f7f7' },
  panel: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  btn: { minWidth: 140, marginRight: 8, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  titleSmall: { fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#555', marginTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTitle: { fontSize: 16, fontWeight: '600', flexWrap: 'wrap' },
  itemDesc: { color: '#666', marginTop: 2 },
  fab: { position: 'absolute', right: 16, bottom: 16, minWidth: 140 }
});
