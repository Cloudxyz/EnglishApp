// ─────────────────────────────────────────────
//  LevelUp English — Progress Screen
//  Insights (stats + radar + calendar) + Achievements
// ─────────────────────────────────────────────
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';

import Theme from '../theme/theme';
import { AppText } from '../components/AppText';
import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { StatChip } from '../components/StatChip';

import StorageService from '../services/StorageService';
import { ACHIEVEMENTS } from '../services/RewardsService';
import {
  UserStats,
  getLevelName,
  getXPInCurrentLevel,
  XP_PER_LEVEL,
  SRSCard,
} from '../types';
import SRSService from '../services/SRSService';

const { colors, spacing, radius, typography, shadows } = Theme;
const { width: SCREEN_W } = Dimensions.get('window');

type Tab = 'insights' | 'achievements';

// ── Radar chart (6 fake skill areas from SRS & history) ──────────────
const RADAR_LABELS = ['Listening', 'Pronunciation', 'Grammar', 'Fluency', 'Word Stress', 'Intonation'];
const SIZE = 200;
const CENTER = SIZE / 2;
const R = 74;
const ANGLES = RADAR_LABELS.map((_, i) => (Math.PI * 2 * i) / RADAR_LABELS.length - Math.PI / 2);

function polarToXY(angle: number, r: number) {
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

interface RadarProps {
  values: number[]; // 0–1 each
}

function RadarChart({ values }: RadarProps) {
  const rings = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = values.map((v, i) => polarToXY(ANGLES[i], v * R));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <Svg width={SIZE} height={SIZE + 30} style={{ alignSelf: 'center' }}>
      {/* Rings */}
      {rings.map(r => {
        const pts = ANGLES.map(a => polarToXY(a, r * R));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
        return <Polygon key={r} points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.border} strokeWidth={1} />;
      })}

      {/* Axes */}
      {ANGLES.map((a, i) => {
        const outer = polarToXY(a, R);
        return <Line key={i} x1={CENTER} y1={CENTER} x2={outer.x} y2={outer.y} stroke={colors.border} strokeWidth={1} />;
      })}

      {/* Data polygon */}
      <Polygon
        points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill={colors.primary + '40'}
        stroke={colors.primary}
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.primary} />
      ))}

      {/* Labels */}
      {ANGLES.map((a, i) => {
        const pos = polarToXY(a, R + 18);
        return (
          <SvgText
            key={i}
            x={pos.x}
            y={pos.y + 4}
            fontSize={9}
            fill={colors.muted}
            textAnchor="middle"
          >
            {RADAR_LABELS[i]}
          </SvgText>
        );
      })}

      {/* Pct labels */}
      {dataPoints.map((p, i) => (
        <SvgText key={`v${i}`} x={p.x} y={p.y - 6} fontSize={8} fill={colors.primary} textAnchor="middle">
          {Math.round(values[i] * 100)}%
        </SvgText>
      ))}
    </Svg>
  );
}

