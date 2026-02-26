import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, SRSCard, ShadowingAttempt, ListeningAttempt, InterviewAttempt } from '../types';

const KEYS = {
  USER_STATS: '@lu_user_stats',
  SRS_CARDS: '@lu_srs_cards',
  SHADOWING_HISTORY: '@lu_shadowing',
  LISTENING_HISTORY: '@lu_listening',
  INTERVIEW_HISTORY: '@lu_interview',
  DAILY_ROUTINE: '@lu_daily_routine',
};

const DEFAULT_STATS: UserStats = {
  xp: 0,
  level: 1,
  coins: 0,
  streak: 0,
  longestStreak: 0,
  lastActivityDate: '',
  streakFreezeAvailable: 1,
  totalMinutes: 0,
  totalPhrases: 0,
  totalInterviews: 0,
  perfectLessons: 0,
  achievements: [],
  dailyChestClaimedDate: '',
};

// ── Generic helpers ───────────────────────────
async function get<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function set<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ── Public API ────────────────────────────────
export const StorageService = {
  // User stats
  async getStats(): Promise<UserStats> {
    return get(KEYS.USER_STATS, DEFAULT_STATS);
  },
  async saveStats(stats: UserStats): Promise<void> {
    return set(KEYS.USER_STATS, stats);
  },
  async updateStats(patch: Partial<UserStats>): Promise<UserStats> {
    const current = await StorageService.getStats();
    const next = { ...current, ...patch };
    await StorageService.saveStats(next);
    return next;
  },

  // SRS cards
  async getSRSCards(): Promise<SRSCard[]> {
    return get<SRSCard[]>(KEYS.SRS_CARDS, []);
  },
  async saveSRSCards(cards: SRSCard[]): Promise<void> {
    return set(KEYS.SRS_CARDS, cards);
  },

  // Shadowing history
  async getShadowingHistory(): Promise<ShadowingAttempt[]> {
    return get<ShadowingAttempt[]>(KEYS.SHADOWING_HISTORY, []);
  },
  async addShadowingAttempt(attempt: ShadowingAttempt): Promise<void> {
    const history = await StorageService.getShadowingHistory();
    history.unshift(attempt);
    return set(KEYS.SHADOWING_HISTORY, history.slice(0, 500)); // cap at 500
  },

  // Listening history
  async getListeningHistory(): Promise<ListeningAttempt[]> {
    return get<ListeningAttempt[]>(KEYS.LISTENING_HISTORY, []);
  },
  async addListeningAttempt(attempt: ListeningAttempt): Promise<void> {
    const history = await StorageService.getListeningHistory();
    history.unshift(attempt);
    return set(KEYS.LISTENING_HISTORY, history.slice(0, 500));
  },

  // Interview history
  async getInterviewHistory(): Promise<InterviewAttempt[]> {
    return get<InterviewAttempt[]>(KEYS.INTERVIEW_HISTORY, []);
  },
  async addInterviewAttempt(attempt: InterviewAttempt): Promise<void> {
    const history = await StorageService.getInterviewHistory();
    history.unshift(attempt);
    return set(KEYS.INTERVIEW_HISTORY, history.slice(0, 200));
  },

  // Daily routine type
  async getDailyRoutineType(): Promise<string> {
    return get<string>(KEYS.DAILY_ROUTINE, 'mixed');
  },
  async saveDailyRoutineType(type: string): Promise<void> {
    return set(KEYS.DAILY_ROUTINE, type);
  },

  // Clear all (reset)
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};

export default StorageService;
