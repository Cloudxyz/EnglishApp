import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, Text } from 'react-native';
import Theme from '../theme/theme';

interface ProgressBarProps {
  progress: number; // 0–1
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
  showLabel?: boolean;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = Theme.colors.primary,
  trackColor = Theme.colors.border,
  height = 10,
  style,
  showLabel = false,
  animated = true,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(anim, {
        toValue: Math.min(1, Math.max(0, progress)),
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      anim.setValue(Math.min(1, Math.max(0, progress)));
    }
  }, [progress]);

  const widthInterp = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[style]}>
      <View
        style={[
          styles.track,
          { backgroundColor: trackColor, height, borderRadius: height / 2 },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              borderRadius: height / 2,
              width: widthInterp,
              height,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(progress * 100)}%</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Theme.colors.border,
  },
  fill: {},
  label: {
    ...Theme.typography.captionBold,
    color: Theme.colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default ProgressBar;
