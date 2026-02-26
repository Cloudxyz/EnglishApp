// ─────────────────────────────────────────────
//  LevelUp English — Train Screen
//  Daily routine selector + guided session
// ─────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import Theme from '../theme/theme';
import { AppText } from '../components/AppText';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { ProgressBar } from '../components/ProgressBar';

import phrasesData from '../data/phrases.json';
import { Phrase } from '../types';
import TTSService from '../services/TTSService';
import StorageService from '../services/StorageService';
import RewardsService, { XP_REWARDS } from '../services/RewardsService';

const { colors, spacing, radius, typography, shadows } = Theme;

type RoutineType = 'shadowing' | 'listening' | 'interview' | 'mixed' | 'custom';

interface RoutineOption {
  key: RoutineType;
  icon: string;
  label: string;
  subtitle: string;
  minutes: number;
  gradient: [string, string];
}

const ROUTINES: RoutineOption[] = [
  {
    key: 'shadowing',
    icon: '🎙️',
    label: 'Shadowing Only',
    subtitle: 'Focus on pronunciation & rhythm',
    minutes: 30,
    gradient: ['#5C5CE0', '#7B7BEA'],
  },
  {
    key: 'listening',
    icon: '👂',
    label: 'Listening Only',
    subtitle: 'Train your ear with drills',
    minutes: 20,
    gradient: ['#4CD97B', '#2EB860'],
  },
  {
    key: 'interview',
    icon: '💼',
    label: 'Interview Only',
    subtitle: 'Simulate real tech interviews',
    minutes: 40,
    gradient: ['#FF8B3E', '#E06010'],
  },
  {
    key: 'mixed',
    icon: '🔀',
    label: 'Mixed 1 Hour',
    subtitle: 'Shadowing + Listening + Interview',
    minutes: 60,
    gradient: ['#5C5CE0', '#FF8B3E'],
  },
  {
    key: 'custom',
    icon: '⚙️',
    label: 'Custom Session',
    subtitle: 'Pick your blocks',
    minutes: 30,
    gradient: ['#3FA1F5', '#1A7ED4'],
  },
];

// ── Listening mini-game for Train ────────────
interface MiniListeningProps {
  phrase: Phrase;
  onDone: (correct: boolean) => void;
}

