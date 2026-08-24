'use strict';

(() => {
  const v121 = window.PulseV121Core;
  if (!v121) throw new Error('PulseV121Core failed to load before game-08.js');

  function formatUpgradeProgressNumber(value) {
    const number = Number(value) || 0;
    return Math.abs(number - Math.round(number)) < 1e-6 ? String(Math.round(number)) : number.toFixed(1);
  }

  function updateUpgradeProgressHud() {
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
      value.textContent = 'MAX';
      return;
    }

    label.textContent = progress.ready ? 'NEXT UPGRADE · READY SOON' : 'NEXT UPGRADE';
    value.textContent = `${formatUpgradeProgressNumber(progress.current)} / ${formatUpgradeProgressNumber(progress.required)}`;
  }

  const baseUpdateHudV121 = updateHud;
  updateHud = function updateHudV121() {
    baseUpdateHudV121();
    updateUpgradeProgressHud();
  };


  updateUpgradeProgressHud();
})();
