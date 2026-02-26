// ─────────────────────────────────────────────
//  LevelUp English — Shadowing Screen
//  TTS + Record + Playback + SRS + Self-rating
// ─────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import Theme from '../theme/theme';
import { AppText } from '../components/AppText';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { ProgressBar } from '../components/ProgressBar';
import { CircularProgress } from '../components/CircularProgress';

import phrasesData from '../data/phrases.json';
import { Phrase, ShadowingAttempt } from '../types';
import TTSService from '../services/TTSService';
import AudioService from '../services/AudioService';
import SRSService from '../services/SRSService';
import StorageService from '../services/StorageService';
import RewardsService, { XP_REWARDS } from '../services/RewardsService';
import { scoreDuration, estimateExpectedDurationMs, DurationScore, wordSimilarity } from '../services/LocalScoringService';
import { STTModule, useSTTEvent, sttAvailable } from '../services/STTService';

const STT_LANG = 'en-US';

const { colors, spacing, radius, typography, shadows } = Theme;

type Stage = 'browse' | 'listen' | 'record' | 'feedback';

const DIFFICULTIES = ['All', '1', '2', '3', '4', '5'];
const CATEGORIES = ['All', 'greeting', 'conversation', 'workplace', 'technical', 'interview', 'pronunciation'];

const RATING_LABELS: Record<number, string> = {
  1: 'Oops — try again',
  2: 'Almost there',
  3: 'Good enough',
  4: 'Great job!',
  5: 'Perfect! 🎉',
};

const RATING_COLORS: Record<number, string> = {
  1: '#FF4757',
  2: '#FF8B3E',
  3: '#FFD93D',
  4: '#4CD97B',
  5: '#5C5CE0',
};

