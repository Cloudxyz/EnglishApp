// TranscriptionService is retired — logic moved to LocalScoringService.
// This file is kept to avoid breaking any stale imports.
export { wordSimilarity } from './LocalScoringService';

// @deprecated — use LocalScoringService instead
export async function transcribeAudio(_uri: string): Promise<string> {
  throw new Error('transcribeAudio removed — use LocalScoringService');
}
