import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Theme from '../theme/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { colors, radius, shadows } = Theme;

  const containerStyle: ViewStyle = {
    ...styles.base,
    ...(fullWidth ? { alignSelf: 'stretch' } : {}),
    ...(size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : styles.md),
    ...(variant === 'primary'
      ? { ...styles.primary, ...shadows.button }
      : variant === 'secondary'
      ? styles.secondary
      : variant === 'ghost'
      ? styles.ghost
      : variant === 'danger'
      ? styles.danger
      : styles.successBtn),
    ...(disabled || loading ? styles.disabled : {}),
    ...style,
  };

  const labelStyle: TextStyle = {
    ...styles.label,
    ...(size === 'sm' ? styles.labelSm : size === 'lg' ? styles.labelLg : {}),
    ...(variant === 'ghost'
      ? { color: colors.primary }
      : variant === 'danger'
      ? { color: colors.white }
      : variant === 'secondary'
      ? { color: colors.primary }
      : { color: colors.white }),
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' || variant === 'secondary' ? colors.primary : colors.white} />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: 'center',
  },
  sm: { height: 36, paddingHorizontal: 16 },
  md: { height: 52, paddingHorizontal: 28 },
  lg: { height: 60, paddingHorizontal: 36 },
  primary: { backgroundColor: Theme.colors.primary },
  secondary: {
    backgroundColor: Theme.colors.white,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },
  ghost: { backgroundColor: Theme.colors.transparent },
  danger: { backgroundColor: Theme.colors.danger },
  successBtn: { backgroundColor: Theme.colors.success },
  disabled: { opacity: 0.45 },
  label: { ...Theme.typography.button, letterSpacing: 0.3 },
  labelSm: { fontSize: 13 },
  labelLg: { fontSize: 18 },
});

export default AppButton;
