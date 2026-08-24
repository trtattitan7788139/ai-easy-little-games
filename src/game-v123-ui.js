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

  function ensureTheme(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function patchVisibleVersionV125() {
    const footerVersion = document.querySelector('.footer-note span:first-child');
    if (footerVersion) footerVersion.textContent = 'v1.2.5 // DESKTOP + MOBILE';
  }

  function patchPublicApiV125() {
    if (!window.PulseCourier || window.PulseCourier.version === '1.2.5') return Boolean(window.PulseCourier);
    window.PulseCourier = Object.freeze({ ...window.PulseCourier, version: '1.2.5' });
    return true;
  }

  localizeHealthCopy();
  ensureTheme('theme-v124.css');
  ensureTheme('theme-v125.css');
  patchVisibleVersionV125();
  if (!patchPublicApiV125()) document.addEventListener('DOMContentLoaded', patchPublicApiV125, { once: true });
})();
