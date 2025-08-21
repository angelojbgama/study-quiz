import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { navTheme } from '../theme';

export default function PrimaryButton({ title, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        style,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: navTheme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  text: { color: '#fff', fontWeight: '600' },
  pressed: { opacity: 0.85 },
  disabled: { backgroundColor: '#aaa' }
});
