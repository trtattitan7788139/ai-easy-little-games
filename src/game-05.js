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

  const dashProgress = p.dashCooldownRemaining <= 0 ? 1 : 1 - p.dashCooldownRemaining / p.dashCooldown;
  dom.dashFill.style.width = `${clamp(dashProgress, 0, 1) * 100}%`;
  dom.dashLabel.textContent = p.dashCooldownRemaining <= 0 ? 'READY' : `${p.dashCooldownRemaining.toFixed(1)}s`;
  dom.pulseFill.style.width = `${clamp(state.pulse, 0, 100)}%`;
  dom.pulseLabel.textContent = state.pulse >= 100 ? 'READY' : `${Math.floor(state.pulse)}%`;
}

function syncUiState() {
  const mode = state.mode;
  dom.menuScreen.classList.toggle('is-hidden', mode !== 'menu');
  if (mode !== 'menu') dom.howScreen.classList.add('is-hidden');
  dom.hud.classList.toggle('is-hidden', mode === 'menu');
  dom.abilityRack.classList.toggle('is-hidden', mode === 'menu');
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
  dom.bestScore.textContent = String(Number(readStorage(STORAGE_KEYS.bestScore, '0')) || 0);
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
    player: {
      x: state.player.x,
      y: state.player.y,
      hull: state.player.hull,
      maxHull: state.player.maxHull,
      capacity: state.player.capacity,
      dashCooldownRemaining: state.player.dashCooldownRemaining,
      dashRemaining: state.player.dashRemaining,
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
  bindUi();
  updateBestLabels();
  updateSoundButton();
  syncUiState();
  window.PulseCourier = Object.freeze({
    getSnapshot,
    startMission,
    startTutorial,
    showMenu,
    version: '1.0.0',
  });
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
