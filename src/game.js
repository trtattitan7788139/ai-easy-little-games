'use strict';

'use strict';

const core = window.PulseCore;
if (!core) throw new Error('PulseCore failed to load before game.js');

const {
  clamp,
  circlesOverlap,
  steerTowardWithSeparation,
  carryMultiplier,
  carrySpeedFactor,
  bankReward,
  spawnInterval,
  missionStatus,
  createBasePlayerStats,
  applyUpgrade,
  pickUpgradeChoices,
} = core;

const W = 960;
const H = 600;
const MISSION_SECONDS = 240;
const MISSION_BANKED = 60;
const RELAY = Object.freeze({ x: W / 2, y: H / 2, r: 54 });
const STORAGE_KEYS = Object.freeze({
  bestScore: 'pulseCourier.bestScore',
  bestBanked: 'pulseCourier.bestBanked',
  sound: 'pulseCourier.sound',
  tutorialDone: 'pulseCourier.tutorialDone',
});
const UPGRADE_THRESHOLDS = [16, 38, 72, 118, 180];
const TAU = Math.PI * 2;

const dom = {};
const keys = new Set();
let ctx;
let lastFrame = performance.now();
let audioContext = null;
function readInitialStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (_error) {
    return fallback;
  }
}
let soundEnabled = readInitialStorage(STORAGE_KEYS.sound, 'true') !== 'false';
let pausedFrom = 'playing';
let upgradeReturnMode = 'playing';
let idCounter = 1;

const state = {
  mode: 'menu',
  elapsed: 0,
  score: 0,
  banked: 0,
  carried: 0,
  pulse: 0,
  player: makePlayer(),
  cells: [],
  enemies: [],
  particles: [],
  stars: makeStars(85),
  spawnTimer: 1.1,
  cellSpawnTimer: 0.2,
  nextUpgradeIndex: 0,
  tutorialStep: 0,
  tutorialStart: { x: RELAY.x, y: RELAY.y + 140 },
  tutorialMovedDistance: 0,
  tutorialPulseSpawned: false,
  screenShake: 0,
  flash: 0,
};

function makePlayer() {
  return {
    ...createBasePlayerStats(),
    x: RELAY.x,
    y: RELAY.y + 135,
    r: 15,
    dashCooldownRemaining: 0,
    dashRemaining: 0,
    invulnerable: 0,
    hitFlash: 0,
    lastDirX: 0,
    lastDirY: -1,
  };
}

function makeStars(count) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0.12 + Math.random() * 0.40,
      drift: 4 + Math.random() * 12,
    });
  }
  return stars;
}

function cacheDom() {
  const ids = [
    'gameCanvas', 'menuScreen', 'startButton', 'tutorialButton', 'howButton', 'howScreen', 'howCloseButton', 'howTutorialButton',
    'hud', 'abilityRack', 'hullValue', 'timerValue', 'cargoValue', 'multiplierValue', 'bankedValue', 'scoreValue',
    'dashFill', 'dashLabel', 'dashImpactLabel', 'pulseFill', 'pulseLabel', 'tutorialPanel', 'tutorialStep', 'tutorialText', 'tutorialProgress', 'tutorialFinishButton',
    'upgradeScreen', 'upgradeChoices', 'pauseScreen', 'resumeButton', 'pauseRestartButton', 'pauseMenuButton',
    'endScreen', 'endKicker', 'endTitle', 'endSummary', 'finalScore', 'finalBanked', 'bestScore', 'menuBestBanked',
    'restartButton', 'menuButton', 'pauseButton', 'soundButton',
    'mobileControls', 'mobileUpButton', 'mobileLeftButton', 'mobileRightButton', 'mobileDownButton',
    'mobileDashButton', 'mobilePulseButton', 'mobileDashLabel', 'mobilePulseLabel', 'mobileDashImpactLabel',
  ];
  for (const id of ids) {
    dom[id] = document.getElementById(id);
    if (!dom[id]) throw new Error(`Missing required DOM element #${id}`);
  }
  ctx = dom.gameCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable');
}

