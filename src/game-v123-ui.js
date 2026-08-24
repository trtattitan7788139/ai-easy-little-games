'use strict';

(() => {
  const localizeHealthCopy = (root = document) => {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('.hud-label, .how-grid p, .tutorial-panel p, .upgrade-choice p').forEach((node) => {
      if (node.textContent.includes('HULL')) node.textContent = node.textContent.replaceAll('HULL', '血量');
    });
  };

  const previousTutorialStep = setTutorialStep;
  setTutorialStep = function setTutorialStepV123(step) {
    previousTutorialStep(step);
    localizeHealthCopy(dom.tutorialPanel);
  };

  const previousRenderUpgradeChoices = renderUpgradeChoices;
  renderUpgradeChoices = function renderUpgradeChoicesV123() {
    previousRenderUpgradeChoices();
    localizeHealthCopy(dom.upgradeChoices);
  };

  function patchPublicApiV123() {
    if (!window.PulseCourier || window.PulseCourier.version === '1.2.3') return Boolean(window.PulseCourier);
    window.PulseCourier = Object.freeze({ ...window.PulseCourier, version: '1.2.3' });
    return true;
  }

  localizeHealthCopy();
  if (!patchPublicApiV123()) document.addEventListener('DOMContentLoaded', patchPublicApiV123, { once: true });
})();
