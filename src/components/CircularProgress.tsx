import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Theme from '../theme/theme';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0–1
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 90,
  strokeWidth = 8,
  progress,
  color = Theme.colors.primary,
  trackColor = Theme.colors.border,
  label,
  sublabel,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDash = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDash}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  label: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  sublabel: {
    ...Theme.typography.micro,
    color: Theme.colors.muted,
  },
});

export default CircularProgress;
