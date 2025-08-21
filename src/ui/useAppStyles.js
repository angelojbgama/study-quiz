// src/ui/useAppStyles.js
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hook de estilos unificado para todas as telas.
 * Mantém consistência de cores, bordas, espaçamentos e tipografia.
 */
export default function useAppStyles(paddingBottomExtra = 16) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pb = insets.bottom + paddingBottomExtra;

  return useMemo(() => {
    const cardBg = colors.card ?? '#fff';
    return StyleSheet.create({
      // Layout base
      sa: { flex: 1, backgroundColor: colors.background },
      container: { flex: 1, padding: 16, paddingBottom: pb },

      // Blocos
      panel: { backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
      card:  { backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },

      // Tipos de texto
      title:   { fontSize: 20, fontWeight: '700', color: colors.text },
      h2:      { fontSize: 18, fontWeight: '700', color: colors.text },
      text:    { color: colors.text },
      muted:   { color: colors.muted },
      subtitle:{ color: colors.muted, marginTop: 4 },

      // Inputs / afins
      input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: cardBg, color: colors.text },

      // Progresso
      progressOuter: { height: 8, backgroundColor: colors.border, borderRadius: 8, overflow: 'hidden' },
      progressInner: { height: 8, backgroundColor: colors.primary },

      // Utilitários
      listSep: { height: 8 }
    });
  }, [colors, pb]);
}