function MiniListening({ phrase, onDone }: MiniListeningProps) {
  const [played, setPlayed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const playTTS = async () => {
    setPlayed(true);
    await TTSService.speakNormal(phrase.english);
  };

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    setTimeout(() => onDone(idx === phrase.answerIndex), 1200);
  };

  const opts = phrase.options ?? [];
  const answer = phrase.answerIndex ?? 0;

  return (
    <View style={styles.miniCard}>
      <AppText variant="h4" center style={{ marginBottom: spacing.base }}>
        {phrase.question ?? 'What did you hear?'}
      </AppText>

      <TouchableOpacity style={styles.playBtn} onPress={playTTS} activeOpacity={0.8}>
        <Text style={{ fontSize: 32 }}>🔊</Text>
        <AppText variant="captionBold" color={colors.primary} style={{ marginTop: 4 }}>
          {played ? 'Play again' : 'Tap to listen'}
        </AppText>
      </TouchableOpacity>

      {opts.map((opt, idx) => {
        const isCorrect = idx === answer;
        const isSelected = idx === selected;
let bg: string = colors.surface;
      let border: string = colors.border;
        if (revealed && isSelected && isCorrect) { bg = colors.successLight; border = colors.success; }
        if (revealed && isSelected && !isCorrect) { bg = colors.dangerLight; border = colors.danger; }
        if (revealed && !isSelected && isCorrect) { bg = colors.successLight; border = colors.success; }

        return (
          <TouchableOpacity
            key={idx}
            style={[styles.optBtn, { backgroundColor: bg, borderColor: border }]}
            onPress={() => handleSelect(idx)}
            disabled={revealed}
            activeOpacity={0.8}
          >
            <AppText variant="body">{opt}</AppText>
            {revealed && (isSelected || isCorrect) && (
              <Text style={{ fontSize: 18, marginLeft: 8 }}>
                {isCorrect ? '✅' : '❌'}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Shadowing mini-card for Train ─────────────
interface MiniShadowingProps {
  phrase: Phrase;
  onDone: () => void;
}

function MiniShadowing({ phrase, onDone }: MiniShadowingProps) {
  const [step, setStep] = useState<'listen' | 'pronounce' | 'done'>('listen');

  const handleListen = async () => {
    await TTSService.speakNormal(phrase.english, 1);
    setStep('pronounce');
  };

  const handleListenSlow = async () => {
    await TTSService.speakSlow(phrase.english, 1);
    setStep('pronounce');
  };

  return (
    <View style={styles.miniCard}>
      <AppText variant="h4" center color={colors.primary} style={{ marginBottom: spacing.xs }}>
        {phrase.english}
      </AppText>
      <AppText variant="caption" center color={colors.muted} style={{ marginBottom: spacing.sm }}>
        {phrase.spanish}
      </AppText>
      <AppText variant="captionBold" center color={colors.secondary} style={{ marginBottom: spacing.base }}>
        🗣 {phrase.pronunciation_es}
      </AppText>

      {step === 'listen' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
          <AppButton label="▶ Normal" onPress={handleListen} size="sm" />
          <AppButton label="🐢 Slow" onPress={handleListenSlow} variant="secondary" size="sm" />
        </View>
      )}

      {step === 'pronounce' && (
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="caption" color={colors.muted} center>
            Now say it out loud three times!
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton label="🔁 Repeat" onPress={() => setStep('listen')} variant="ghost" size="sm" />
            <AppButton label="✅ Done" onPress={onDone} size="sm" variant="success" />
          </View>
        </View>
      )}
    </View>
  );
}

// ── Main Train Screen ──────────────────────────
export default function TrainScreen() {
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineType | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [targetMinutes, setTargetMinutes] = useState(30);
  const [customBlocks, setCustomBlocks] = useState({ shadowing: 15, listening: 10, interview: 5 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(useCallback(() => {
    return () => {
      TTSService.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []));

  const allPhrases = phrasesData as Phrase[];

  const buildPlaylist = (type: RoutineType): Phrase[] => {
    const shadowing = allPhrases.filter(p => ['greeting', 'conversation', 'workplace', 'pronunciation'].includes(p.category));
    const listening = allPhrases.filter(p => p.question && p.options);
    const interview = allPhrases.filter(p => ['interview', 'technical'].includes(p.category));

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    switch (type) {
      case 'shadowing': return shuffle(shadowing).slice(0, 15);
      case 'listening': return shuffle(listening).slice(0, 12);
      case 'interview': return shuffle(interview).slice(0, 10);
      case 'mixed': return [
        ...shuffle(shadowing).slice(0, 8),
        ...shuffle(listening).slice(0, 6),
        ...shuffle(interview).slice(0, 4),
      ];
      case 'custom': return [
        ...shuffle(shadowing).slice(0, Math.ceil(customBlocks.shadowing / 2)),
        ...shuffle(listening).slice(0, Math.ceil(customBlocks.listening / 2)),
        ...shuffle(interview).slice(0, Math.ceil(customBlocks.interview / 2)),
      ];
      default: return shuffle(allPhrases).slice(0, 10);
    }
  };

  const startSession = () => {
    const routine = ROUTINES.find(r => r.key === selectedRoutine)!;
    setTargetMinutes(routine.minutes);
    const playlist = buildPlaylist(selectedRoutine!);
    setPhrases(playlist);
    setCurrentIndex(0);
    setCorrectCount(0);
    setElapsed(0);
    setSessionDone(false);
    setSessionActive(true);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const finishSession = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const minutesSpent = Math.max(1, Math.round(elapsed / 60));
    await RewardsService.recordActivity(minutesSpent);
    const xp = correctCount * XP_REWARDS.listening_correct + (phrases.length - correctCount) * XP_REWARDS.listening_incorrect;
    await RewardsService.addXP(xp);
    await StorageService.updateStats({ totalPhrases: (await StorageService.getStats()).totalPhrases + phrases.length });
    setSessionDone(true);
  };

  const handleItemDone = (correct?: boolean) => {
    if (correct === true) setCorrectCount(c => c + 1);
    if (currentIndex + 1 >= phrases.length) {
      finishSession();
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const resetSession = () => {
    TTSService.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setSessionActive(false);
    setSessionDone(false);
    setSelectedRoutine(null);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentPhrase = phrases[currentIndex];
  const progress = phrases.length > 0 ? currentIndex / phrases.length : 0;
  const isListening = selectedRoutine === 'listening' ||
    (selectedRoutine === 'mixed' && currentPhrase?.question != null);
  const routineInfo = ROUTINES.find(r => r.key === selectedRoutine);

  // ── Session Done screen ───────────────────
  if (sessionDone) {
    const accuracy = phrases.length ? Math.round((correctCount / phrases.length) * 100) : 0;
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={['#5C5CE0', '#7B9FE8']} style={styles.doneGradient}>
          <Text style={{ fontSize: 64, marginBottom: spacing.base }}>🏆</Text>
          <AppText variant="h2" color={colors.white} center>Session Complete!</AppText>
          <AppText variant="body" color="rgba(255,255,255,0.8)" center style={{ marginTop: 8 }}>
            {formatTime(elapsed)} — {phrases.length} items
          </AppText>
          {selectedRoutine === 'listening' || selectedRoutine === 'mixed' ? (
            <View style={[styles.resultRow, { marginTop: spacing.xl }]}>
              <View style={styles.resultChip}>
                <AppText variant="h3" color={colors.white}>{formatTime(elapsed)}</AppText>
                <AppText variant="micro" color="rgba(255,255,255,0.7)">Time</AppText>
              </View>
              <View style={styles.resultChip}>
                <AppText variant="h3" color={colors.white}>{accuracy}%</AppText>
                <AppText variant="micro" color="rgba(255,255,255,0.7)">Accuracy</AppText>
              </View>
            </View>
          ) : null}
          <AppButton
            label="Continue"
            onPress={resetSession}
            variant="secondary"
            size="lg"
            style={{ marginTop: spacing.xxl, minWidth: 200 }}
          />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ── Active session screen ─────────────────
  if (sessionActive && currentPhrase) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.sessionHeader}>
          <TouchableOpacity onPress={resetSession} style={styles.closeBtn}>
            <Text style={{ fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: spacing.base }}>
            <ProgressBar progress={progress} height={8} color={colors.primary} />
          </View>
          <AppText variant="captionBold" color={colors.muted}>{formatTime(elapsed)}</AppText>
        </View>

        <ScrollView contentContainerStyle={styles.sessionContent}>
          <AppText variant="caption" color={colors.muted} center style={{ marginBottom: spacing.sm }}>
            {currentIndex + 1} / {phrases.length}
          </AppText>

          {currentPhrase.question && (selectedRoutine === 'listening' || selectedRoutine === 'mixed') ? (
            <MiniListening phrase={currentPhrase} onDone={(correct) => handleItemDone(correct)} />
          ) : (
            <MiniShadowing phrase={currentPhrase} onDone={() => handleItemDone()} />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Routine selector screen ───────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={['#5C5CE0', '#7B7BEA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topGradient}
        >
          <AppText variant="h2" color={colors.white}>What do you want</AppText>
          <AppText variant="h2" color={colors.white}>to train today?</AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.75)" style={{ marginTop: 4 }}>
            Choose your routine and level up! 🚀
          </AppText>
        </LinearGradient>

        <View style={styles.routineList}>
          {ROUTINES.map((r) => {
            const isSelected = selectedRoutine === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.routineCard, isSelected && styles.routineCardActive]}
                onPress={() => setSelectedRoutine(r.key)}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={isSelected ? r.gradient : [colors.surface, colors.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.routineCardInner}
                >
                  <Text style={{ fontSize: 32 }}>{r.icon}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.base }}>
                    <AppText
                      variant="bodyBold"
                      color={isSelected ? colors.white : colors.text}
                    >
                      {r.label}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={isSelected ? 'rgba(255,255,255,0.8)' : colors.muted}
                    >
                      {r.subtitle}
                    </AppText>
                  </View>
                  <View style={[styles.minBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.primarySurface }]}>
                    <AppText variant="captionBold" color={isSelected ? colors.white : colors.primary}>
                      {r.minutes}m
                    </AppText>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom block picker */}
        {selectedRoutine === 'custom' && (
          <AppCard style={styles.customCard}>
            <AppText variant="h4" style={{ marginBottom: spacing.base }}>Customize blocks (minutes)</AppText>
            {(['shadowing', 'listening', 'interview'] as const).map((block) => (
              <View key={block} style={styles.customBlock}>
                <AppText variant="body" style={{ width: 90, textTransform: 'capitalize' }}>{block}</AppText>
                <View style={styles.customStepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setCustomBlocks(b => ({ ...b, [block]: Math.max(5, b[block] - 5) }))}
                  >
                    <Text style={styles.stepBtnTxt}>−</Text>
                  </TouchableOpacity>
                  <AppText variant="bodyBold" style={{ width: 36, textAlign: 'center' }}>
                    {customBlocks[block]}
                  </AppText>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setCustomBlocks(b => ({ ...b, [block]: Math.min(60, b[block] + 5) }))}
                  >
                    <Text style={styles.stepBtnTxt}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </AppCard>
        )}

        <View style={styles.startWrap}>
          <AppButton
            label={selectedRoutine ? `Start ${routineInfo?.label ?? 'Session'}` : 'Select a routine first'}
            onPress={selectedRoutine ? startSession : () => {}}
            disabled={!selectedRoutine}
            size="lg"
            fullWidth
          />
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl },
  topGradient: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: Theme.radius.xl,
    borderBottomRightRadius: Theme.radius.xl,
    marginBottom: spacing.base,
  },
  routineList: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  routineCard: {
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.card,
  },
  routineCardActive: {
    borderColor: colors.primary,
  },
  routineCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: Theme.radius.lg,
  },
  minBadge: {
    borderRadius: Theme.radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  customCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
  },
  customBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  customStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnTxt: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 24,
  },
  startWrap: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
  },
  // Session
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.full,
    backgroundColor: colors.border,
  },
  sessionContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  miniCard: {
    backgroundColor: colors.surface,
    borderRadius: Theme.radius.lg,
    padding: spacing.base,
    ...shadows.card,
  },
  playBtn: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.base,
    marginBottom: spacing.base,
  },
  optBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Theme.radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  // Done
  doneGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  resultRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  resultChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Theme.radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
