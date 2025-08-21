import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';

export default function TagChips({ tags = [], counts = {}, selected = new Set(), onToggle }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label="Todos" selected={selected.size === 0} onPress={() => onToggle && onToggle(null)} />
      {tags.map(t => (
        <Chip
          key={t}
          label={`${t}${typeof counts[t] === 'number' ? ` (${counts[t]})` : ''}`}
          selected={selected.has(t.toLowerCase())}
          onPress={() => onToggle && onToggle(t)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.active, pressed && { opacity: 0.8 }]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Filtro ${label}`}
    >
      <Text style={[styles.text, selected && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 4, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#eee', marginRight: 8, borderWidth: 1, borderColor: '#ddd' },
  active: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  text: { color: '#111', fontSize: 14 },
  textActive: { color: '#fff', fontWeight: '600' }
});
