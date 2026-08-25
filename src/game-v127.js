'use strict';

(() => {
  const v127 = window.PulseV127Core;
  const v121 = window.PulseV121Core;
  const pulseCore = window.PulseCore;
  if (!v127 || !v121 || !pulseCore) throw new Error('Pulse v1.2.7 dependencies failed to load');

  const { UPGRADE_THRESHOLDS } = v127;
  const REPAIR_UPGRADE = Object.freeze({
    id: 'emergency-repair',
    name: '緊急修復',
    icon: '✚',
    description: '立即恢復 2 格血量，不增加最大血量。',
  });

  function playerUpgradeLevels() {
    const levels = state.player.upgradeLevels;
    if (levels && typeof levels === 'object' && !Array.isArray(levels)) return levels;
    state.player.upgradeLevels = {};
    return state.player.upgradeLevels;
  }

  function regularUpgradeChoices() {
    return v127.pickEligibleUpgradeChoices(
      pulseCore.getUpgradePool(state.player),
      3,
      Math.random,
      playerUpgradeLevels(),
    );
  }

  checkUpgrade = function checkUpgradeV127() {
    if (state.nextUpgradeIndex >= UPGRADE_THRESHOLDS.length) return;
    if (upgradeProgressScore() < UPGRADE_THRESHOLDS[state.nextUpgradeIndex]) return;
    upgradeReturnMode = state.mode;
    state.mode = 'upgrade';
    state.nextUpgradeIndex += 1;
    keys.clear();
    renderUpgradeChoices();
    syncUiState();
    playTone(520, 0.10, 'triangle', 0.025);
  };

  renderUpgradeChoices = function renderUpgradeChoicesV127() {
    dom.upgradeChoices.textContent = '';
    const choices = regularUpgradeChoices();
    const repairChance = v121.repairOfferChance(state.player.hull, state.player.maxHull);

    if (choices.length === 0) {
      choices.push(REPAIR_UPGRADE);
    } else if (Math.random() < repairChance) {
      if (choices.length < 3) choices.push(REPAIR_UPGRADE);
      else choices[Math.floor(Math.random() * choices.length)] = REPAIR_UPGRADE;
    }

    for (const upgrade of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'upgrade-choice';
      button.dataset.upgradeId = upgrade.id;
      button.dataset.upgradeLevel = upgrade.id === REPAIR_UPGRADE.id ? 'repair' : String(upgrade.level || 1);
      button.innerHTML = `<span class="upgrade-icon" aria-hidden="true">${upgrade.icon}</span><h3>${upgrade.name}</h3><p>${upgrade.description}</p>`;
      button.addEventListener('click', () => chooseUpgrade(upgrade.id));
      dom.upgradeChoices.appendChild(button);
    }
  };

  function applyUpgradeProtectionV127() {
    const p = state.player;
    p.invulnerable = Math.max(p.invulnerable, v121.UPGRADE_GRACE_SECONDS);
    p.hitFlash = Math.max(p.hitFlash, 0.22);
    state.particles.push({
      type: 'ring', x: p.x, y: p.y, color: '#66efff',
      life: 0.52, maxLife: 0.52, radius: 92, current: 14,
    });
    spawnBurst(p.x, p.y, '#dffcff', 10, 92);
  }

  chooseUpgrade = function chooseUpgradeV127(id) {
    if (id === REPAIR_UPGRADE.id) {
      const result = v121.healHull(state.player.hull, state.player.maxHull, 2);
      state.player.hull = result.hull;
      if (result.healed > 0) playTone(880, 0.09, 'sine', 0.025);
    } else {
      const levels = playerUpgradeLevels();
      if (!v127.canOfferUpgrade(levels, id)) return;
      state.player = { ...state.player, ...applyUpgrade(state.player, id) };
      state.player.upgradeLevels = v127.recordUpgradeLevel(levels, id);
    }

    applyUpgradeProtectionV127();
    state.mode = upgradeReturnMode;
    lastFrame = performance.now();
    playTone(760, 0.07, 'sine', 0.025);
    syncUiState();
  };

  function formatProgressNumber(value) {
    const number = Number(value) || 0;
    return Math.abs(number - Math.round(number)) < 1e-6 ? String(Math.round(number)) : number.toFixed(1);
  }

  function updateUpgradeProgressHudV127() {
    const hud = document.getElementById('upgradeProgressHud');
    const fill = document.getElementById('upgradeProgressFill');
    const value = document.getElementById('upgradeProgressValue');
    const label = document.getElementById('upgradeProgressLabel');
    if (!hud || !fill || !value || !label) return;

    const visible = state.mode === 'playing' || state.mode === 'paused';
    hud.classList.toggle('is-hidden', !visible);
    if (!visible) return;

    const progress = v121.upgradeProgressState(upgradeProgressScore(), state.nextUpgradeIndex, UPGRADE_THRESHOLDS);
    hud.classList.toggle('is-near-ready', progress.ready && !progress.maxed);
    hud.classList.toggle('is-maxed', progress.maxed);
    fill.style.width = `${Math.round(progress.ratio * 1000) / 10}%`;

    if (progress.maxed) {
      label.textContent = 'UPGRADES MAX';
      value.textContent = '10 / 10';
      return;
    }

    label.textContent = progress.ready ? 'NEXT UPGRADE · READY SOON' : 'NEXT UPGRADE';
    value.textContent = `${formatProgressNumber(progress.current)} / ${formatProgressNumber(progress.required)} · ${state.nextUpgradeIndex + 1}/10`;
  }

  const baseUpdateHudV127 = updateHud;
  updateHud = function updateHudV127() {
    baseUpdateHudV127();
    updateUpgradeProgressHudV127();
  };

  function patchVersionV127() {
    const footerVersion = document.querySelector('.footer-note span:first-child');
    if (footerVersion) footerVersion.textContent = 'v1.2.7 // DESKTOP + MOBILE';
    if (!window.PulseCourier) return false;
    if (window.PulseCourier.version === '1.2.7') return true;
    window.PulseCourier = Object.freeze({ ...window.PulseCourier, version: '1.2.7' });
    return true;
  }

  updateUpgradeProgressHudV127();
  if (!patchVersionV127()) document.addEventListener('DOMContentLoaded', patchVersionV127, { once: true });
})();
