// src/ui/Stack.js
import React from "react";
import { View } from "react-native";

/**
 * VStack: empilha verticalmente e aplica espaçamento entre filhos.
 * Resolve o “primeiro item colado” sem precisar pôr marginTop manual.
 */
export function VStack({ children, space = 12, style }) {
  const items = React.Children.toArray(children);
  return (
    <View style={style}>
      {items.map((child, i) => (
        <View key={i} style={{ marginTop: i === 0 ? 0 : space }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * HStack: empilha horizontalmente com espaçamento entre itens.
 */
export function HStack({ children, space = 8, style }) {
  const items = React.Children.toArray(children);
  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      {items.map((child, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : space }}>
          {child}
        </View>
      ))}
    </View>
  );
}