// ── Calendar heatmap (last 35 days) ───────────────────────────────────
function CalendarStrip({ activeDate }: { activeDate: string }) {
  const today = new Date();
  const days: Date[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.calRow}>
          {week.map((d, di) => {
            const ds = d.toISOString().slice(0, 10);
            const isActive = ds <= activeDate && ds >= activeDate.slice(0, 8) + '01'; // simple heuristic
            const isToday = ds === todayStr;
            return (
              <View
                key={di}
                style={[
                  styles.calDay,
                  isToday && { borderWidth: 2, borderColor: colors.primary },
                  { backgroundColor: isToday ? colors.primary : isActive ? colors.primarySurface : colors.border },
                ]}
              >
                <AppText variant="micro" color={isToday ? colors.white : isActive ? colors.primary : colors.muted}>
                  {d.getDate()}
                </AppText>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ────────────────────────────────
export default function ProgressScreen() {
  const [tab, setTab] = useState<Tab>('insights');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [srsCards, setSrsCards] = useState<SRSCard[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const s = await StorageService.getStats();
      setStats(s);
      const cards = await SRSService.getAllCards();
      setSrsCards(cards);
    })();
  }, []));

  if (!stats) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="body" color={colors.muted}>Loading…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  const xpInLevel = getXPInCurrentLevel(stats.xp);
  const levelName = getLevelName(stats.level);

  // Derive radar values from stats (heuristic — no real analysis engine)
  const totalCards = srsCards.length || 1;
  const avgBox = srsCards.reduce((s, c) => s + c.box, 0) / totalCards;
  const listeningVal = Math.min(1, stats.totalPhrases / 60);
  const pronVal = Math.min(1, avgBox / 5);
  const grammarVal = Math.min(1, stats.totalMinutes / 120);
  const fluencyVal = Math.min(1, stats.perfectLessons / 10 + 0.2);
  const stressVal = Math.min(1, stats.totalPhrases / 80);
  const intonationVal = Math.min(1, stats.totalInterviews / 10 + 0.1);
  const radarValues = [listeningVal, pronVal, grammarVal, fluencyVal, stressVal, intonationVal];

  const earnedAchs = ACHIEVEMENTS.filter(a => stats.achievements.includes(a.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#5C5CE0', '#7B7BEA']} style={styles.headerGrad}>
        <View style={styles.headerRow}>
          <View>
            <AppText variant="h2" color={colors.white}>My Progress</AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              Lvl {stats.level} — {levelName}
            </AppText>
          </View>
          <View style={styles.topStats}>
            <View style={styles.topStat}>
              <Text style={{ fontSize: 18 }}>🔥</Text>
              <AppText variant="bodyBold" color={colors.white}>{stats.longestStreak}</AppText>
              <AppText variant="micro" color="rgba(255,255,255,0.7)">Longest</AppText>
            </View>
            <View style={styles.topStat}>
              <Text style={{ fontSize: 18 }}>🔥</Text>
              <AppText variant="bodyBold" color={colors.white}>{stats.streak}</AppText>
              <AppText variant="micro" color="rgba(255,255,255,0.7)">Current</AppText>
            </View>
            <View style={styles.topStat}>
              <Text style={{ fontSize: 18 }}>📅</Text>
              <AppText variant="bodyBold" color={colors.white}>{stats.totalMinutes}</AppText>
              <AppText variant="micro" color="rgba(255,255,255,0.7)">Minutes</AppText>
            </View>
          </View>
        </View>

        {/* XP bar */}
        <View style={styles.xpWrap}>
          <ProgressBar progress={xpInLevel / XP_PER_LEVEL} color={colors.white} trackColor="rgba(255,255,255,0.3)" height={8} />
          <AppText variant="micro" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>
            {xpInLevel} / {XP_PER_LEVEL} XP
          </AppText>
        </View>
      </LinearGradient>

      {/* Tab switcher */}
      <View style={styles.tabWrap}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'insights' && styles.tabBtnActive]}
          onPress={() => setTab('insights')}
        >
          <AppText variant="captionBold" color={tab === 'insights' ? colors.white : colors.muted}>
            Insights
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'achievements' && styles.tabBtnActive]}
          onPress={() => setTab('achievements')}
        >
          <AppText variant="captionBold" color={tab === 'achievements' ? colors.white : colors.muted}>
            Achievements
          </AppText>
        </TouchableOpacity>
      </View>

      {/* ── Insights tab ─────────────────────── */}
      {tab === 'insights' && (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Quick stats */}
          <View style={styles.statsRow}>
            <StatChip type="streak" value={stats.streak} label="streak" />
            <StatChip type="xp" value={stats.xp} label="total XP" />
            <StatChip type="coins" value={stats.coins} label="coins" />
          </View>

          {/* Numbers grid */}
          <AppText variant="h4" style={styles.sectionTitle}>Learning Stats</AppText>
          <View style={styles.gridRow}>
            {[
              { icon: '📖', label: 'Lessons Passed', value: stats.totalPhrases },
              { icon: '✅', label: 'Perfect Lessons', value: stats.perfectLessons },
              { icon: '🗣️', label: 'Words Spoken', value: stats.totalPhrases * 4 },
              { icon: '💼', label: 'Interviews', value: stats.totalInterviews },
              { icon: '🎙️', label: 'Audio mins', value: stats.totalMinutes },
              { icon: '⚔️', label: 'Challenges', value: stats.achievements.length },
            ].map(({ icon, label, value }) => (
              <AppCard key={label} style={styles.gridCard}>
                <Text style={{ fontSize: 22, textAlign: 'center' }}>{icon}</Text>
                <AppText variant="h3" color={colors.primary} center>{value}</AppText>
                <AppText variant="micro" color={colors.muted} center>{label}</AppText>
              </AppCard>
            ))}
          </View>

          {/* Growth Area radar */}
          <AppText variant="h4" style={styles.sectionTitle}>Growth Area</AppText>
          <AppCard style={{ alignItems: 'center', paddingVertical: spacing.base }}>
            <RadarChart values={radarValues} />
            <View style={styles.radarLegend}>
              {RADAR_LABELS.map((l, i) => (
                <View key={l} style={styles.legendRow}>
                  <AppText variant="micro" color={colors.muted} style={{ flex: 1 }}>{l}</AppText>
                  <ProgressBar progress={radarValues[i]} height={6} style={{ width: 80 }} color={colors.primary} />
                  <AppText variant="micro" color={colors.primary} style={{ width: 32, textAlign: 'right' }}>
                    {Math.round(radarValues[i] * 100)}%
                  </AppText>
                </View>
              ))}
            </View>
          </AppCard>

          {/* SRS distribution */}
          <AppText variant="h4" style={styles.sectionTitle}>SRS Box Distribution</AppText>
          <AppCard>
            {[1, 2, 3, 4, 5].map(box => {
              const count = srsCards.filter(c => c.box === box).length;
              const pct = totalCards > 0 ? count / totalCards : 0;
              const boxColors = ['#FF4757', '#FF8B3E', '#FFD93D', '#4CD97B', '#5C5CE0'];
              return (
                <View key={box} style={styles.srsRow}>
                  <AppText variant="captionBold" color={boxColors[box - 1]} style={{ width: 44 }}>
                    Box {box}
                  </AppText>
                  <ProgressBar
                    progress={pct}
                    height={10}
                    color={boxColors[box - 1]}
                    style={{ flex: 1, marginHorizontal: spacing.sm }}
                  />
                  <AppText variant="micro" color={colors.muted} style={{ width: 28, textAlign: 'right' }}>
                    {count}
                  </AppText>
                </View>
              );
            })}
          </AppCard>

          {/* Learning Day Calendar */}
          <AppText variant="h4" style={styles.sectionTitle}>Learning Day History</AppText>
          <AppCard>
            <AppText variant="captionBold" color={colors.muted} style={{ marginBottom: spacing.sm }}>
              Last 5 weeks
            </AppText>
            <View style={styles.calDayLabels}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <AppText key={i} variant="micro" color={colors.muted} style={styles.calDayLabel}>{d}</AppText>
              ))}
            </View>
            <CalendarStrip activeDate={stats.lastActivityDate} />
          </AppCard>

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}

      {/* ── Achievements tab ──────────────────── */}
      {tab === 'achievements' && (
        <ScrollView contentContainerStyle={styles.content}>
          <AppText variant="caption" color={colors.muted} style={{ marginBottom: spacing.base }}>
            {earnedAchs.length} / {ACHIEVEMENTS.length} unlocked
          </AppText>
          <View style={styles.achGrid}>
            {ACHIEVEMENTS.map(ach => {
              const earned = stats.achievements.includes(ach.id);
              return (
                <AppCard key={ach.id} style={[styles.achCard, !earned ? styles.achCardLocked : undefined]}>
                  <Text style={{ fontSize: 36, opacity: earned ? 1 : 0.3 }}>{ach.icon}</Text>
                  <AppText
                    variant="captionBold"
                    center
                    color={earned ? colors.text : colors.muted}
                    numberOfLines={2}
                    style={{ marginTop: spacing.xs }}
                  >
                    {ach.title}
                  </AppText>
                  <AppText variant="micro" color={colors.muted} center numberOfLines={2} style={{ marginTop: 2 }}>
                    {ach.description}
                  </AppText>
                  {earned && (
                    <View style={styles.xpPill}>
                      <AppText variant="micro" color={colors.white}>+{ach.xpReward} XP</AppText>
                    </View>
                  )}
                  {!earned && (
                    <Text style={{ fontSize: 16, marginTop: spacing.xs, opacity: 0.4 }}>🔒</Text>
                  )}
                </AppCard>
              );
            })}
          </View>
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerGrad: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: Theme.radius.xl,
    borderBottomRightRadius: Theme.radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  topStat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Theme.radius.md,
    padding: spacing.sm,
    minWidth: 52,
  },
  xpWrap: { marginTop: spacing.sm },
  tabWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: Theme.radius.md,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  sectionTitle: { marginTop: spacing.base, marginBottom: spacing.sm },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCard: {
    width: (SCREEN_W - spacing.base * 2 - spacing.sm * 2) / 3,
    alignItems: 'center',
    padding: spacing.sm,
  },
  radarLegend: {
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  srsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  calDayLabels: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  calDayLabel: {
    flex: 1,
    textAlign: 'center',
  },
  calRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  calDay: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Theme.radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  achCard: {
    width: (SCREEN_W - spacing.base * 2 - spacing.sm * 2) / 3,
    alignItems: 'center',
    padding: spacing.sm,
    minHeight: 130,
  },
  achCardLocked: {
    opacity: 0.7,
  },
  xpPill: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: Theme.radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
