// src/components/SuccessCelebration.js
import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

export default function SuccessCelebration({ onDone, size = 88 }) {
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.8)).current;
  const { colors } = useTheme();

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(sc, { toValue: 1.12, duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.timing(sc, { toValue: 1.0, duration: 100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, [op, sc, onDone]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ opacity: op, transform: [{ scale: sc }] }}>
        <MaterialCommunityIcons name="check-circle" size={size} color={colors.success} />
      </Animated.View>
    </View>
  );
}
