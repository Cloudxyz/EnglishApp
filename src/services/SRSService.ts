/**
 * Leitner SRS — 5 boxes
 * Review intervals: box1=1d, box2=3d, box3=7d, box4=14d, box5=30d
 */
import { SRSCard, LeitnerBox } from '../types';
import StorageService from './StorageService';

const BOX_INTERVALS_MS: Record<LeitnerBox, number> = {
  1: 1 * 24 * 60 * 60 * 1000,
  2: 3 * 24 * 60 * 60 * 1000,
  3: 7 * 24 * 60 * 60 * 1000,
  4: 14 * 24 * 60 * 60 * 1000,
  5: 30 * 24 * 60 * 60 * 1000,
};

export const SRSService = {
  async getOrCreateCard(phraseId: string): Promise<SRSCard> {
    const cards = await StorageService.getSRSCards();
    const existing = cards.find((c) => c.phraseId === phraseId);
    if (existing) return existing;
    const newCard: SRSCard = {
      phraseId,
      box: 1,
      nextReview: Date.now(),
      lastRating: 0,
    };
    cards.push(newCard);
    await StorageService.saveSRSCards(cards);
    return newCard;
  },

  /**
   * Rate a card 1–5.
   * >=4 → promote box, <3 → demote to box 1
   */
  async rateCard(phraseId: string, rating: number): Promise<SRSCard> {
    const cards = await StorageService.getSRSCards();
    const idx = cards.findIndex((c) => c.phraseId === phraseId);
    let card: SRSCard;
    if (idx === -1) {
      card = { phraseId, box: 1, nextReview: Date.now(), lastRating: rating };
      cards.push(card);
    } else {
      card = cards[idx];
    }

    card.lastRating = rating;
    if (rating >= 4) {
      card.box = Math.min(5, (card.box + 1)) as LeitnerBox;
    } else if (rating < 3) {
      card.box = 1;
    }
    card.nextReview = Date.now() + BOX_INTERVALS_MS[card.box];

    if (idx === -1) {
      // already added above
    } else {
      cards[idx] = card;
    }
    await StorageService.saveSRSCards(cards);
    return card;
  },

  async getDueCards(phraseIds: string[]): Promise<string[]> {
    const cards = await StorageService.getSRSCards();
    const now = Date.now();
    const cardMap = new Map(cards.map((c) => [c.phraseId, c]));
    return phraseIds.filter((id) => {
      const c = cardMap.get(id);
      return !c || c.nextReview <= now;
    });
  },

  async getAllCards(): Promise<SRSCard[]> {
    return StorageService.getSRSCards();
  },
};

export default SRSService;
