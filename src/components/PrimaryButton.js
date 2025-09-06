// src/components/PrimaryButton.js
import React from "react";
import { Pressable, Text, StyleSheet, View, ActivityIndicator } from "react-native";
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  variant = "primary", // 'primary' | 'secondary' | 'danger' | 'dangerOutline'
  icon, // ex: 'plus'
  loading = false,
  size = "md", // 'sm' | 'md' | 'lg'
  block = false,
}) {
  const { colors } = useTheme();
  const SIZES = { sm: { h: 40, font: 14 }, md: { h: 52, font: 16 }, lg: { h: 60, font: 18 } };
  const SZ = SIZES[size] || SIZES.md;

  let bg = colors.primary, brd = "transparent", txt = colors.buttonText;
  if (variant === "secondary") { bg = colors.card; brd = colors.border; txt = colors.text; }
  if (variant === "danger") { bg = colors.danger; txt = colors.buttonText; }
  if (variant === "dangerOutline") { bg = colors.card; brd = colors.danger; txt = colors.danger; }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: brd, minHeight: SZ.h },
        block && { alignSelf: "stretch", width: "100%" },
        pressed && !disabled && !loading && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={txt} />
      ) : (
        <View style={styles.row}>
          {icon ? <MaterialCommunityIcons name={icon} size={18} color={txt} style={{ marginRight: title ? 6 : 0 }} /> : null}
          {typeof title === "string" && title.length > 0 ? (
            <Text style={[styles.text, { color: txt, fontSize: SZ.font }, textStyle]} numberOfLines={2}>
              {title}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    minWidth: 48,
    maxWidth: "100%",
    paddingHorizontal: 16,
  },
  text: { fontWeight: "700" },
  pressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", maxWidth: "100%" },
});
