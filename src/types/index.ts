// ─────────────────────────────────────────────
//  LevelUp English — Shared Types
// ─────────────────────────────────────────────

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type PhraseCategory =
  | 'greeting'
  | 'interview'
  | 'workplace'
  | 'technical'
  | 'conversation'
  | 'pronunciation'
  | 'listening';

export interface Phrase {
  id: string;
  english: string;
  spanish: string;
  pronunciation_es: string; // e.g. "YÉS-ter-dei"
  tags: string[];
  difficulty: Difficulty;
  category: PhraseCategory;
  // Listening drill extras (optional)
  question?: string;
  options?: [string, string, string, string];
  answerIndex?: 0 | 1 | 2 | 3;
}

// ── SRS ──────────────────────────────────────
export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

export interface SRSCard {
  phraseId: string;
  box: LeitnerBox;
  nextReview: number; // epoch ms
  lastRating: number; // 1-5
}

// ── Session history ───────────────────────────
export interface ShadowingAttempt {
  phraseId: string;
  timestamp: number;
  selfRating: number; // 1-5
  audioUri?: string;
}

export interface ListeningAttempt {
  phraseId: string;
  timestamp: number;
  correct: boolean;
  chosenIndex: number;
}

export interface InterviewAttempt {
  phraseId: string;
  timestamp: number;
  audioUri?: string;
  scores: {
    clarity: number;
    structure: number;
    vocabulary: number;
    fluency: number;
    confidence: number;
  };
  total: number; // 0-25
  tips: string[];
}

// ── Gamification ─────────────────────────────
export interface UserStats {
  xp: number;
  level: number;
  coins: number;
  streak: number;
  longestStreak: number;
  lastActivityDate: string; // YYYY-MM-DD
  streakFreezeAvailable: number; // count
  totalMinutes: number;
  totalPhrases: number;
  totalInterviews: number;
  perfectLessons: number;
  achievements: string[]; // achievement IDs earned
  dailyChestClaimedDate: string; // YYYY-MM-DD
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  condition: (stats: UserStats) => boolean;
}

// ── Levels ───────────────────────────────────
export const LEVEL_NAMES: Record<number, string> = {
  1: 'Starter',
  2: 'Builder',
  3: 'Debugger',
  4: 'Architect',
  5: 'Senior',
  6: 'Principal',
  7: 'Staff',
  8: 'Distinguished',
};

export const XP_PER_LEVEL = 500; // XP needed per level

export function getLevelName(level: number): string {
  return LEVEL_NAMES[level] ?? `Level ${level}`;
}

export function getLevelFromXP(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function getXPInCurrentLevel(xp: number): number {
  return xp % XP_PER_LEVEL;
}

// ── Routine ──────────────────────────────────
export type RoutineType =
  | 'shadowing'
  | 'listening'
  | 'interview'
  | 'mixed'
  | 'custom';

export interface RoutineBlock {
  type: 'shadowing' | 'listening' | 'interview';
  minutes: number;
}

export interface DailyRoutine {
  type: RoutineType;
  blocks: RoutineBlock[];
  totalMinutes: number;
}