export default function ShadowingScreen() {
  const allPhrases = phrasesData as Phrase[];

  const [filterDiff, setFilterDiff] = useState('All');
  const [filterCat, setFilterCat] = useState('All');
  const [dueIds, setDueIds] = useState<string[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [stage, setStage] = useState<Stage>('browse');
  const [repeatCount, setRepeatCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [selfRating, setSelfRating] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [durationHint, setDurationHint] = useState<DurationScore | null>(null);
  const [sttTranscript, setSttTranscript] = useState<string | null>(null);
  const sttTranscriptRef = useRef<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // STT events — hooks always called; no-op in Expo Go via STTService stubs
  useSTTEvent('result', (ev: any) => {
    const text: string = ev?.results?.[0]?.transcript ?? ev?.value?.[0] ?? '';
    if (text) { setSttTranscript(text); sttTranscriptRef.current = text; }
  });
  useSTTEvent('error', (ev: any) => {
    console.log('[STT] error:', ev?.error ?? ev);
  });

  useFocusEffect(useCallback(() => {
    refreshDueCards();
    return () => {
      TTSService.stop();
      AudioService.stopPlayback();
    };
  }, []));

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const refreshDueCards = async () => {
    const ids = allPhrases.map(p => p.id);
    const due = await SRSService.getDueCards(ids);
    setDueIds(due);
  };

  const filteredPhrases = allPhrases.filter(p => {
    const diffOk = filterDiff === 'All' || p.difficulty === parseInt(filterDiff);
    const catOk = filterCat === 'All' || p.category === filterCat;
    return diffOk && catOk;
  });

  const pickPhrase = (phrase: Phrase) => {
    setCurrentPhrase(phrase);
    setStage('listen');
    setRepeatCount(0);
    setRecordedUri(null);
    setSelfRating(0);
    setXpEarned(0);
  };

  const pickRandom = () => {
    const pool = dueIds.length > 0
      ? filteredPhrases.filter(p => dueIds.includes(p.id))
      : filteredPhrases;
    if (pool.length === 0) {
      Alert.alert('No phrases', 'No phrases match your filters. Try adjusting them.');
      return;
    }
    const p = pool[Math.floor(Math.random() * pool.length)];
    pickPhrase(p);
  };

  // ── TTS ─────────────────────────────────────
  const speakNormal = async () => {
    if (!currentPhrase) return;
    setIsPlaying(true);
    await TTSService.speakNormal(currentPhrase.english, 1);
    setIsPlaying(false);
    setRepeatCount(c => c + 1);
  };

  const speakSlow = async () => {
    if (!currentPhrase) return;
    setIsPlaying(true);
    await TTSService.speakSlow(currentPhrase.english, 1);
    setIsPlaying(false);
    setRepeatCount(c => c + 1);
  };

  const speakRepeat3 = async () => {
    if (!currentPhrase) return;
    setIsPlaying(true);
    await TTSService.speakNormal(currentPhrase.english, 3);
    setIsPlaying(false);
    setRepeatCount(c => c + 3);
  };

  // ── Recording ────────────────────────────────
  const startRecord = async () => {
    const ok = await AudioService.requestPermissions();
    if (!ok) {
      Alert.alert('Permission denied', 'Microphone access is needed for shadowing.');
      return;
    }
    setSttTranscript(null);
    sttTranscriptRef.current = null;
    setIsRecording(true);
    setStage('record');
    await AudioService.startRecording();
    // Start device STT in parallel (only works in dev build; STTModule is a no-op in Expo Go)
    if (sttAvailable) try {
      await STTModule.requestPermissionsAsync();
      STTModule.start({
        lang: STT_LANG,
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
      });
    } catch (e) {
      console.log('[STT] start failed:', e);
    }
  };

  const stopRecord = async () => {
    setIsRecording(false);
    // Stop device STT
    if (sttAvailable) try { STTModule.stop(); } catch { /* ignore */ }
    const result = await AudioService.stopRecording();
    if (!result) return;

    const expected = estimateExpectedDurationMs(currentPhrase?.english ?? '');
    const hint = scoreDuration(result.durationMs, expected);
    setRecordedUri(result.uri);
    setDurationHint(hint);

    // Score: use STT word similarity if available, else fall back to duration
    let autoScore = hint.score;
    const transcript = sttTranscriptRef.current;
    if (transcript && currentPhrase) {
      const sim = wordSimilarity(transcript, currentPhrase.english);
      autoScore = sim >= 0.85 ? 5 : sim >= 0.65 ? 4 : sim >= 0.4 ? 3 : sim >= 0.2 ? 2 : 1;
      console.log('[Score] STT:', JSON.stringify(transcript), '| sim:', sim.toFixed(2), '→', autoScore);
    } else {
      console.log('[Score] No STT — using duration score:', autoScore);
    }
    await handleRate(autoScore, result.uri);
  };

  const playRecording = async () => {
    if (recordedUri) {
      await AudioService.playUri(recordedUri);
    }
  };

  const handleRate = async (rating: number, uri?: string) => {
    if (!currentPhrase) return;
    setSelfRating(rating);
    setStage('feedback');

    // SRS update
    await SRSService.rateCard(currentPhrase.id, rating);

    // XP
    const xp = rating >= 4 ? XP_REWARDS.shadowing_perfect : XP_REWARDS.shadowing_complete;
    await RewardsService.addXP(xp);
    setXpEarned(xp);

    // history — use passed uri to avoid async state lag
    const attempt: ShadowingAttempt = {
      phraseId: currentPhrase.id,
      timestamp: Date.now(),
      selfRating: rating,
      audioUri: uri ?? recordedUri ?? undefined,
    };
    await StorageService.addShadowingAttempt(attempt);

    // stats
    const stats = await StorageService.getStats();
    await StorageService.updateStats({ totalPhrases: stats.totalPhrases + 1 });
    await RewardsService.recordActivity(2); // ~2 min per phrase

    setSessionCount(c => c + 1);
    await refreshDueCards();
  };

  const nextPhrase = () => {
    setCurrentPhrase(null);
    setStage('browse');
    setRecordedUri(null);
    setSelfRating(0);
    setDurationHint(null);
    setSttTranscript(null);
    sttTranscriptRef.current = null;
  };

  // ── Render phrase detail ──────────────────────
  if (stage !== 'browse' && currentPhrase) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={nextPhrase} style={styles.backBtn}>
            <Text style={{ fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <ProgressBar
            progress={repeatCount / 6}
            height={6}
            style={{ flex: 1, marginHorizontal: spacing.base }}
            color={colors.primary}
          />
          <AppText variant="captionBold" color={colors.muted}>
            🔁 {repeatCount}
          </AppText>
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          {/* Phrase card */}
          <AppCard style={styles.phraseCard}>
            <View style={styles.diffRow}>
              <View style={[styles.diffBadge, { backgroundColor: colors.primarySurface }]}>
                <AppText variant="micro" color={colors.primary}>
                  {'★'.repeat(currentPhrase.difficulty)} Lvl {currentPhrase.difficulty}
                </AppText>
              </View>
              <AppText variant="micro" color={colors.muted}>
                {currentPhrase.category}
              </AppText>
            </View>

            <AppText variant="h3" center style={{ marginTop: spacing.sm }}>
              {currentPhrase.english}
            </AppText>
            <AppText variant="body" color={colors.muted} center style={{ marginTop: spacing.xs }}>
              {currentPhrase.spanish}
            </AppText>

            {/* Pronunciation guide */}
            <View style={styles.pronBox}>
              <AppText variant="micro" color={colors.muted} center>🗣 Pronunciation</AppText>
              <AppText variant="bodyBold" color={colors.secondary} center style={{ marginTop: 2 }}>
                {currentPhrase.pronunciation_es}
              </AppText>
              <AppText variant="micro" color={colors.muted} center style={{ marginTop: 4 }}>
                (stressed syllables in UPPERCASE)
              </AppText>
            </View>
          </AppCard>

          {/* ── LISTEN stage ─────────────────────── */}
          {(stage === 'listen') && (
            <AppCard style={styles.actionCard}>
              <AppText variant="h4" center style={{ marginBottom: spacing.base }}>Step 1 — Listen</AppText>
              <View style={styles.ttsRow}>
                <TouchableOpacity
                  style={[styles.ttsBtn, isPlaying && styles.ttsBtnActive]}
                  onPress={speakNormal}
                  disabled={isPlaying}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 28 }}>▶</Text>
                  <AppText variant="captionBold" color={colors.primary}>Normal</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ttsBtn, isPlaying && styles.ttsBtnActive]}
                  onPress={speakSlow}
                  disabled={isPlaying}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 28 }}>🐢</Text>
                  <AppText variant="captionBold" color={colors.primary}>Slow</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ttsBtn, isPlaying && styles.ttsBtnActive]}
                  onPress={speakRepeat3}
                  disabled={isPlaying}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 28 }}>🔁</Text>
                  <AppText variant="captionBold" color={colors.primary}>×3</AppText>
                </TouchableOpacity>
              </View>

              {repeatCount >= 1 && (
                <AppButton
                  label="🎙️ Now Record Yourself"
                  onPress={startRecord}
                  size="lg"
                  fullWidth
                  style={{ marginTop: spacing.base }}
                />
              )}
            </AppCard>
          )}

          {/* ── RECORD stage ─────────────────────── */}
          {stage === 'record' && (
            <AppCard style={styles.actionCard}>
              <AppText variant="h4" center style={{ marginBottom: spacing.base }}>Step 2 — Shadow it!</AppText>
              <AppText variant="caption" color={colors.muted} center style={{ marginBottom: spacing.base }}>
                Repeat the phrase out loud, matching the rhythm
              </AppText>

              <Animated.View style={[styles.micWrap, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                  style={[styles.micBtn, isRecording && styles.micBtnRecording]}
                  onPress={isRecording ? stopRecord : startRecord}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 36 }}>🎙️</Text>
                </TouchableOpacity>
              </Animated.View>

              <AppText variant="captionBold" color={colors.danger} center style={{ marginTop: spacing.sm }}>
                {isRecording ? '● Recording… tap to stop' : 'Tap to start recording'}
              </AppText>

              {!isRecording && (
                <AppButton
                  label="↩ Listen again first"
                  onPress={() => setStage('listen')}
                  variant="ghost"
                  style={{ marginTop: spacing.base }}
                />
              )}
            </AppCard>
          )}

          {/* ── FEEDBACK stage ───────────────────── */}
          {stage === 'feedback' && (
            <AppCard style={styles.actionCard}>
              <CircularProgress
                progress={selfRating / 5}
                size={100}
                color={RATING_COLORS[selfRating] ?? colors.primary}
                label={`${selfRating * 20}%`}
                sublabel={RATING_LABELS[selfRating]}
              />

              <AppText variant="h4" center color={RATING_COLORS[selfRating]} style={{ marginTop: spacing.base }}>
                {RATING_LABELS[selfRating]}
              </AppText>

              {/* Transcript from device STT */}
              {sttTranscript ? (
                <View style={[styles.hintBadge, { backgroundColor: colors.primarySurface, borderColor: colors.primary, marginTop: spacing.sm }]}>
                  <AppText variant="micro" color={colors.muted} style={{ marginBottom: 2 }}>🎤 What the device heard:</AppText>
                  <AppText variant="captionBold" color={colors.text}>{sttTranscript}</AppText>
                </View>
              ) : (
                // Fallback: show pace hint when no transcript
                durationHint && (
                  <View style={[styles.hintBadge, { backgroundColor: durationHint.hintColor + '22', borderColor: durationHint.hintColor, marginTop: spacing.sm }]}>
                    <AppText variant="captionBold" color={durationHint.hintColor} center>
                      ⏱ Pace: {durationHint.hint}
                    </AppText>
                  </View>
                )
              )}

              {/* Listen back */}
              <View style={[styles.compareRow, { marginTop: spacing.base }]}>
                <TouchableOpacity style={styles.compareBtn} onPress={speakNormal} activeOpacity={0.8}>
                  <Text style={{ fontSize: 24 }}>🔊</Text>
                  <AppText variant="captionBold" color={colors.primary}>Original</AppText>
                </TouchableOpacity>
                <View style={styles.compareDivider} />
                <TouchableOpacity style={styles.compareBtn} onPress={playRecording} activeOpacity={0.8}>
                  <Text style={{ fontSize: 24 }}>🎵</Text>
                  <AppText variant="captionBold" color={colors.secondary}>Your voice</AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.xpRow}>
                <View style={styles.xpBadge}>
                  <AppText variant="bodyBold" color={colors.white}>+{xpEarned} XP</AppText>
                </View>
                <AppText variant="caption" color={colors.muted}>Keep leveling up! 🚀</AppText>
              </View>

              <View style={[styles.srsBox, { backgroundColor: colors.infoLight }]}>
                <AppText variant="captionBold" color={colors.info}>
                  📦 SRS: {selfRating >= 4 ? 'Card promoted to next box!' : selfRating < 3 ? 'Card moved back to Box 1' : 'Card stays in current box'}
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base }}>
                <AppButton
                  label="🔁 Practice again"
                  onPress={() => { setStage('listen'); setRepeatCount(0); setRecordedUri(null); setSelfRating(0); setDurationHint(null); }}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
                <AppButton
                  label="Next phrase →"
                  onPress={nextPhrase}
                  style={{ flex: 1 }}
                />
              </View>
            </AppCard>
          )}

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Browse / list screen ──────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={['#5C5CE0', '#7B7BEA']}
        style={styles.headerGrad}
      >
        <AppText variant="h2" color={colors.white}>Shadowing</AppText>
        <AppText variant="caption" color="rgba(255,255,255,0.8)">
          {dueIds.length} phrases due · {sessionCount} done today
        </AppText>
        <AppButton
          label="🎲 Random due card"
          onPress={pickRandom}
          variant="secondary"
          size="sm"
          style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
        />
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, filterDiff === d && styles.chipActive]}
              onPress={() => setFilterDiff(d)}
            >
              <AppText
                variant="captionBold"
                color={filterDiff === d ? colors.white : colors.muted}
              >
                {d === 'All' ? 'All Levels' : `★`.repeat(parseInt(d))}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xs }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, filterCat === c && styles.chipActive]}
              onPress={() => setFilterCat(c)}
            >
              <AppText
                variant="captionBold"
                color={filterCat === c ? colors.white : colors.muted}
                style={{ textTransform: 'capitalize' }}
              >
                {c}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Phrase list */}
      <ScrollView contentContainerStyle={styles.listContent}>
        <AppText variant="caption" color={colors.muted} style={{ marginBottom: spacing.sm }}>
          {filteredPhrases.length} phrases — tap to practice
        </AppText>
        {filteredPhrases.map((phrase) => {
          const isDue = dueIds.includes(phrase.id);
          return (
            <TouchableOpacity
              key={phrase.id}
              style={styles.phraseRow}
              onPress={() => pickPhrase(phrase)}
              activeOpacity={0.82}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 }}>
                  {isDue && (
                    <View style={styles.dueDot} />
                  )}
                  <AppText variant="bodyBold" numberOfLines={1}>{phrase.english}</AppText>
                </View>
                <AppText variant="caption" color={colors.muted} numberOfLines={1}>
                  {phrase.pronunciation_es}
                </AppText>
              </View>
              <View style={styles.diffStars}>
                <AppText variant="micro" color={colors.muted}>
                  {'★'.repeat(phrase.difficulty)}{'☆'.repeat(5 - phrase.difficulty)}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
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
  filtersWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: Theme.radius.full,
    backgroundColor: colors.border,
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  listContent: {
    padding: spacing.base,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Theme.radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  dueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  diffStars: {
    marginLeft: spacing.sm,
  },
  // Detail
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  phraseCard: {
    marginBottom: spacing.base,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diffBadge: {
    borderRadius: Theme.radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pronBox: {
    backgroundColor: colors.secondaryLight,
    borderRadius: Theme.radius.md,
    padding: spacing.sm,
    marginTop: spacing.base,
  },
  actionCard: {
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  transcriptCard: {
    width: '100%',
    backgroundColor: colors.infoLight ?? colors.primarySurface,
    borderRadius: Theme.radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  ttsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ttsBtn: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: Theme.radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
  },
  ttsBtnActive: {
    opacity: 0.6,
  },
  micWrap: {
    marginVertical: spacing.base,
  },
  micBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    ...shadows.button,
  },
  micBtnRecording: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: spacing.sm,
  },
  hintBadge: {
    borderWidth: 1,
    borderRadius: Theme.radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
  },
  compareBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: Theme.radius.md,
    paddingVertical: spacing.sm,
  },
  compareDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  rateBtn: {
    width: 52,
    height: 60,
    borderRadius: Theme.radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rateActRow: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  xpBadge: {
    backgroundColor: colors.primary,
    borderRadius: Theme.radius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    ...shadows.button,
  },
  srsBox: {
    borderRadius: Theme.radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
});
