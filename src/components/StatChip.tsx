import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Theme from '../theme/theme';

type ChipType = 'xp' | 'streak' | 'coins' | 'level' | 'custom';

interface StatChipProps {
  type: ChipType;
  value: string | number;
  label?: string;
  style?: ViewStyle;
  customIcon?: string;
  customColor?: string;
  customBg?: string;
}

const CHIP_CONFIG: Record<ChipType, { icon: string; color: string; bg: string }> = {
  xp: { icon: '⚡', color: Theme.colors.primary, bg: Theme.colors.primarySurface },
  streak: { icon: '🔥', color: Theme.colors.secondary, bg: Theme.colors.secondaryLight },
  coins: { icon: '🪙', color: '#B8860B', bg: '#FFF9E0' },
  level: { icon: '🏆', color: Theme.colors.primaryDark, bg: Theme.colors.primarySurface },
  custom: { icon: '★', color: Theme.colors.muted, bg: Theme.colors.background },
};

export const StatChip: React.FC<StatChipProps> = ({
  type,
  value,
  label,
  style,
  customIcon,
  customColor,
  customBg,
}) => {
  const cfg = CHIP_CONFIG[type];
  const icon = customIcon ?? cfg.icon;
  const color = customColor ?? cfg.color;
  const bg = customBg ?? cfg.bg;

  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {label ? <Text style={styles.label}> {label}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm - 2,
    borderRadius: Theme.radius.full,
    gap: 4,
  },
  icon: { fontSize: 14 },
  value: {
    ...Theme.typography.bodyBold,
    fontSize: 13,
  },
  label: {
    ...Theme.typography.caption,
    color: Theme.colors.muted,
  },
});

export default StatChip;
