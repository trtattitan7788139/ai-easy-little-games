'use strict';

function difficultyLabel(difficulty) {
  return difficulty === 'normal' ? '普通' : '簡單';
}

function bestScoreStorageKey(difficulty) {
  return difficulty === 'normal' ? STORAGE_KEYS.bestScoreNormal : STORAGE_KEYS.bestScoreEasy;
}

function awardKillScore(basePoints, count) {
  const fullValue = Math.max(0, Number(basePoints) || 0) * Math.max(0, Number(count) || 0);
  const multiplier = difficultyKillMultiplier(state.difficulty);
  const exact = fullValue * multiplier + state.killScoreFraction;
  state.killScorePenalty += fullValue * (1 - multiplier);
  const whole = Math.floor(exact + 1e-9);
  state.killScoreFraction = Number((exact - whole).toFixed(6));
  state.score += whole;
  return whole;
}

function upgradeProgressScore() {
  return state.score + state.killScoreFraction + state.killScorePenalty;
}

function resetRun(mode, difficulty) {
  keys.clear();
  resetMobileJoystick();
  state.mode = mode;
  state.difficulty = difficulty === 'normal' ? 'normal' : 'easy';
  state.elapsed = 0;
  state.score = 0;
  state.killScoreFraction = 0;
  state.killScorePenalty = 0;
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

function startMission(difficulty) {
  ensureAudio();
  resetRun('playing', difficulty || 'easy');
  state.player.x = RELAY.x;
  state.player.y = RELAY.y + 145;
  for (let i = 0; i < 9; i += 1) spawnCell();
  spawnBurst(RELAY.x, RELAY.y, '#66efff', 18, 120);
  playTone(330, 0.09, 'sine', 0.035);
  syncUiState();
}

function startTutorial() {
  ensureAudio();
  resetRun('tutorial', 'easy');
  state.player.x = RELAY.x;
  state.player.y = RELAY.y + 145;
  state.tutorialStart = { x: state.player.x, y: state.player.y };
  setTutorialStep(0);
  syncUiState();
  playTone(440, 0.07, 'sine', 0.025);
}

function showMenu() {
  keys.clear();
  resetMobileJoystick();
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
  resetMobileJoystick();
  syncUiState();
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = pausedFrom;
  lastFrame = performance.now();
  syncUiState();
}

function triggerDashAftershock() {
  const p = state.player;
  const stats = dashAftershockStats(p.dashImpactLevel);
  if (stats.radius <= 0) return { affected: 0, destroyed: 0 };

  const affected = state.enemies.filter((enemy) => Math.hypot(enemy.x - p.x, enemy.y - p.y) <= stats.radius + enemy.r);
  const destroyedIds = new Set();
  for (const enemy of affected) {
    let dx = enemy.x - p.x;
    let dy = enemy.y - p.y;
    let distance = Math.hypot(dx, dy);
    if (distance < 0.001) {
      const angle = ((enemy.id || 1) * 2.3999632297) % TAU;
      dx = Math.cos(angle);
      dy = Math.sin(angle);
      distance = 1;
    }
    const neighbors = affected.reduce((count, other) => {
      if (other === enemy) return count;
      return count + (Math.hypot(other.x - enemy.x, other.y - enemy.y) < 42 ? 1 : 0);
    }, 0);
    const push = dashAftershockPush(distance, neighbors, p.dashImpactLevel);
    enemy.x = clamp(enemy.x + (dx / distance) * push, 18, W - 18);
    enemy.y = clamp(enemy.y + (dy / distance) * push, 78, H - 18);
    if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= stats.coreRadius + enemy.r * 0.5) destroyedIds.add(enemy.id);
  }

  if (destroyedIds.size > 0) {
    for (const enemy of state.enemies) {
      if (!destroyedIds.has(enemy.id)) continue;
      spawnBurst(enemy.x, enemy.y, '#eaffff', 12, 155);
    }
    state.enemies = state.enemies.filter((enemy) => !destroyedIds.has(enemy.id));
  }
  spawnShockwaveRing(p.x, p.y, stats.radius, stats.coreRadius);
  state.screenShake = Math.max(state.screenShake, 5 + Math.min(4, affected.length * 0.35));
  playTone(82, 0.14, 'triangle', 0.035);
  return { affected: affected.length, destroyed: destroyedIds.size };
}

function isPhoneViewport() {
  return Math.min(window.innerWidth, window.innerHeight) <= 560 && Math.max(window.innerWidth, window.innerHeight) <= 950;
}

function desiredArenaWidth() {
  if (!isPhoneViewport()) return 960;
  const frame = document.querySelector('.game-frame');
  if (!frame) return W;
  const rect = frame.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return W;
  return Math.round(clamp(H * (rect.width / rect.height), 680, 1440));
}

function remapArenaX(value, oldWidth, newWidth) {
  if (!Number.isFinite(value) || oldWidth <= 0) return value;
  return (value / oldWidth) * newWidth;
}

function syncArenaViewport(force) {
  if (!dom.gameCanvas) return W;
  const nextWidth = desiredArenaWidth();
  const oldWidth = W;
  if (force || Math.abs(nextWidth - oldWidth) >= 2) {
    const mapX = (value) => remapArenaX(value, oldWidth, nextWidth);
    state.player.x = clamp(mapX(state.player.x), 28, nextWidth - 28);
    state.tutorialStart.x = mapX(state.tutorialStart.x);
    for (const cell of state.cells) cell.x = clamp(mapX(cell.x), 35, nextWidth - 35);
    for (const enemy of state.enemies) {
      enemy.x = clamp(mapX(enemy.x), 18, nextWidth - 18);
      enemy.targetX = mapX(enemy.targetX);
    }
    for (const particle of state.particles) particle.x = mapX(particle.x);
    for (const star of state.stars) star.x = mapX(star.x);
    W = nextWidth;
    RELAY.x = W / 2;
  }
  if (dom.gameCanvas.width !== W) dom.gameCanvas.width = W;
  if (dom.gameCanvas.height !== H) dom.gameCanvas.height = H;
  return W;
}

function bindArenaViewport() {
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => requestAnimationFrame(() => syncArenaViewport(false)), 45);
  };
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule, { passive: true });
}
