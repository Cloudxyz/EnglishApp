import StorageService from './StorageService';
import { UserStats, Achievement, getLevelFromXP } from '../types';

// ── XP rewards ────────────────────────────────
export const XP_REWARDS = {
  shadowing_complete: 15,
  shadowing_perfect: 30,
  listening_correct: 10,
  listening_incorrect: 3,
  interview_complete: 40,
  interview_perfect: 80,
  daily_chest: 50,
  streak_bonus: 20,
};

// ── Achievements ──────────────────────────────
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'rising_star',
    title: 'Rising Star',
    description: 'Complete your first shadowing session',
    icon: '⭐',
    xpReward: 100,
    condition: (s) => s.totalPhrases >= 1,
  },
  {
    id: 'milestone_7',
    title: 'Milestone Master',
    description: '7-day streak',
    icon: '🏅',
    xpReward: 200,
    condition: (s) => s.streak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Persistence Pays',
    description: '30-day streak',
    icon: '🥇',
    xpReward: 500,
    condition: (s) => s.streak >= 30,
  },
  {
    id: 'quick_learner',
    title: 'Quick Learner',
    description: 'Complete 10 listening drills',
    icon: '🧠',
    xpReward: 150,
    condition: (s) => s.totalPhrases >= 10,
  },
  {
    id: '100_phrases',
    title: 'Century',
    description: 'Shadow 100 phrases',
    icon: '💯',
    xpReward: 400,
    condition: (s) => s.totalPhrases >= 100,
  },
  {
    id: '10_interviews',
    title: 'Interview Pro',
    description: 'Complete 10 interview simulations',
    icon: '💼',
    xpReward: 300,
    condition: (s) => s.totalInterviews >= 10,
  },
  {
    id: 'fluency_fanatic',
    title: 'Fluency Fanatic',
    description: '200 total learning minutes',
    icon: '🚀',
    xpReward: 350,
    condition: (s) => s.totalMinutes >= 200,
  },
];

// ── Streak logic ──────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const RewardsService = {
  async addXP(amount: number): Promise<UserStats> {
    const stats = await StorageService.getStats();
    const newXP = stats.xp + amount;
    const newLevel = getLevelFromXP(newXP);
    return StorageService.updateStats({ xp: newXP, level: newLevel });
  },

  async addCoins(amount: number): Promise<UserStats> {
    const stats = await StorageService.getStats();
    return StorageService.updateStats({ coins: stats.coins + amount });
  },

  /**
   * Call after any training activity. Handles streak, daily chest, achievements.
   * Returns list of newly earned achievement IDs.
   */
  async recordActivity(minutesSpent: number): Promise<{ newAchievements: string[] }> {
    const today = todayStr();
    const yesterday = yesterdayStr();
    let stats = await StorageService.getStats();

    // ── Streak ──────────────────────────────
    let streak = stats.streak;
    if (stats.lastActivityDate === today) {
      // already logged today — just accumulate minutes
    } else if (stats.lastActivityDate === yesterday) {
      streak += 1;
    } else if (stats.lastActivityDate !== today) {
      // Streak broken — check freeze
      if (stats.streakFreezeAvailable > 0 && stats.lastActivityDate === yesterday) {
        // already handled above
      } else {
        streak = 1;
      }
    }

    const longestStreak = Math.max(stats.longestStreak, streak);

    // ── Minutes ──────────────────────────────
    const totalMinutes = stats.totalMinutes + minutesSpent;

    // ── Daily chest (>=10 min today) ─────────
    let dailyChestClaimedDate = stats.dailyChestClaimedDate;
    let xpBonus = 0;
    let coinsBonus = 0;
    if (totalMinutes >= 10 && dailyChestClaimedDate !== today) {
      dailyChestClaimedDate = today;
      xpBonus += XP_REWARDS.daily_chest;
      coinsBonus += 10;
    }

    // ── Streak XP bonus ──────────────────────
    if (streak > 0 && stats.lastActivityDate !== today) {
      xpBonus += XP_REWARDS.streak_bonus;
    }

    const newXP = stats.xp + xpBonus;
    const newLevel = getLevelFromXP(newXP);

    const updatedStats: UserStats = {
      ...stats,
      xp: newXP,
      level: newLevel,
      coins: stats.coins + coinsBonus,
      streak,
      longestStreak,
      lastActivityDate: today,
      totalMinutes,
      dailyChestClaimedDate,
    };

    // ── Check achievements ────────────────────
    const newAchievements: string[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (!updatedStats.achievements.includes(ach.id) && ach.condition(updatedStats)) {
        updatedStats.achievements.push(ach.id);
        updatedStats.xp += ach.xpReward;
        updatedStats.coins += 5;
        updatedStats.level = getLevelFromXP(updatedStats.xp);
        newAchievements.push(ach.id);
      }
    }

    await StorageService.saveStats(updatedStats);
    return { newAchievements };
  },

  async useStreakFreeze(): Promise<boolean> {
    const stats = await StorageService.getStats();
    if (stats.streakFreezeAvailable <= 0) return false;
    await StorageService.updateStats({
      streakFreezeAvailable: stats.streakFreezeAvailable - 1,
    });
    return true;
  },

  // Reset weekly freeze allowance (call on app start if new week)
  async refreshWeeklyFreeze(): Promise<void> {
    // simplified: just ensure at least 1 available
    const stats = await StorageService.getStats();
    if (stats.streakFreezeAvailable === 0) {
      await StorageService.updateStats({ streakFreezeAvailable: 1 });
    }
  },

  /**
   * Simple heuristic tips for interview feedback (no external AI)
   */
  generateInterviewTips(scores: {
    clarity: number;
    structure: number;
    vocabulary: number;
    fluency: number;
    confidence: number;
  }): string[] {
    const tips: string[] = [];
    if (scores.clarity < 3) tips.push('Speak more clearly — pause between key ideas.');
    if (scores.structure < 3) tips.push('Use STAR format: Situation → Task → Action → Result.');
    if (scores.vocabulary < 3) tips.push('Vary your word choice; avoid repeating the same word.');
    if (scores.fluency < 3) tips.push('Reduce filler words ("um", "like") — take a breath first.');
    if (scores.confidence < 3) tips.push('Project your voice and finish sentences fully.');
    if (tips.length === 0) tips.push('Great job! Focus on speed — try answering in under 60s next time.');
    if (tips.length < 2) tips.push('Record yourself and compare to a native speaker answer.');
    return tips.slice(0, 2);
  },
};

export default RewardsService;
