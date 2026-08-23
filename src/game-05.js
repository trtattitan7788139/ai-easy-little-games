function resetMobileJoystick() {
  mobileMove.x = 0;
  mobileMove.y = 0;
  if (dom.mobileJoystick) dom.mobileJoystick.classList.remove('is-active');
  if (dom.mobileJoystickStick) dom.mobileJoystickStick.style.transform = 'translate3d(0px, 0px, 0)';
}

function bindJoystick(base, stick) {
  let activePointer = null;
  const deadzone = 9;

  const update = (event) => {
    if (event.pointerId !== activePointer) return;
    const rect = base.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const maxRadius = Math.max(28, Math.min(rect.width, rect.height) * 0.34);
    if (distance <= deadzone) {
      mobileMove.x = 0;
      mobileMove.y = 0;
      stick.style.transform = 'translate3d(0px, 0px, 0)';
      return;
    }
    const directionX = dx / distance;
    const directionY = dy / distance;
    const travel = Math.min(distance, maxRadius);
    const strength = clamp((travel - deadzone) / (maxRadius - deadzone), 0, 1);
    mobileMove.x = directionX * strength;
    mobileMove.y = directionY * strength;
    stick.style.transform = `translate3d(${(directionX * travel).toFixed(1)}px, ${(directionY * travel).toFixed(1)}px, 0)`;
  };

  const press = (event) => {
    event.preventDefault();
    if (activePointer !== null || (state.mode !== 'playing' && state.mode !== 'tutorial')) return;
    activePointer = event.pointerId;
    base.classList.add('is-active');
    try { base.setPointerCapture(event.pointerId); } catch (_) {}
    update(event);
  };
  const release = (event) => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    resetMobileJoystick();
  };

  base.addEventListener('pointerdown', press);
  base.addEventListener('pointermove', update);
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);
  base.addEventListener('lostpointercapture', release);
  base.addEventListener('contextmenu', (event) => event.preventDefault());
}
function bindTouchAction(button, action) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (state.mode !== 'playing' && state.mode !== 'tutorial') return;
    button.classList.add('is-pressed');
    action();
  });
  const release = () => button.classList.remove('is-pressed');
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

'use strict';

