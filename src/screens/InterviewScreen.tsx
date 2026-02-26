// ─────────────────────────────────────────────
//  LevelUp English — Interview Screen
//  Think time + Record + Rubric + Feedback
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
import { Phrase, InterviewAttempt } from '../types';
import TTSService from '../services/TTSService';
import AudioService from '../services/AudioService';
import StorageService from '../services/StorageService';
import RewardsService, { XP_REWARDS } from '../services/RewardsService';


const { colors, spacing, radius, typography, shadows } = Theme;

type Stage = 'pick' | 'think' | 'record' | 'rubric' | 'result';

const THINK_TIME = 20;  // seconds
const MAX_RECORD = 75;  // seconds

const CRITERIA = [
  { key: 'clarity' as const, label: 'Clarity', icon: '💬', desc: 'Are your ideas easy to understand?' },
  { key: 'structure' as const, label: 'Structure', icon: '🏗️', desc: 'Do you use Situation → Task → Action → Result?' },
  { key: 'vocabulary' as const, label: 'Vocabulary', icon: '📚', desc: 'Are you using varied, technical words?' },
  { key: 'fluency' as const, label: 'Fluency', icon: '🌊', desc: 'Is your speech flowing without too many pauses?' },
  { key: 'confidence' as const, label: 'Confidence', icon: '💪', desc: 'Do you sound sure and assertive?' },
];

