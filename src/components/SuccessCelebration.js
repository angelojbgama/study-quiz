// src/components/SuccessCelebration.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SuccessCelebration({ onDone, duration = 900, size = 90 }) {
  const { width, height } = Dimensions.get('window');
  // Partículas de confete
  const particles = useRef(
    [...Array(24)].map(() => ({
      progress: new Animated.Value(0),
      dx: (Math.random() * 2 - 1) * (width * 0.4),
      dy: (Math.random() * 2 - 1) * (height * 0.25),
      rot: (Math.random() * 2 - 1) * 360,
      scale: 0.6 + Math.random() * 0.8,
      color: ['#FFD166', '#06D6A0', '#EF476F', '#118AB2', '#8338EC'][Math.floor(Math.random() * 5)],
    }))
  ).current;

  // Check central (pulse)
  const checkScale = useRef(new Animated.Value(0.8)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anims = particles.map((p) =>
      Animated.timing(p.progress, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    const check = Animated.parallel([
      Animated.timing(checkOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(checkScale, {
          toValue: 1.15,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(checkScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    Animated.parallel([...anims, check]).start(() => {
      Animated.timing(checkOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        onDone && onDone();
      });
    });
  }, []);

  const originX = width / 2;
  const originY = height * 0.35;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {/* Check central */}
      <Animated.View
        style={{
          position: 'absolute',
          left: originX - size / 2,
          top: originY - size / 2,
          opacity: checkOpacity,
          transform: [{ scale: checkScale }],
        }}
      >
        <MaterialCommunityIcons name="check-circle" size={size} color="#28a745" />
      </Animated.View>

      {/* Confete */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: originX,
            top: originY,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: p.color,
            transform: [
              { translateX: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
              { rotate: p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
              { scale: p.progress.interpolate({ inputRange: [0, 1], outputRange: [p.scale, 0.3] }) },
            ],
            opacity: p.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          }}
        />
      ))}
    </View>
  );
}
