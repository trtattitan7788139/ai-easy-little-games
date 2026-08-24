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

  function ensureV124Theme() {
    if (document.querySelector('link[href="theme-v124.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'theme-v124.css';
    document.head.appendChild(link);
  }

  function patchVisibleVersionV124() {
    const footerVersion = document.querySelector('.footer-note span:first-child');
    if (footerVersion) footerVersion.textContent = 'v1.2.4 // DESKTOP + MOBILE';
  }

  function patchPublicApiV124() {
    if (!window.PulseCourier || window.PulseCourier.version === '1.2.4') return Boolean(window.PulseCourier);
    window.PulseCourier = Object.freeze({ ...window.PulseCourier, version: '1.2.4' });
    return true;
  }

  localizeHealthCopy();
  ensureV124Theme();
  patchVisibleVersionV124();
  if (!patchPublicApiV124()) document.addEventListener('DOMContentLoaded', patchPublicApiV124, { once: true });
})();
