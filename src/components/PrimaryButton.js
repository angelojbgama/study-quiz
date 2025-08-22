import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  variant = "primary", // 'primary' | 'secondary' | 'danger' | 'dangerOutline'
  icon, // ex: 'trash-can-outline'
  loading = false,
  accessibilityLabel,
  size = "md", // 'sm' | 'md' | 'lg'
  block = false, // 100% da largura do container
}) {
  const { colors } = useTheme();

  // Fallbacks
  const cPrimary = colors.primary || "#1976d2";
  const cDanger = colors.danger || "#dc3545";
  const cBorder = colors.border || "#dddddd";
  const cCard = colors.card || "#f2f2f2";
  const cText = colors.text || "#000";
  const cBtnTxt = colors.buttonText || "#fff";

  // Tamanhos
  const SIZES = {
    sm: { minH: 40, pv: 8, ph: 12, font: 14 },
    md: { minH: 52, pv: 12, ph: 16, font: 16 },
    lg: { minH: 60, pv: 14, ph: 18, font: 17.5 },
  };
  const SZ = SIZES[size] || SIZES.md;

  // Variantes
  let bg = cPrimary,
    brd = "transparent",
    txt = cBtnTxt;
  if (variant === "secondary") {
    bg = cCard;
    brd = cBorder;
    txt = cText;
  }
  if (variant === "danger") {
    bg = cDanger;
    txt = cBtnTxt;
  }
  if (variant === "dangerOutline") {
    bg = cCard;
    brd = cDanger;
    txt = cDanger;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: brd,
          minHeight: SZ.minH,
          paddingVertical: SZ.pv,
          paddingHorizontal: SZ.ph,
        },
        block && { alignSelf: "stretch", width: "100%" },
        pressed && !disabled && !loading && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel || (typeof title === "string" ? title : undefined)
      }
    >
      {loading ? (
        <ActivityIndicator size="small" color={txt} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={txt}
              style={{ marginRight: title ? 6 : 0 }}
            />
          ) : null}
          {typeof title === "string" && title.length > 0 ? (
            <Text
              allowFontScaling
              numberOfLines={2}
              style={[
                styles.text,
                {
                  color: txt,
                  fontSize: SZ.font,
                  textAlign: "center",
                  flexShrink: 1,
                  maxWidth: "100%",
                },
                textStyle,
              ]}
            >
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
  },
  text: { fontWeight: "600" },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", maxWidth: "100%" },
});
