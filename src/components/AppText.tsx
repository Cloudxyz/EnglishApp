import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import Theme from '../theme/theme';

type Variant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'captionBold'
  | 'micro';

interface AppTextProps {
  variant?: Variant;
  color?: string;
  children: React.ReactNode;
  style?: TextStyle;
  center?: boolean;
  numberOfLines?: number;
}

const variantMap: Record<Variant, TextStyle> = {
  h1: Theme.typography.H1,
  h2: Theme.typography.H2,
  h3: Theme.typography.H3,
  h4: Theme.typography.H4,
  body: Theme.typography.body,
  bodyBold: Theme.typography.bodyBold,
  caption: Theme.typography.caption,
  captionBold: Theme.typography.captionBold,
  micro: Theme.typography.micro,
};

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color,
  children,
  style,
  center = false,
  numberOfLines,
}) => {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        variantMap[variant],
        { color: color ?? Theme.colors.text },
        center ? styles.center : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});

export default AppText;
