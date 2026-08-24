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

  function patchVisibleVersionV126() {
    const footerVersion = document.querySelector('.footer-note span:first-child');
    if (footerVersion) footerVersion.textContent = 'v1.2.6 // DESKTOP + MOBILE';
  }

  function patchPublicApiV126() {
    if (!window.PulseCourier || window.PulseCourier.version === '1.2.6') return Boolean(window.PulseCourier);
    window.PulseCourier = Object.freeze({ ...window.PulseCourier, version: '1.2.6' });
    return true;
  }

  localizeHealthCopy();
  ensureTheme('theme-v124.css');
  ensureTheme('theme-v125.css');
  ensureTheme('theme-v126.css');
  patchVisibleVersionV126();
  if (!patchPublicApiV126()) document.addEventListener('DOMContentLoaded', patchPublicApiV126, { once: true });
})();
