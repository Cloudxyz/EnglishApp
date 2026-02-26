import * as Speech from 'expo-speech';

export interface TTSOptions {
  rate?: number;       // 0.6–1.0
  pitch?: number;
  language?: string;
  repeatCount?: number;
  pauseMs?: number;
}

const DEFAULT_OPTIONS: Required<TTSOptions> = {
  rate: 0.9,
  pitch: 1.0,
  language: 'en-US',
  repeatCount: 1,
  pauseMs: 800,
};

let _stopRequested = false;

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export const TTSService = {
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    _stopRequested = false;

    for (let i = 0; i < opts.repeatCount; i++) {
      if (_stopRequested) break;
      await new Promise<void>((resolve, reject) => {
        Speech.speak(text, {
          rate: opts.rate,
          pitch: opts.pitch,
          language: opts.language,
          onDone: resolve,
          onError: reject,
        });
      });
      if (i < opts.repeatCount - 1 && !_stopRequested) {
        await sleep(opts.pauseMs);
      }
    }
  },

  async speakNormal(text: string, repeat = 1): Promise<void> {
    return TTSService.speak(text, { rate: 0.9, repeatCount: repeat, pauseMs: 800 });
  },

  async speakSlow(text: string, repeat = 1): Promise<void> {
    return TTSService.speak(text, { rate: 0.6, repeatCount: repeat, pauseMs: 1200 });
  },

  stop(): void {
    _stopRequested = true;
    Speech.stop();
  },

  async isSpeaking(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  },
};

export default TTSService;
