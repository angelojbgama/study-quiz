import { DefaultTheme as NavDefaultTheme } from '@react-navigation/native';

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

export const navLightTheme = {
  ...NavDefaultTheme,
  colors: { ...NavDefaultTheme.colors, ...lightColors },
};
