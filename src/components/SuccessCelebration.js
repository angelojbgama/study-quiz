// src/components/SuccessCelebration.js
import React, { useEffect, useRef, useMemo } from "react";
import { View, Animated, Easing, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Confete + check animado.
 * Props:
 * - onDone?: () => void
 * - duration?: number (ms)   -> duração do voo do confete
 * - size?: number            -> tamanho do check
 * - intensity?: number       -> quantidade de partículas (default 24)
 * - origin?: { x: number, y: number } -> ponto de origem; default = centro superior do conteúdo
 * - palette?: string[]       -> cores das partículas
 */
export default function SuccessCelebration({
  onDone,
  duration = 900,
  size = 90,
  intensity = 24,
  origin,
  palette = ["#FFD166", "#06D6A0", "#EF476F", "#118AB2", "#8338EC"],
}) {
  const { width, height } = Dimensions.get("window");

  // origem padrão (um pouco acima do meio)
  const ORIGIN = useMemo(
    () => origin || { x: width / 2, y: height * 0.35 },
    [origin, width, height]
  );

  // Partículas
  const particles = useRef(
    Array.from({
      length: Math.max(6, Math.min(100, Math.floor(intensity))),
    }).map(() => ({
      progress: new Animated.Value(0),
      dx: (Math.random() * 2 - 1) * (width * 0.42),
      dy: (Math.random() * 2 - 1) * (height * 0.28),
      rot: (Math.random() * 2 - 1) * 360,
      scale: 0.6 + Math.random() * 0.8,
      color: palette[Math.floor(Math.random() * palette.length)],
    }))
  ).current;

  // Check central (pulse)
  const checkScale = useRef(new Animated.Value(0.82)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  // guarda refs de animações para tentar parar no unmount
  const animsRef = useRef([]);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    const anims = particles.map((p) =>
      Animated.timing(p.progress, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    const check = Animated.parallel([
      Animated.timing(checkOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(checkScale, {
          toValue: 1.15,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(checkScale, {
          toValue: 1.0,
          duration: 90,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animsRef.current = anims;

    Animated.parallel([...anims, check]).start(() => {
      // fade-out do check
      Animated.timing(checkOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        if (!doneRef.current && typeof onDone === "function") onDone();
      });
    });

    return () => {
      doneRef.current = true;
      // melhor esforço: para as animações “base”
      animsRef.current.forEach((a) => {
        try {
          a.stop();
        } catch {}
      });
    };
  }, [duration, onDone, particles, checkOpacity, checkScale]);

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
    >
      {/* Check central */}
      <Animated.View
        style={{
          position: "absolute",
          left: ORIGIN.x - size / 2,
          top: ORIGIN.y - size / 2,
          opacity: checkOpacity,
          transform: [{ scale: checkScale }],
        }}
      >
        <MaterialCommunityIcons
          name="check-circle"
          size={size}
          color="#28a745"
        />
      </Animated.View>

      {/* Confete */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: ORIGIN.x,
            top: ORIGIN.y,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: p.color,
            transform: [
              {
                translateX: p.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.dx],
                }),
              },
              {
                translateY: p.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.dy],
                }),
              },
              {
                rotate: p.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", `${p.rot}deg`],
                }),
              },
              {
                scale: p.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [p.scale, 0.3],
                }),
              },
            ],
            opacity: p.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          }}
        />
      ))}
    </View>
  );
}
