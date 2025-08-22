// src/components/TagChips.js
import React, { useMemo } from "react";
import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";

export default function TagChips({
  tags = [],
  counts = {},
  selected = new Set(),
  onToggle,
}) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { paddingVertical: 4, alignItems: "center" },
        chip: {
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: colors.card,
          marginRight: 8,
          borderWidth: 1,
          borderColor: colors.border,
        },
        active: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        text: { color: colors.text, fontSize: 14 },
        textActive: { color: colors.buttonText, fontWeight: "600" },
      }),
    [colors]
  );

  const Chip = ({ label, active, onPress }) => (
    <Pressable
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.active,
        pressed && { opacity: 0.9 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filtro ${label}`}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip
        label="Todos"
        active={selected.size === 0}
        onPress={() => onToggle && onToggle(null)}
      />
      {tags.map((t) => {
        const lbl = typeof counts[t] === "number" ? `${t} (${counts[t]})` : t;
        return (
          <Chip
            key={t}
            label={lbl}
            active={selected.has(t.toLowerCase())}
            onPress={() => onToggle && onToggle(t)}
          />
        );
      })}
    </ScrollView>
  );
}
