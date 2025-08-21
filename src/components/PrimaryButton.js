import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

export default function PrimaryButton({ title, onPress, disabled, style, textStyle }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary },
        style,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Text style={[styles.text, { color: colors.buttonText }, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  text: { fontWeight: '600' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 }
});
