const AudioContextClass = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;

const MUSIC_BPM = 96;
const MUSIC_STEP_SECONDS = 60 / MUSIC_BPM / 2;
const MUSIC_SCHEDULE_AHEAD_SECONDS = 0.2;
const MUSIC_TIMER_MS = 50;

const MELODY_PATTERN = [
  74, null, 77, null, 81, null, 77, null,
  72, null, 76, null, 79, null, 76, null,
  74, null, 77, 79, 81, null, 84, null,
  79, null, 76, null, 72, null, 69, null
];

const BASS_PATTERN = [
  38, null, null, null, 38, null, null, null,
  36, null, null, null, 36, null, null, null,
  34, null, null, null, 34, null, null, null,
  36, null, null, null, 33, null, null, null
];

let context = null;
let musicOutput = null;
let sfxOutput = null;
let musicTimer = null;
let musicRequested = false;
let nextMusicStepAt = 0;
let musicStep = 0;
let unlockListenersInstalled = false;
let settings = {
  enabled: true,
  musicVolume: 30,
  sfxVolume: 70
};
const lastSfxAt = new Map();

function clampVolume(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, numeric));
}

function volumeCurve(value, maximumGain) {
  return Math.pow(clampVolume(value, 0) / 100, 1.55) * maximumGain;
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function createAudioGraph() {
  if (!AudioContextClass || context) {
    return context;
  }

  context = new AudioContextClass();
  musicOutput = context.createGain();
  sfxOutput = context.createGain();
  musicOutput.connect(context.destination);
  sfxOutput.connect(context.destination);
  applyOutputVolumes(true);
  return context;
}

function setGainSmoothly(gainNode, target, immediate = false) {
  if (!context || !gainNode) {
    return;
  }
  const now = context.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  if (immediate) {
    gainNode.gain.setValueAtTime(target, now);
    return;
  }
  gainNode.gain.setTargetAtTime(target, now, 0.025);
}

function applyOutputVolumes(immediate = false) {
  if (!context) {
    return;
  }
  const musicGain = settings.enabled ? volumeCurve(settings.musicVolume, 0.13) : 0;
  const sfxGain = settings.enabled ? volumeCurve(settings.sfxVolume, 0.24) : 0;
  setGainSmoothly(musicOutput, musicGain, immediate);
  setGainSmoothly(sfxOutput, sfxGain, immediate);
}

function scheduleTone({ destination, time, frequency, duration, type = 'square', gain = 0.12, endFrequency = null }) {
  if (!context || !destination || frequency <= 0) {
    return;
  }

  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const safeEnd = time + Math.max(0.025, duration);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  if (endFrequency && endFrequency > 0) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, safeEnd);
  }
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.008);
  envelope.gain.setValueAtTime(Math.max(0.0002, gain), Math.max(time + 0.01, safeEnd - 0.04));
  envelope.gain.exponentialRampToValueAtTime(0.0001, safeEnd);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(time);
  oscillator.stop(safeEnd + 0.01);
}

function scheduleNoise({ time, duration = 0.08, gain = 0.07, highpass = 1200 }) {
  if (!context || !sfxOutput) {
    return;
  }
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(highpass, time);
  envelope.gain.setValueAtTime(gain, time);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(sfxOutput);
  source.start(time);
}

function scheduleMusicStep(step, time) {
  const melodyNote = MELODY_PATTERN[step];
  const bassNote = BASS_PATTERN[step];

  if (melodyNote) {
    scheduleTone({
      destination: musicOutput,
      time,
      frequency: midiToFrequency(melodyNote),
      duration: MUSIC_STEP_SECONDS * 0.72,
      type: 'square',
      gain: 0.16
    });
  }

  if (bassNote) {
    scheduleTone({
      destination: musicOutput,
      time,
      frequency: midiToFrequency(bassNote),
      duration: MUSIC_STEP_SECONDS * 2.8,
      type: 'triangle',
      gain: 0.2
    });
  }

  if (step % 8 === 4) {
    scheduleTone({
      destination: musicOutput,
      time,
      frequency: 110,
      endFrequency: 58,
      duration: 0.1,
      type: 'sine',
      gain: 0.09
    });
  }
}

function scheduleMusic() {
  if (!context || context.state !== 'running' || !musicRequested || !settings.enabled || settings.musicVolume <= 0) {
    return;
  }
  while (nextMusicStepAt < context.currentTime + MUSIC_SCHEDULE_AHEAD_SECONDS) {
    scheduleMusicStep(musicStep, nextMusicStepAt);
    musicStep = (musicStep + 1) % MELODY_PATTERN.length;
    nextMusicStepAt += MUSIC_STEP_SECONDS;
  }
}

function beginMusicSequencer() {
  if (!context || context.state !== 'running' || musicTimer || !musicRequested || !settings.enabled || settings.musicVolume <= 0) {
    return;
  }
  nextMusicStepAt = context.currentTime + 0.05;
  scheduleMusic();
  musicTimer = window.setInterval(scheduleMusic, MUSIC_TIMER_MS);
}

