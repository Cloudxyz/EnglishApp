import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Theme from '../theme/theme';

import HomeScreen from '../screens/HomeScreen';
import TrainScreen from '../screens/TrainScreen';
import ShadowingScreen from '../screens/ShadowingScreen';
import InterviewScreen from '../screens/InterviewScreen';
import ProgressScreen from '../screens/ProgressScreen';

export type TabParamList = {
  Home: undefined;
  Train: undefined;
  Shadowing: undefined;
  Interview: undefined;
  Progress: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Train: '🎯',
  Shadowing: '🎙️',
  Interview: '💼',
  Progress: '📊',
};

export default function TabNavigator() {
  const { colors, typography, radius, shadows } = Theme;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
          height: 60 + insets.bottom,
          ...shadows.card,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          ...typography.micro,
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.iconWrap, focused ? styles.iconWrapActive : null]}>
            <Text style={{ fontSize: focused ? 22 : 20 }}>
              {TAB_ICONS[route.name]}
            </Text>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Train" component={TrainScreen} />
      <Tab.Screen name="Shadowing" component={ShadowingScreen} />
      <Tab.Screen name="Interview" component={InterviewScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.sm,
  },
  iconWrapActive: {
    backgroundColor: Theme.colors.primarySurface,
  },
});
