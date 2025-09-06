// src/ui/useAndroidNavHidden.js
import { useEffect, useCallback } from 'react';
import { Platform, AppState, Keyboard } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

/**
 * Mantém a barra de navegação do Android oculta.
 * Seguro para uso tanto DENTRO quanto FORA do NavigationContainer.
 *
 * @param {boolean} enabled - se true, oculta; se false, mostra.
 * @param {object} _opts - (compat) ignorado; antes usava { reapplyOnFocus }.
 */
export default function useAndroidNavHidden(enabled = true, _opts = {}) {
  const apply = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      await NavigationBar.setVisibilityAsync(enabled ? 'hidden' : 'visible');
      // Não usar setBehaviorAsync em edge-to-edge (gera WARN e é ignorado)
    } catch {}
  }, [enabled]);

  // Aplica em montagem e quando enabled muda
  useEffect(() => {
    apply();
  }, [apply]);

  // Reaplica ao voltar para foreground
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') apply();
    });
    return () => sub.remove();
  }, [apply]);

  // Reaplica quando o teclado fecha (alguns OEMs reexibem a barra)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const kh = Keyboard.addListener('keyboardDidHide', apply);
    return () => kh.remove();
  }, [apply]);
}
