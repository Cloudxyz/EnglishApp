import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Theme from '../theme/theme';

interface WaveformProps {
  active?: boolean;
  color?: string;
  barCount?: number;
  height?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
  active = false,
  color = Theme.colors.primary,
  barCount = 20,
  height = 36,
}) => {
  const anims = useRef(
    Array.from({ length: barCount }, (_, i) => new Animated.Value(0.2 + (i % 3) * 0.2))
  ).current;

  useEffect(() => {
    if (active) {
      const animations = anims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 50),
            Animated.timing(anim, {
              toValue: 0.2 + Math.random() * 0.8,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.15,
              duration: 200,
              useNativeDriver: false,
            }),
          ])
        )
      );
      Animated.parallel(animations).start();
    } else {
      anims.forEach((a) => {
        Animated.timing(a, { toValue: 0.2, duration: 300, useNativeDriver: false }).start();
      });
    }
  }, [active]);

  return (
    <View style={[styles.container, { height }]}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [3, height],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    opacity: 0.85,
  },
});

export default Waveform;
