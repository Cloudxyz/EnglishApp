import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Theme from '../theme/theme';

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  noPad?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  elevated = false,
  noPad = false,
}) => {
  return (
    <View
      style={[
        styles.card,
        elevated ? Theme.shadows.modal : Theme.shadows.card,
        noPad ? styles.noPad : null,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.base,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  noPad: { padding: 0 },
});

export default AppCard;
