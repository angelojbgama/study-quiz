import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

export default function TagChips({ tags = [], counts = {}, selected = new Set(), onToggle }) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    row: { paddingVertical: 4, alignItems: 'center' },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border
    },
    active: { backgroundColor: colors.primary, borderColor: colors.primary },
    text: { color: colors.text, fontSize: 14 },
    textActive: { color: colors.buttonText, fontWeight: '600' }
  }), [colors]);

  const Chip = ({ label, selected, onPress }) => (
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
