import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Theme from '../theme/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  dark?: boolean; // white text on primary bg
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  dark = false,
}) => {
  const insets = useSafeAreaInsets();
  const textColor = dark ? Theme.colors.white : Theme.colors.text;
  const bg = dark ? Theme.colors.primary : Theme.colors.surface;

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top + 8 }]}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        backgroundColor={bg}
      />
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={[styles.backIcon, { color: textColor }]}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <View style={styles.titleWrap}>
          <Text style={[Theme.typography.H3, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[Theme.typography.caption, { color: dark ? 'rgba(255,255,255,0.7)' : Theme.colors.muted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>{rightElement ?? null}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '700',
  },
  backPlaceholder: { width: 36 },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  rightSlot: { width: 36, alignItems: 'flex-end' },
});

export default AppHeader;
