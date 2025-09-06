// src/ui/Stack.js
import React from 'react';
import { View } from 'react-native';

export const VStack = ({ children, space = 8, style }) => (
  <View style={[{ flexDirection: 'column' }, style]}>
    {React.Children.toArray(children).map((c, i, a) => (
      <View key={i} style={{ marginBottom: i === a.length - 1 ? 0 : space }}>{c}</View>
    ))}
  </View>
);

export const HStack = ({ children, space = 8, style }) => (
  <View style={[{ flexDirection: 'row' }, style]}>
    {React.Children.toArray(children).map((c, i, a) => (
      <View key={i} style={{ marginRight: i === a.length - 1 ? 0 : space }}>{c}</View>
    ))}
  </View>
);
