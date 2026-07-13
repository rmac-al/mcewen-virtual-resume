// Text-to-Speech Controller & Lip-sync Trigger
let synth = window.speechSynthesis;
let currentUtterance = null;
let voices = [];

// App-wide speech state
export const ttsState = {
  enabled: localStorage.getItem('tts_enabled') !== 'false', // Default to true
  isSpeaking: false,
  pitch: parseFloat(localStorage.getItem('tts_pitch') || '1.0'),
  rate: parseFloat(localStorage.getItem('tts_rate') || '1.0'),
  voiceName: localStorage.getItem('tts_voice_name') || ''
};

// Initialize voices
export function initVoices(callback) {
  if (!synth) return;
  
  const loadVoices = () => {
    voices = synth.getVoices();
    if (callback) callback(voices);
  };
  
  loadVoices();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
}

// Get list of loaded voices
export function getVoices() {
  return voices;
}

// Toggle TTS enabled
export function toggleTts(enabled) {
  ttsState.enabled = enabled;
  localStorage.setItem('tts_enabled', enabled);
  if (!enabled) {
    stopSpeaking();
  }
}

// Stop any active speech
export function stopSpeaking() {
  if (synth && synth.speaking) {
    synth.cancel();
  }
  ttsState.isSpeaking = false;
}

// Speak text and animate avatar mouth
export function speak(text, onBoundaryCallback, onEndCallback) {
  stopSpeaking();
  
  if (!ttsState.enabled || !synth) {
    if (onEndCallback) onEndCallback();
    return;
  }

  // Preprocess text to make TTS sound more natural (e.g. abbreviations, percentages)
  let cleanText = text
    .replace(/3D/g, 'three-dee')
    .replace(/GCP/g, 'G C P')
    .replace(/AWS/g, 'A W S')
    .replace(/UI\/UX/g, 'U I U X')
    .replace(/CI\/CD/g, 'C I C D')
    .replace(/%/g, ' percent')
    .replace(/\+/g, ' plus')
    .replace(/FPS/g, 'frames per second')
    .replace(/API/g, 'A P I')
    .replace(/Vite/g, 'veet')
    .replace(/WebGL/g, 'Web G L')
    .replace(/Zustand/g, 'zoo-stand')
    .replace(/(\r\n|\n|\r)/gm, " "); // remove line breaks

  // Split long responses into sentences to prevent browser TTS lag or cutoffs
  currentUtterance = new SpeechSynthesisUtterance(cleanText);
  
  // Set voice
  if (ttsState.voiceName) {
    const selectedVoice = voices.find(v => v.name === ttsState.voiceName);
    if (selectedVoice) {
      currentUtterance.voice = selectedVoice;
    }
  }
  
  // Set configurations
  currentUtterance.pitch = ttsState.pitch;
  currentUtterance.rate = ttsState.rate;
  
  // Handlers
  currentUtterance.onstart = () => {
    ttsState.isSpeaking = true;
  };
  
  currentUtterance.onend = () => {
    ttsState.isSpeaking = false;
    if (onEndCallback) onEndCallback();
  };
  
  currentUtterance.onerror = (e) => {
    console.error("TTS error:", e);
    ttsState.isSpeaking = false;
    if (onEndCallback) onEndCallback();
  };

  // Modern browsers fire onboundary for word markers - use this for precise talking beats
  currentUtterance.onboundary = (event) => {
    if (event.name === 'word' && onBoundaryCallback) {
      onBoundaryCallback(event.charIndex, event.charLength);
    }
  };

  // Speak!
  synth.speak(currentUtterance);
}

// Update voice settings and persist
export function updateVoiceSettings(voiceName, pitch, rate) {
  ttsState.voiceName = voiceName;
  ttsState.pitch = parseFloat(pitch);
  ttsState.rate = parseFloat(rate);
  
  localStorage.setItem('tts_voice_name', voiceName);
  localStorage.setItem('tts_pitch', pitch);
  localStorage.setItem('tts_rate', rate);
}