function bindUi() {
  dom.startButton.addEventListener('click', startMission);
  dom.tutorialButton.addEventListener('click', startTutorial);
  dom.howButton.addEventListener('click', openHow);
  dom.howCloseButton.addEventListener('click', closeHow);
  dom.howTutorialButton.addEventListener('click', startTutorial);
  dom.tutorialFinishButton.addEventListener('click', finishTutorialAndStart);
  dom.pauseButton.addEventListener('click', togglePause);
  dom.soundButton.addEventListener('click', toggleSound);
  dom.resumeButton.addEventListener('click', resumeGame);
  dom.pauseRestartButton.addEventListener('click', () => (pausedFrom === 'tutorial' ? startTutorial() : startMission()));
  dom.pauseMenuButton.addEventListener('click', showMenu);
  dom.restartButton.addEventListener('click', startMission);
  dom.menuButton.addEventListener('click', showMenu);

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    keys.clear();
    if (state.mode === 'playing' || state.mode === 'tutorial') pauseGame();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state.mode === 'playing' || state.mode === 'tutorial')) pauseGame();
  });

  bindTouchHold(dom.mobileUpButton, 'ArrowUp');
  bindTouchHold(dom.mobileLeftButton, 'ArrowLeft');
  bindTouchHold(dom.mobileRightButton, 'ArrowRight');
  bindTouchHold(dom.mobileDownButton, 'ArrowDown');
  bindTouchAction(dom.mobileDashButton, tryDash);
  bindTouchAction(dom.mobilePulseButton, tryPulse);
}

function onKeyDown(event) {
  const gameplayKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'KeyP', 'Escape'];
  if (gameplayKey.includes(event.code)) event.preventDefault();

  if (event.code === 'KeyP' || event.code === 'Escape') {
    if (!event.repeat) togglePause();
    return;
  }

  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'Space') tryDash();
  if (event.code === 'KeyE') tryPulse();
}

function onKeyUp(event) {
  keys.delete(event.code);
}

function resetRun(mode) {
  keys.clear();
  state.mode = mode;
  state.elapsed = 0;
  state.score = 0;
  state.banked = 0;
  state.carried = 0;
  state.pulse = 0;
  state.player = makePlayer();
  state.cells = [];
  state.enemies = [];
  state.particles = [];
  state.spawnTimer = 1.05;
  state.cellSpawnTimer = 0.05;
  state.nextUpgradeIndex = 0;
  state.tutorialStep = 0;
  state.tutorialMovedDistance = 0;
  state.tutorialPulseSpawned = false;
  state.screenShake = 0;
  state.flash = 0;
  idCounter = 1;
}

function startMission() {
  ensureAudio();
  resetRun('playing');
  state.player.x = RELAY.x;
  state.player.y = RELAY.y + 145;
  for (let i = 0; i < 9; i += 1) spawnCell();
  spawnBurst(RELAY.x, RELAY.y, '#66efff', 18, 120);
  playTone(330, 0.09, 'sine', 0.035);
  syncUiState();
}

function startTutorial() {
  ensureAudio();
  resetRun('tutorial');
  state.player.x = RELAY.x;
  state.player.y = RELAY.y + 145;
  state.tutorialStart = { x: state.player.x, y: state.player.y };
  setTutorialStep(0);
  syncUiState();
  playTone(440, 0.07, 'sine', 0.025);
}

function showMenu() {
  keys.clear();
  state.mode = 'menu';
  state.cells = [];
  state.enemies = [];
  state.particles = [];
  updateBestLabels();
  syncUiState();
}

function openHow() {
  dom.menuScreen.classList.add('is-hidden');
  dom.howScreen.classList.remove('is-hidden');
}

function closeHow() {
  dom.howScreen.classList.add('is-hidden');
  dom.menuScreen.classList.remove('is-hidden');
}

function togglePause() {
  if (state.mode === 'playing' || state.mode === 'tutorial') pauseGame();
  else if (state.mode === 'paused') resumeGame();
}

function pauseGame() {
  if (state.mode !== 'playing' && state.mode !== 'tutorial') return;
  pausedFrom = state.mode;
  state.mode = 'paused';
  keys.clear();
  syncUiState();
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = pausedFrom;
  lastFrame = performance.now();
  syncUiState();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  writeStorage(STORAGE_KEYS.sound, String(soundEnabled));
  updateSoundButton();
  if (soundEnabled) {
    ensureAudio();
    playTone(520, 0.055, 'sine', 0.025);
  }
}

function ensureAudio() {
  if (!soundEnabled || audioContext) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      soundEnabled = false;
      updateSoundButton();
      return;
    }
    audioContext = new AudioCtor();
  } catch (_) {
    soundEnabled = false;
    updateSoundButton();
  }
}

function playTone(frequency, duration, type, volume) {
  if (!soundEnabled) return;
  ensureAudio();
  if (!audioContext) return;
  try {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume || 0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch (_) {
    // Audio is cosmetic; gameplay must continue if a browser blocks it.
  }
}
