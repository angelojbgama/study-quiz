// src/ui/useAppStyles.js
import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";

export default function useAppStyles(extraBottom = 16) {
  const { colors } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        sa: { flex: 1, backgroundColor: colors.background },
        container: { flex: 1, padding: 16, paddingBottom: extraBottom },
        panel: {
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
        },
        h2: { fontSize: 18, fontWeight: "700", color: colors.text },
        text: { color: colors.text },
        muted: { color: colors.muted },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          padding: 12,
          backgroundColor: colors.card,
          color: colors.text,
        },
        progressOuter: {
          height: 8,
          backgroundColor: colors.border,
          borderRadius: 8,
          overflow: "hidden",
        },
        progressInner: { height: 8, backgroundColor: colors.primary },
      }),
    [colors, extraBottom]
  );
}