function ScoreBadge({ score }: { score: number }) {
  const pct = (score / 25) * 100;
  const color = pct >= 80 ? colors.success : pct >= 60 ? colors.warning : colors.danger;
  return (
    <CircularProgress
      progress={score / 25}
      size={110}
      color={color}
      trackColor={colors.border}
      label={`${score}/25`}
      sublabel={pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good job!' : 'Keep training!'}
    />
  );
}

export default function InterviewScreen() {
  const allPhrases = phrasesData as Phrase[];
  const interviewPhrases = allPhrases.filter(p => p.category === 'interview' || p.category === 'technical');

  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [stage, setStage] = useState<Stage>('pick');
  const [thinkLeft, setThinkLeft] = useState(THINK_TIME);
  const [recordLeft, setRecordLeft] = useState(MAX_RECORD);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [scores, setScores] = useState({ clarity: 3, structure: 3, vocabulary: 3, fluency: 3, confidence: 3 });
  const [tips, setTips] = useState<string[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const thinkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(useCallback(() => {
    loadAttemptCount();
    return () => {
      stopTimers();
      TTSService.stop();
      AudioService.stopPlayback();
    };
  }, []));

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const loadAttemptCount = async () => {
    const h = await StorageService.getInterviewHistory();
    setAttemptCount(h.length);
  };

  const stopTimers = () => {
    if (thinkTimer.current) { clearInterval(thinkTimer.current); thinkTimer.current = null; }
    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
  };

  const pickRandom = () => {
    const p = interviewPhrases[Math.floor(Math.random() * interviewPhrases.length)];
    setCurrentPhrase(p);
    setStage('think');
    setThinkLeft(THINK_TIME);
    setRecordLeft(MAX_RECORD);
    setRecordedUri(null);
    setScores({ clarity: 3, structure: 3, vocabulary: 3, fluency: 3, confidence: 3 });
    setTips([]);
    setTotalScore(0);

    // start think countdown
    stopTimers();
    thinkTimer.current = setInterval(() => {
      setThinkLeft(t => {
        if (t <= 1) {
          stopTimers();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const listenQuestion = async () => {
    if (currentPhrase) await TTSService.speakNormal(currentPhrase.english);
  };

  const startRecording = async () => {
    stopTimers();
    const ok = await AudioService.requestPermissions();
    if (!ok) {
      Alert.alert('No microphone', 'Grant microphone permission to record your answer.');
      return;
    }
    setIsRecording(true);
    setStage('record');
    setRecordLeft(MAX_RECORD);
    await AudioService.startRecording();

    recordTimer.current = setInterval(() => {
      setRecordLeft(t => {
        if (t <= 1) {
          stopRecording();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const stopRecording = async () => {
    stopTimers();
    setIsRecording(false);
    const result = await AudioService.stopRecording();
    if (result) setRecordedUri(result.uri);
    setStage('rubric');
  };

  const playback = async () => {
    if (recordedUri) await AudioService.playUri(recordedUri);
  };

  const submitRubric = async () => {
    const total = Object.values(scores).reduce((sum, v) => sum + v, 0);
    const generated = RewardsService.generateInterviewTips(scores);
    setTotalScore(total);
    setTips(generated);
    setStage('result');

    // XP
    const xp = total >= 20 ? XP_REWARDS.interview_perfect : XP_REWARDS.interview_complete;
    await RewardsService.addXP(xp);
    setXpEarned(xp);

    // Save attempt
    const attempt: InterviewAttempt = {
      phraseId: currentPhrase?.id ?? '',
      timestamp: Date.now(),
      audioUri: recordedUri ?? undefined,
      scores: { ...scores },
      total,
      tips: generated,
    };
    await StorageService.addInterviewAttempt(attempt);
    const stats = await StorageService.getStats();
    await StorageService.updateStats({ totalInterviews: stats.totalInterviews + 1 });
    await RewardsService.recordActivity(5);
    setAttemptCount(c => c + 1);
  };

  const reset = () => {
    stopTimers();
    TTSService.stop();
    AudioService.stopPlayback();
    setCurrentPhrase(null);
    setStage('pick');
    setRecordedUri(null);
    setScores({ clarity: 3, structure: 3, vocabulary: 3, fluency: 3, confidence: 3 });
  };

  // ── Pick stage ───────────────────────────
  if (stage === 'pick') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={['#FF8B3E', '#E06010']} style={styles.headerGrad}>
          <AppText variant="h2" color={colors.white}>Interview Simulator</AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.8)">
            {attemptCount} sessions completed · Tech & Workplace English
          </AppText>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.infoCard}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: spacing.sm }}>💼</Text>
            <AppText variant="h4" center>How it works</AppText>
            <View style={styles.stepList}>
              {[
                ['⏱️ 20s', 'Think time — read & plan your answer'],
                ['🎙️ 75s', 'Record your answer out loud'],
                ['📊 Rate', 'Self-evaluate on 5 criteria'],
                ['💡 Tips', 'Get 2 personalized improvement tips'],
              ].map(([badge, desc], i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <AppText variant="captionBold" color={colors.secondary}>{badge}</AppText>
                  </View>
                  <AppText variant="body" style={{ flex: 1 }}>{desc}</AppText>
                </View>
              ))}
            </View>
          </AppCard>

          <AppText variant="h4" style={styles.sectionTitle}>Sample Questions</AppText>
          {interviewPhrases.slice(0, 5).map(p => (
            <AppCard key={p.id} style={styles.qPreview}>
              <AppText variant="body" numberOfLines={2}>{p.english}</AppText>
              <AppText variant="micro" color={colors.muted} style={{ marginTop: 4 }}>{p.category}</AppText>
            </AppCard>
          ))}

          <AppButton
            label="🎲 Start Random Question"
            onPress={pickRandom}
            size="lg"
            fullWidth
            style={{ margin: spacing.base }}
          />
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Think stage ──────────────────────────
  if (stage === 'think' && currentPhrase) {
    const pct = thinkLeft / THINK_TIME;
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={reset} style={styles.closeBtn}>
            <Text>✕</Text>
          </TouchableOpacity>
          <AppText variant="captionBold" color={colors.muted}>Think Time</AppText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.content, { alignItems: 'center' }]}>
          <CircularProgress
            progress={pct}
            size={120}
            color={colors.warning}
            label={`${thinkLeft}s`}
            sublabel="Think!"
          />

          <AppCard style={[styles.questionCard, { marginTop: spacing.xl }]}>
            <View style={styles.qCategoryBadge}>
              <AppText variant="micro" color={colors.secondary}>{currentPhrase.category.toUpperCase()}</AppText>
            </View>
            <AppText variant="h3" center style={{ marginTop: spacing.sm }}>
              {currentPhrase.english}
            </AppText>
            <AppText variant="caption" color={colors.muted} center style={{ marginTop: spacing.xs }}>
              {currentPhrase.spanish}
            </AppText>
          </AppCard>

          <TouchableOpacity style={styles.listenBtn} onPress={listenQuestion}>
            <Text style={{ fontSize: 22 }}>🔊</Text>
            <AppText variant="captionBold" color={colors.primary} style={{ marginLeft: spacing.xs }}>
              Listen to question
            </AppText>
          </TouchableOpacity>

          <AppText variant="caption" color={colors.muted} center style={{ marginTop: spacing.xl, marginBottom: spacing.base }}>
            Use STAR format: Situation → Task → Action → Result
          </AppText>

          <AppButton
            label="🎙️ Start Recording"
            onPress={startRecording}
            size="lg"
            style={{ minWidth: 240 }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Record stage ─────────────────────────
  if (stage === 'record' && currentPhrase) {
    const pct = recordLeft / MAX_RECORD;
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={reset} style={styles.closeBtn}><Text>✕</Text></TouchableOpacity>
          <AppText variant="captionBold" color={colors.muted}>Recording</AppText>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.recordContent}>
          <AppCard style={styles.questionCard}>
            <AppText variant="h4" center>{currentPhrase.english}</AppText>
          </AppCard>

          <CircularProgress
            progress={pct}
            size={130}
            color={isRecording ? colors.danger : colors.primary}
            trackColor={colors.border}
            label={`${recordLeft}s`}
            sublabel={isRecording ? 'Recording' : 'Done'}
          />

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.bigMicBtn, !isRecording && { backgroundColor: colors.successLight, borderColor: colors.success }]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 44 }}>{isRecording ? '⏹' : '🎙️'}</Text>
            </TouchableOpacity>
          </Animated.View>

          <AppText variant="captionBold" color={isRecording ? colors.danger : colors.muted} center>
            {isRecording ? '● Tap to stop recording' : 'Tap to record'}
          </AppText>

          <ProgressBar progress={1 - pct} color={colors.danger} height={6} style={{ width: '80%', marginTop: spacing.base }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Rubric stage ─────────────────────────
  if (stage === 'rubric') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={reset} style={styles.closeBtn}><Text>✕</Text></TouchableOpacity>
          <AppText variant="captionBold" color={colors.muted}>Self Evaluation</AppText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <AppText variant="h4" center style={{ marginBottom: spacing.xs }}>Rate your answer (1–5)</AppText>
          <AppText variant="caption" color={colors.muted} center style={{ marginBottom: spacing.base }}>
            Be honest — this trains your metacognition!
          </AppText>

          {recordedUri && (
            <TouchableOpacity style={styles.playbackBtn} onPress={playback}>
              <Text style={{ fontSize: 22 }}>🎵</Text>
              <AppText variant="captionBold" color={colors.primary} style={{ marginLeft: spacing.xs }}>
                Listen to your answer
              </AppText>
            </TouchableOpacity>
          )}


          {CRITERIA.map(({ key, label, icon, desc }) => (
            <AppCard key={key} style={styles.criterionCard}>
              <View style={styles.criterionHeader}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <AppText variant="bodyBold">{label}</AppText>
                  <AppText variant="micro" color={colors.muted}>{desc}</AppText>
                </View>
                <View style={styles.scoreDisplay}>
                  <AppText variant="h3" color={colors.primary}>{scores[key]}</AppText>
                  <AppText variant="micro" color={colors.muted}>/5</AppText>
                </View>
              </View>

              <View style={styles.scoreRow}>
                {[1, 2, 3, 4, 5].map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.scoreBtn,
                      scores[key] >= v && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setScores(s => ({ ...s, [key]: v }))}
                  >
                    <Text style={{ color: scores[key] >= v ? colors.white : colors.muted, fontWeight: '700' }}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </AppCard>
          ))}

          <AppButton
            label={`Submit — ${Object.values(scores).reduce((a, b) => a + b, 0)}/25 pts`}
            onPress={submitRubric}
            size="lg"
            fullWidth
            style={{ marginTop: spacing.base }}
          />
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Result stage ─────────────────────────
  if (stage === 'result') {
    const pct = Math.round((totalScore / 25) * 100);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient
          colors={pct >= 80 ? ['#4CD97B', '#2EB860'] : pct >= 60 ? ['#FFD93D', '#F0C020'] : ['#FF4757', '#CC0020']}
          style={styles.resultGrad}
        >
          <Text style={{ fontSize: 56 }}>🏆</Text>
          <AppText variant="h2" color={colors.white} center style={{ marginTop: spacing.sm }}>
            {pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good Job!' : 'Keep Practicing!'}
          </AppText>
          <AppText variant="body" color="rgba(255,255,255,0.85)" center>
            Score: {totalScore}/25 ({pct}%)
          </AppText>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Score breakdown */}
          <AppCard style={{ marginBottom: spacing.base }}>
            <AppText variant="h4" style={{ marginBottom: spacing.sm }}>Breakdown</AppText>
            {CRITERIA.map(({ key, label, icon }) => (
              <View key={key} style={styles.breakdownRow}>
                <Text>{icon}</Text>
                <AppText variant="body" style={{ flex: 1, marginLeft: spacing.sm }}>{label}</AppText>
                <ProgressBar
                  progress={scores[key] / 5}
                  height={8}
                  style={{ width: 80 }}
                  color={scores[key] >= 4 ? colors.success : scores[key] <= 2 ? colors.danger : colors.warning}
                />
                <AppText variant="captionBold" color={colors.muted} style={{ marginLeft: spacing.sm, width: 24 }}>
                  {scores[key]}/5
                </AppText>
              </View>
            ))}
          </AppCard>

          {/* XP earned */}
          <AppCard style={[styles.xpCard, { backgroundColor: colors.primarySurface }]}>
            <AppText variant="h4" color={colors.primary} center>+{xpEarned} XP earned! 🚀</AppText>
            <AppText variant="caption" color={colors.muted} center>Keep leveling up your interview skills!</AppText>
          </AppCard>

          {/* Tips */}
          <AppText variant="h4" style={styles.sectionTitle}>💡 Improvement Tips</AppText>
          {tips.map((tip, i) => (
            <AppCard key={i} style={styles.tipCard}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Text style={{ fontSize: 20 }}>{i === 0 ? '1️⃣' : '2️⃣'}</Text>
                <AppText variant="body" style={{ flex: 1 }}>{tip}</AppText>
              </View>
            </AppCard>
          ))}


          {/* Playback */}
          {recordedUri && (
            <TouchableOpacity style={styles.playbackBtn} onPress={playback}>
              <Text style={{ fontSize: 22 }}>🎵</Text>
              <AppText variant="captionBold" color={colors.primary} style={{ marginLeft: spacing.xs }}>
                Listen to your answer again
              </AppText>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base }}>
            <AppButton label="Try Another" onPress={pickRandom} style={{ flex: 1 }} />
            <AppButton label="Back" onPress={reset} variant="secondary" style={{ flex: 1 }} />
          </View>
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  infoCard: { marginBottom: spacing.base },
  stepList: { marginTop: spacing.sm, gap: spacing.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    backgroundColor: colors.secondaryLight,
    borderRadius: Theme.radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 56,
    alignItems: 'center',
  },
  sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.base },
  qPreview: { marginBottom: spacing.sm },
  questionCard: {
    width: '100%',
    marginHorizontal: 0,
    marginBottom: spacing.xl,
  },
  qCategoryBadge: {
    alignSelf: 'center',
    backgroundColor: colors.secondaryLight,
    borderRadius: Theme.radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: Theme.radius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginTop: spacing.base,
  },
  recordContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    padding: spacing.base,
  },
  bigMicBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.dangerLight,
    borderWidth: 3,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  playbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: Theme.radius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.base,
  },
  criterionCard: { marginBottom: spacing.sm },
  criterionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  scoreBtn: {
    width: 44,
    height: 36,
    borderRadius: Theme.radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultGrad: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  xpCard: {
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  tipCard: { marginBottom: spacing.sm },
});
