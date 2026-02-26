/**
 * STTService — thin wrapper around expo-speech-recognition.
 *
 * In Expo Go the native module doesn't exist, so require() throws at import
 * time before any try/catch can help. We load the library dynamically here
 * once and export safe stubs when it isn't available.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
type STTEventCallback = (ev: any) => void;
type UseSTTEventFn = (event: string, listener: STTEventCallback) => void;

interface STTModuleShape {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options?: object) => void;
  stop: () => void;
}

// ── Load native library (safe) ────────────────────────────────────────────────
let _module: STTModuleShape | null = null;
// no-op hook — same signature as the real one; does nothing in Expo Go
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _useEvent: UseSTTEventFn = (_event: string, _listener: STTEventCallback) => {};

try {
  // Dynamic require keeps the static analyser from pre-resolving the native module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const lib = require('expo-speech-recognition') as {
    ExpoSpeechRecognitionModule: STTModuleShape;
    useSpeechRecognitionEvent: UseSTTEventFn;
  };
  _module = lib.ExpoSpeechRecognitionModule;
  _useEvent = lib.useSpeechRecognitionEvent;
} catch {
  // Expo Go — native module absent; _module stays null, _useEvent stays no-op
}

// ── Public exports ────────────────────────────────────────────────────────────
/** True only when the native STT module is available (i.e. in a dev/prod build). */
export const sttAvailable = _module !== null;

/** Safe wrapper — no-ops when native module is absent. */
export const STTModule: STTModuleShape = _module ?? {
  requestPermissionsAsync: async () => ({ granted: false }),
  start: () => {},
  stop: () => {},
};

/**
 * Drop-in for `useSpeechRecognitionEvent` from expo-speech-recognition.
 * In Expo Go this is a no-op hook (still called every render — hooks rules satisfied).
 */
export const useSTTEvent: UseSTTEventFn = _useEvent;