function pauseMusicSequencer() {
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

async function unlockAudio() {
  const audioContext = createAudioGraph();
  if (!audioContext) {
    return false;
  }
  if (audioContext.state !== 'running') {
    try {
      await audioContext.resume();
    } catch (_error) {
      return false;
    }
  }
  applyOutputVolumes();
  beginMusicSequencer();
  return audioContext.state === 'running';
}

function installUnlockListeners() {
  if (unlockListenersInstalled || typeof document === 'undefined') {
    return;
  }
  unlockListenersInstalled = true;
  const unlock = () => {
    void unlockAudio();
  };
  document.addEventListener('pointerdown', unlock, { capture: true, once: true });
  document.addEventListener('keydown', unlock, { capture: true, once: true });
}

export function configureAudio(nextSettings = {}) {
  settings = {
    enabled: Boolean(nextSettings.enabled ?? settings.enabled),
    musicVolume: clampVolume(nextSettings.musicVolume, settings.musicVolume),
    sfxVolume: clampVolume(nextSettings.sfxVolume, settings.sfxVolume)
  };
  installUnlockListeners();
  applyOutputVolumes();
  if (!settings.enabled || settings.musicVolume <= 0) {
    pauseMusicSequencer();
  } else if (context?.state === 'running') {
    beginMusicSequencer();
  }
}

export function startBackgroundMusic() {
  musicRequested = true;
  installUnlockListeners();
  const audioContext = createAudioGraph();
  if (audioContext?.state === 'running') {
    beginMusicSequencer();
  }
}

export function stopBackgroundMusic() {
  musicRequested = false;
  pauseMusicSequencer();
}

function mayPlaySfx(name, minimumGapMs = 0) {
  if (!settings.enabled || settings.sfxVolume <= 0) {
    return false;
  }
  const now = performance.now();
  const previous = lastSfxAt.get(name) || 0;
  if (now - previous < minimumGapMs) {
    return false;
  }
  lastSfxAt.set(name, now);
  return true;
}

export function playSfx(name) {
  if (!mayPlaySfx(name, name === 'click' ? 55 : 20)) {
    return;
  }
  const audioContext = createAudioGraph();
  if (!audioContext) {
    return;
  }
  if (audioContext.state !== 'running') {
    void unlockAudio().then((unlocked) => {
      if (!unlocked) {
        return;
      }
      lastSfxAt.delete(name);
      playSfx(name);
    });
    return;
  }

  const now = audioContext.currentTime + 0.005;
  const tone = (offset, note, duration, type, gain, endNote = null) => {
    scheduleTone({
      destination: sfxOutput,
      time: now + offset,
      frequency: midiToFrequency(note),
      endFrequency: endNote ? midiToFrequency(endNote) : null,
      duration,
      type,
      gain
    });
  };

  switch (name) {
    case 'click':
      tone(0, 79, 0.055, 'square', 0.09, 83);
      break;
    case 'buy':
      tone(0, 76, 0.07, 'square', 0.13);
      tone(0.065, 83, 0.1, 'square', 0.12);
      break;
    case 'merge':
      tone(0, 62, 0.09, 'square', 0.13);
      tone(0.07, 65, 0.09, 'square', 0.14);
      tone(0.14, 69, 0.1, 'square', 0.15);
      tone(0.21, 74, 0.18, 'triangle', 0.18);
      scheduleNoise({ time: now + 0.18, duration: 0.09, gain: 0.05, highpass: 1700 });
      break;
    case 'evolve':
      [62, 67, 70, 74, 79, 86].forEach((note, index) => {
        tone(index * 0.075, note, index === 5 ? 0.3 : 0.12, index % 2 ? 'triangle' : 'square', 0.13 + index * 0.01);
      });
      scheduleNoise({ time: now + 0.32, duration: 0.2, gain: 0.07, highpass: 2200 });
      break;
    case 'upgrade':
      tone(0, 67, 0.08, 'square', 0.12);
      tone(0.08, 74, 0.13, 'square', 0.14);
      break;
    case 'sell':
      tone(0, 81, 0.07, 'square', 0.12);
      tone(0.06, 76, 0.11, 'square', 0.11);
      break;
    case 'rebirth':
      [50, 57, 62, 69, 74].forEach((note, index) => {
        tone(index * 0.11, note, 0.28, index < 2 ? 'triangle' : 'square', 0.15);
      });
      scheduleNoise({ time: now + 0.4, duration: 0.25, gain: 0.08, highpass: 1300 });
      break;
    case 'error':
      tone(0, 45, 0.12, 'sawtooth', 0.1, 41);
      tone(0.11, 41, 0.14, 'sawtooth', 0.09, 38);
      break;
    case 'ui':
    default:
      tone(0, 72, 0.045, 'square', 0.07);
      break;
  }
}

export function getAudioDebugState() {
  return {
    available: Boolean(AudioContextClass),
    contextState: context?.state || 'not-created',
    musicPlaying: Boolean(musicTimer),
    musicRequested,
    enabled: settings.enabled,
    musicVolume: settings.musicVolume,
    sfxVolume: settings.sfxVolume
  };
}

export function shutdownAudio() {
  stopBackgroundMusic();
  if (context) {
    void context.close();
  }
  context = null;
  musicOutput = null;
  sfxOutput = null;
}
