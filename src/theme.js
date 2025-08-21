import { DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';

const base = {
  primary: '#1976d2', // blue
  danger: '#dc3545',
  buttonText: '#ffffff',
};

export const lightColors = {
  ...base,
  background: '#ffffff',
  card: '#f2f2f2',
  text: '#000000',
  border: '#dddddd',
  notification: base.primary,
  muted: '#666666',
};

export const darkColors = {
  ...base,
  background: '#000000',
  card: '#1e1e1e',
  text: '#ffffff',
  border: '#333333',
  notification: base.primary,
  muted: '#aaaaaa',
};

export const navLightTheme = {
  ...NavDefaultTheme,
  colors: { ...NavDefaultTheme.colors, ...lightColors },
};

export const navDarkTheme = {
  ...NavDarkTheme,
  colors: { ...NavDarkTheme.colors, ...darkColors },
};