function updateHud() {
  const p = state.player;
  const hull = Math.max(0, p.hull);
  dom.hullValue.textContent = `${'◆ '.repeat(hull)}${'◇ '.repeat(Math.max(0, p.maxHull - hull))}`.trim();
  if (state.mode === 'tutorial' || (state.mode === 'paused' && pausedFrom === 'tutorial')) {
    dom.timerValue.textContent = 'TRAIN';
  } else {
    const remaining = Math.max(0, MISSION_SECONDS - state.elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    dom.timerValue.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  dom.cargoValue.textContent = `${state.carried} / ${p.capacity}`;
  dom.multiplierValue.textContent = `×${carryMultiplier(state.carried).toFixed(2)}`;
  dom.bankedValue.textContent = `${state.banked} / ${MISSION_BANKED}`;
  dom.scoreValue.textContent = String(state.score);
  dom.difficultyValue.textContent = difficultyLabel(state.difficulty);

  const dashProgress = p.dashCooldownRemaining <= 0 ? 1 : 1 - p.dashCooldownRemaining / p.dashCooldown;
  dom.dashFill.style.width = `${clamp(dashProgress, 0, 1) * 100}%`;
  const dashText = p.dashCooldownRemaining <= 0 ? 'READY' : `${p.dashCooldownRemaining.toFixed(1)}s`;
  const impactText = p.dashImpactLevel > 0 ? `撞擊 Lv.${p.dashImpactLevel}` : '撞擊未解鎖';
  dom.dashLabel.textContent = dashText;
  dom.dashImpactLabel.textContent = impactText;
  dom.mobileDashLabel.textContent = dashText;
  dom.mobileDashImpactLabel.textContent = impactText;
  dom.pulseFill.style.width = `${clamp(state.pulse, 0, 100)}%`;
  const pulseText = state.pulse >= 100 ? 'READY' : `${Math.floor(state.pulse)}%`;
  dom.pulseLabel.textContent = pulseText;
  dom.mobilePulseLabel.textContent = pulseText;
}

function syncUiState() {
  const mode = state.mode;
  dom.menuScreen.classList.toggle('is-hidden', mode !== 'menu');
  if (mode !== 'menu') dom.howScreen.classList.add('is-hidden');
  dom.hud.classList.toggle('is-hidden', mode === 'menu');
  dom.abilityRack.classList.toggle('is-hidden', mode === 'menu');
  dom.mobileControls.classList.toggle('is-hidden', !['playing', 'tutorial'].includes(mode));
  dom.tutorialPanel.classList.toggle('is-hidden', !(mode === 'tutorial' || (mode === 'paused' && pausedFrom === 'tutorial')));
  dom.upgradeScreen.classList.toggle('is-hidden', mode !== 'upgrade');
  dom.pauseScreen.classList.toggle('is-hidden', mode !== 'paused');
  dom.endScreen.classList.toggle('is-hidden', mode !== 'victory' && mode !== 'gameover');
  dom.pauseButton.disabled = !['playing', 'tutorial', 'paused'].includes(mode);
  dom.pauseButton.textContent = mode === 'paused' ? '▶' : 'Ⅱ';
  updateSoundButton();
  updateHud();
}

function updateSoundButton() {
  if (!dom.soundButton) return;
  dom.soundButton.textContent = soundEnabled ? '♪' : '×';
  dom.soundButton.setAttribute('aria-label', soundEnabled ? '關閉音效' : '開啟音效');
  dom.soundButton.title = soundEnabled ? '音效：開' : '音效：關';
}

function updateBestLabels() {
  const legacyEasy = Number(readStorage(STORAGE_KEYS.bestScore, '0')) || 0;
  const easy = Math.max(legacyEasy, Number(readStorage(STORAGE_KEYS.bestScoreEasy, '0')) || 0);
  const normal = Number(readStorage(STORAGE_KEYS.bestScoreNormal, '0')) || 0;
  dom.bestScore.textContent = String(easy);
  dom.bestNormalScore.textContent = String(normal);
  dom.menuBestBanked.textContent = String(Number(readStorage(STORAGE_KEYS.bestBanked, '0')) || 0);
}

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    // Private mode or file-origin policies may block persistence; gameplay still works.
  }
}

function getSnapshot() {
  return {
    mode: state.mode,
    elapsed: state.elapsed,
    score: state.score,
    banked: state.banked,
    carried: state.carried,
    pulse: state.pulse,
    cellCount: state.cells.length,
    enemyCount: state.enemies.length,
    tutorialStep: state.tutorialStep,
    difficulty: state.difficulty,
    killScoreFraction: state.killScoreFraction,
    killScorePenalty: state.killScorePenalty,
    upgradeProgress: upgradeProgressScore(),
    arenaWidth: W,
    relayX: RELAY.x,
    player: {
      x: state.player.x,
      y: state.player.y,
      hull: state.player.hull,
      maxHull: state.player.maxHull,
      capacity: state.player.capacity,
      dashCooldownRemaining: state.player.dashCooldownRemaining,
      dashRemaining: state.player.dashRemaining,
      dashImpactLevel: state.player.dashImpactLevel,
      dashImpactRadius: state.player.dashImpactRadius,
      dashImpactScore: state.player.dashImpactScore,
    },
  };
}

function frame(now) {
  const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
  lastFrame = now;
  update(dt);
  render(now);
  requestAnimationFrame(frame);
}

function init() {
  cacheDom();
  syncArenaViewport(true);
  bindArenaViewport();
  bindUi();
  updateBestLabels();
  updateSoundButton();
  syncUiState();
  window.PulseCourier = Object.freeze({
    getSnapshot,
    startMission,
    startTutorial,
    showMenu,
    version: '1.2.0',
  });
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
