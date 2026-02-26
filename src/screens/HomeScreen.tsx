import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Theme from '../theme/theme';
import { AppText } from '../components/AppText';
import { AppCard } from '../components/AppCard';
import { StatChip } from '../components/StatChip';
import { ProgressBar } from '../components/ProgressBar';

import StorageService from '../services/StorageService';
import RewardsService from '../services/RewardsService';
import { UserStats, getLevelName, getXPInCurrentLevel, XP_PER_LEVEL } from '../types';
import { ACHIEVEMENTS } from '../services/RewardsService';

const { colors, spacing, radius, typography, shadows } = Theme;

const LEVEL_COLORS: Record<number, [string, string]> = {
  1: ['#A0C4FF', '#7B9FE8'],
  2: ['#4CD97B', '#2EB860'],
  3: ['#FFD93D', '#F0C020'],
  4: ['#FF8B3E', '#E06010'],
  5: ['#5C5CE0', '#4040C0'],
  6: ['#FF4757', '#CC0020'],
};

function getLevelGradient(level: number): [string, string] {
  return LEVEL_COLORS[Math.min(level, 6)] ?? ['#5C5CE0', '#4040C0'];
}

export default function HomeScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    const s = await StorageService.getStats();
    setStats(s);
    // Refresh weekly freeze if needed
    await RewardsService.refreshWeeklyFreeze();
  }, []);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (!stats) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <AppText variant="body" color={colors.muted}>Loading...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  const xpInLevel = getXPInCurrentLevel(stats.xp);
  const xpProgress = xpInLevel / XP_PER_LEVEL;
  const levelGradient = getLevelGradient(stats.level);
  const levelName = getLevelName(stats.level);
  const earnedAchs = ACHIEVEMENTS.filter((a) => stats.achievements.includes(a.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Header ─────────────────────────────── */}
        <LinearGradient
          colors={['#5C5CE0', '#7B7BEA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <View>
              <AppText variant="caption" color="rgba(255,255,255,0.7)">Welcome back 👋</AppText>
              <AppText variant="h2" color={colors.white}>LevelUp English</AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.8)">Ready to level up today?</AppText>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <AppText variant="h3" color={colors.white}>{stats.streak}</AppText>
              <AppText variant="micro" color="rgba(255,255,255,0.8)">Streak</AppText>
            </View>
          </View>
        </LinearGradient>

        {/* ── Level card ──────────────────────────── */}
        <View style={styles.levelCardWrap}>
          <LinearGradient
            colors={levelGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.levelCard}
          >
            <View style={styles.levelRow}>
              <View>
                <AppText variant="caption" color="rgba(255,255,255,0.8)">Current Level</AppText>
                <AppText variant="h3" color={colors.white}>
                  Lvl {stats.level} — {levelName}
                </AppText>
              </View>
              <View style={styles.xpBadge}>
                <AppText variant="bodyBold" color={colors.white}>⚡ {stats.xp} XP</AppText>
              </View>
            </View>
            <View style={styles.xpBarWrap}>
              <ProgressBar
                progress={xpProgress}
                color={colors.white}
                trackColor="rgba(255,255,255,0.3)"
                height={8}
              />
              <AppText variant="micro" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>
                {xpInLevel} / {XP_PER_LEVEL} XP to next level
              </AppText>
            </View>
          </LinearGradient>
        </View>

        {/* ── Stats row ───────────────────────────── */}
        <View style={styles.statsRow}>
          <StatChip type="streak" value={stats.streak} label="streak" />
          <StatChip type="xp" value={stats.xp} label="XP" />
          <StatChip type="coins" value={stats.coins} label="coins" />
        </View>

        {/* ── Today's motivation ──────────────────── */}
        <AppCard style={styles.motivCard}>
          <Text style={styles.motivEmoji}>🚀</Text>
          <AppText variant="h4" center>{stats.totalPhrases === 0 ? 'Welcome to LevelUp English' : 'Keep going — you\'re doing great!'}</AppText>
          <AppText variant="caption" color={colors.muted} center style={{ marginTop: 4 }}>
            {stats.totalMinutes < 10
              ? 'Complete 10 minutes today to keep your streak!'
              : `You've trained ${stats.totalMinutes} minutes total. Keep leveling up!`}
          </AppText>
        </AppCard>

        {/* ── Quick stats ─────────────────────────── */}
        <AppText variant="h4" style={styles.sectionTitle}>Your Progress</AppText>
        <View style={styles.quickStatsGrid}>
          <QuickStat icon="📖" label="Phrases" value={stats.totalPhrases} />
          <QuickStat icon="💼" label="Interviews" value={stats.totalInterviews} />
          <QuickStat icon="⏱️" label="Minutes" value={stats.totalMinutes} />
          <QuickStat icon="✅" label="Perfect" value={stats.perfectLessons} />
        </View>

        {/* ── Recent achievements ─────────────────── */}
        {earnedAchs.length > 0 && (
          <>
            <AppText variant="h4" style={styles.sectionTitle}>Achievements</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achScroll}>
              {earnedAchs.map((ach) => (
                <View key={ach.id} style={styles.achChip}>
                  <Text style={styles.achIcon}>{ach.icon}</Text>
                  <AppText variant="captionBold" center numberOfLines={2}>{ach.title}</AppText>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Streak freeze ───────────────────────── */}
        <AppCard style={styles.freezeCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 28 }}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold">Streak Freeze</AppText>
              <AppText variant="caption" color={colors.muted}>
                {stats.streakFreezeAvailable > 0
                  ? `${stats.streakFreezeAvailable} freeze available — protects your streak for 1 day`
                  : 'No freeze available — earn one next week'}
              </AppText>
            </View>
          </View>
        </AppCard>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickStat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <AppCard style={styles.quickStatCard}>
      <Text style={{ fontSize: 22, textAlign: 'center' }}>{icon}</Text>
      <AppText variant="h3" color={colors.primary} center>{value}</AppText>
      <AppText variant="caption" color={colors.muted} center>{label}</AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xxxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerGradient: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl + 20,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    minWidth: 64,
  },
  streakFire: { fontSize: 24 },
  levelCardWrap: {
    marginHorizontal: spacing.base,
    marginTop: -spacing.xl,
    ...shadows.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  levelCard: {
    padding: spacing.base,
    borderRadius: radius.lg,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  xpBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  xpBarWrap: { marginTop: spacing.xs },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
  },
  motivCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    alignItems: 'center',
  },
  motivEmoji: { fontSize: 32, marginBottom: spacing.sm },
  sectionTitle: { marginHorizontal: spacing.base, marginTop: spacing.xl, marginBottom: spacing.sm },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  quickStatCard: {
    flex: 1,
    minWidth: '44%',
    alignItems: 'center',
    padding: spacing.md,
  },
  achScroll: { paddingLeft: spacing.base, marginBottom: spacing.sm },
  achChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    width: 72,
    ...shadows.card,
  },
  achIcon: { fontSize: 28, marginBottom: 4 },
  freezeCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
  },
});
