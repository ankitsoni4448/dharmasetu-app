// ════════════════════════════════════════════════════════════════
// DharmaSetu — P4 Real Voice Input System
// FILE: app/utils/voiceInput.js
//
// P4 Architecture:
//   Phase 1 (current): expo-av recording → backend /voice/transcribe → text
//   Phase 2 (future):  @react-native-voice/voice for on-device STT
//
// Usage:
//   const rec = await startRecording(lang);   // starts mic
//   const text = await stopAndTranscribe(rec, lang); // stops + returns text
//
// Modal fallback always available if recording fails.
// ════════════════════════════════════════════════════════════════
import { Platform, Alert, Linking } from 'react-native';
import { Audio }                   from 'expo-av';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com';

// ── STATUS ENUM ─────────────────────────────────────────────────
export const VoiceStatus = Object.freeze({
  IDLE:             'idle',
  CHECKING:         'checking',
  PERMISSION_DENIED:'permission_denied',
  UNSUPPORTED:      'unsupported',
  READY:            'ready',
  RECORDING:        'recording',
  PROCESSING:       'processing',
  DONE:             'done',
  ERROR:            'error',
});

// ── AUDIO MODE SETUP ────────────────────────────────────────────
async function setRecordingMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS:  true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid:   true,
    playThroughEarpieceAndroid: false,
  });
}
async function setPlaybackMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    shouldDuckAndroid:  true,
  });
}

// ── PERMISSION ──────────────────────────────────────────────────
export async function checkPermission() {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status === 'granted') return VoiceStatus.READY;
    return VoiceStatus.PERMISSION_DENIED;
  } catch (e) {
    console.log('[Voice] Permission check failed:', e.message);
    return VoiceStatus.UNSUPPORTED;
  }
}

