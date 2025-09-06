// src/components/FailFeedback.js
import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

export default function FailFeedback({ onDone }) {
  const op = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, [op, onDone]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ opacity: op }}>
        <MaterialCommunityIcons name="close-circle" size={72} color={colors.danger} />
      </Animated.View>
    </View>
  );
}
