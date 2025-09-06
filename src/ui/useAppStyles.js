// src/ui/useAppStyles.js
import { StyleSheet, Platform } from "react-native";
import { useTheme } from "@react-navigation/native";

export default function useAppStyles() {
  const { colors } = useTheme();

  const R = 12; // radius padrão
  const S = 12; // spacing padrão
  const I = 14; // altura da fonte base

  return StyleSheet.create({
    // containers base
    sa: { flex: 1, backgroundColor: colors.background },
    container: {
      padding: 16,
      paddingBottom: 16,
      gap: 12,
    },

    // blocos principais
    panel: {
      padding: 12,
      borderRadius: R,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    card: {
      padding: 12,
      borderRadius: R,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // tipografia
    h1: { fontSize: 20, fontWeight: "800", color: colors.text },
    h2: { fontSize: 17, fontWeight: "700", color: colors.text },
    text: { fontSize: I, color: colors.text },
    muted: { fontSize: I - 1, color: colors.muted },

    // inputs
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: R,
      paddingHorizontal: 12,
      paddingVertical: Platform.select({ ios: 12, android: 10, default: 10 }),
      backgroundColor: colors.card,
      color: colors.text,
    },

    // linhas utilitárias
    row: { flexDirection: "row", alignItems: "center" },
    gap8: { gap: 8 },
    gap12: { gap: 12 },
    divider8: { height: 8 },
    divider12: { height: 12 },
  });
}
