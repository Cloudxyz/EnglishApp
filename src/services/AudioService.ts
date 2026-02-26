import {
  AudioModule,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

/** Recording options optimised for Whisper transcription.
 *  iOS  → LinearPCM / WAV  (whisper.cpp reads natively via dr_wav)
 *  Android → AAC in MP4 mono (best available without WAV support in MediaRecorder)
 */
function buildPlatformOptions(_preset: typeof RecordingPresets.HIGH_QUALITY) {
  if (Platform.OS === 'ios') {
    return {
      extension: '.wav',
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,
      outputFormat: 'lpcm',       // IOSOutputFormat.LINEARPCM
      audioQuality: 127,          // AudioQuality.MAX
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
      isMeteringEnabled: false,
    };
  }
  // Android – MediaRecorder cannot produce WAV; use mono AAC in MP4
  // outputFormat and audioEncoder must match the string enum values from expo-audio
  return {
    extension: '.mp4',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    outputFormat: 'mpeg4',   // AndroidOutputFormat enum string value
    audioEncoder: 'aac',     // AndroidAudioEncoder enum string value
    isMeteringEnabled: false,
  };
}

let _recorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;
let _player: AudioPlayer | null = null;

export const AudioService = {
  // ── Permissions ────────────────────────────
  async requestPermissions(): Promise<boolean> {
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
  },

  // ── Recording ─────────────────────────────
  async startRecording(): Promise<void> {
    try {
      await AudioService.requestPermissions();
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      const platformOptions = buildPlatformOptions(RecordingPresets.HIGH_QUALITY);
      const recorder = new AudioModule.AudioRecorder(platformOptions);
      await recorder.prepareToRecordAsync();
      recorder.record();
      _recorder = recorder;
    } catch (e) {
      console.warn('AudioService.startRecording error:', e);
    }
  },

  async stopRecording(): Promise<RecordingResult | null> {
    if (!_recorder) return null;
    try {
      const status = _recorder.getStatus();
      await _recorder.stop();
      const uri = _recorder.uri ?? '';
      const durationMs = status.durationMillis ?? 0;
      _recorder.release();
      _recorder = null;
      await setAudioModeAsync({ allowsRecording: false });
      return { uri, durationMs };
    } catch (e) {
      console.warn('AudioService.stopRecording error:', e);
      _recorder?.release();
      _recorder = null;
      return null;
    }
  },

  isRecording(): boolean {
    return _recorder !== null;
  },

  // ── Playback ───────────────────────────────
  async playUri(uri: string): Promise<void> {
    await AudioService.stopPlayback();
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      const player = createAudioPlayer({ uri });
      _player = player;
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          player.remove();
          if (_player === player) _player = null;
        }
      });
      player.play();
    } catch (e) {
      console.warn('AudioService.playUri error:', e);
    }
  },

  async stopPlayback(): Promise<void> {
    if (_player) {
      try {
        _player.pause();
        _player.remove();
      } catch {}
      _player = null;
    }
  },

  // ── File utils ─────────────────────────────
  async deleteFile(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {}
  },
};

export default AudioService;