export async function canUseVoice() {
  try {
    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
}

export function showPermissionAlert(lang = 'hindi') {
  const isH = lang === 'hindi';
  Alert.alert(
    '🎤 ' + (isH ? 'माइक्रोफ़ोन अनुमति' : 'Microphone Permission'),
    isH
      ? 'DharmaSetu को Voice Input के लिए माइक्रोफ़ोन की अनुमति चाहिए।\n\nSettings → Apps → DharmaSetu → Permissions → Microphone'
      : 'DharmaSetu needs microphone access for voice input.\n\nSettings → Apps → DharmaSetu → Permissions → Microphone',
    [
      { text: isH ? 'रद्द करें' : 'Cancel', style: 'cancel' },
      { text: isH ? 'Settings खोलें' : 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}

export function getVoiceHint(lang = 'hindi', status = VoiceStatus.IDLE) {
  const isH = lang === 'hindi';
  switch (status) {
    case VoiceStatus.PERMISSION_DENIED: return isH ? 'माइक्रोफ़ोन अनुमति नहीं मिली' : 'Microphone permission denied';
    case VoiceStatus.RECORDING:         return isH ? '🔴 सुन रहा हूँ...' : '🔴 Listening...';
    case VoiceStatus.PROCESSING:        return isH ? '⏳ समझ रहा हूँ...' : '⏳ Processing...';
    case VoiceStatus.DONE:              return isH ? '✅ पहचान हो गई' : '✅ Recognized';
    case VoiceStatus.ERROR:             return isH ? '❌ पुनः प्रयास करें' : '❌ Try again';
    case VoiceStatus.READY:             return isH ? 'प्रश्न बोलें' : 'Speak your question';
    default:                            return isH ? 'माइक्रोफ़ोन टैप करें' : 'Tap microphone';
  }
}

// ── RECORDING ───────────────────────────────────────────────────
const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat?.MPEG_4 || 2,
    audioEncoder:  Audio.AndroidAudioEncoder?.AAC    || 3,
    sampleRate:    16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality?.MEDIUM || 2,
    sampleRate:   16000,
    numberOfChannels: 1,
    bitRate: 32000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

/**
 * Start recording audio.
 * @returns {{ recording: Audio.Recording, status: VoiceStatus }}
 */
export async function startRecording(lang = 'hindi') {
  try {
    const perm = await checkPermission();
    if (perm !== VoiceStatus.READY) {
      if (perm === VoiceStatus.PERMISSION_DENIED) showPermissionAlert(lang);
      return { recording: null, status: perm };
    }
    await setRecordingMode();
    const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
    return { recording, status: VoiceStatus.RECORDING };
  } catch (e) {
    console.log('[Voice] startRecording error:', e.message);
    return { recording: null, status: VoiceStatus.ERROR };
  }
}

/**
 * Stop recording and transcribe via backend.
 * Falls back gracefully — returns null on error (caller shows modal).
 *
 * @param {Audio.Recording} recording
 * @param {string} lang - 'hindi' | 'english'
 * @returns {string|null} - transcribed text or null
 */
export async function stopAndTranscribe(recording, lang = 'hindi') {
  if (!recording) return null;
  // Always reset audio mode — even if transcription fails
  try {
    await recording.stopAndUnloadAsync();
  } catch (e) {
    console.log('[Voice] stopAndUnload error (ignored):', e.message);
  } finally {
    try { await setPlaybackMode(); } catch {}
  }

  try {
    const uri = recording.getURI();
    if (!uri) return null;

    // Send to backend for transcription
    const formData = new FormData();
    formData.append('audio', {
      uri,
      name: 'voice.m4a',
      type: 'audio/m4a',
    });
    formData.append('lang', lang === 'hindi' ? 'hi-IN' : 'en-IN');

    // AbortSignal.timeout is not supported on Android Hermes — use AbortController
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${BACKEND}/voice/transcribe`, {
        method:  'POST',
        body:    formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        signal:  controller.signal,
      });
      if (!res.ok) {
        console.log('[Voice] Transcription failed:', res.status);
        return null;
      }
      const data = await res.json();
      return data.transcript || null;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (e) {
    console.log('[Voice] stopAndTranscribe error:', e.message);
    return null;
  }
}

/**
 * High-level entry point — handles full voice tap lifecycle.
 * Tries real STT, falls back to modal on failure.
 *
 * @param {object} opts
 * @param {string}   opts.lang
 * @param {Function} opts.onOpenModal   - fallback: open text modal
 * @param {Function} opts.onResult      - called with transcribed text
 * @param {Function} opts.onStatus      - called with VoiceStatus updates
 */
export async function handleVoiceTap({ lang = 'hindi', onOpenModal, onResult, onStatus } = {}) {
  const emit = (s) => { if (typeof onStatus === 'function') onStatus(s); };
  emit(VoiceStatus.CHECKING);

  const perm = await checkPermission();
  if (perm === VoiceStatus.PERMISSION_DENIED) { showPermissionAlert(lang); emit(VoiceStatus.PERMISSION_DENIED); return; }
  if (perm === VoiceStatus.UNSUPPORTED)       { if (onOpenModal) onOpenModal(); return; }

  emit(VoiceStatus.RECORDING);
  const { recording, status } = await startRecording(lang);
  if (!recording || status !== VoiceStatus.RECORDING) {
    emit(VoiceStatus.ERROR);
    if (typeof onOpenModal === 'function') onOpenModal();
    return;
  }

  // Auto-stop after 8 seconds to prevent runaway recording
  const autoStop = setTimeout(async () => {
    try { await recording.stopAndUnloadAsync(); } catch {}
  }, 8000);

  // Return recording handle so caller can stop it manually
  return {
    recording,
    stop: async () => {
      clearTimeout(autoStop);
      emit(VoiceStatus.PROCESSING);
      const text = await stopAndTranscribe(recording, lang);
      if (text && typeof onResult === 'function') {
        emit(VoiceStatus.DONE);
        onResult(text);
      } else {
        emit(VoiceStatus.ERROR);
        // Fallback to modal
        if (typeof onOpenModal === 'function') onOpenModal();
      }
    },
  };
}
