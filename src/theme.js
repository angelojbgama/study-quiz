import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { DefaultTheme as NavDefaultTheme } from '@react-navigation/native';

const brand = {
  primary: '#2e7d32',     // verde
  secondary: '#1565c0',   // azul
  surface: '#ffffff',
  background: '#f7f7f7',
};

export const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: brand.primary,
    secondary: brand.secondary,
    surface: brand.surface,
    background: brand.background,
  },
  roundness: 10
};

export const navTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    primary: brand.primary,
    background: brand.background,
    card: brand.surface,
    text: '#111',
    border: '#ddd',
    notification: brand.secondary
  }
};
