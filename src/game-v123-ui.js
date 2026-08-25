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

  function ensureScript(src, onload) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (typeof onload === 'function') onload();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    if (typeof onload === 'function') script.addEventListener('load', onload, { once: true });
    document.body.appendChild(script);
  }

  function patchVisibleVersionV127() {
    const footerVersion = document.querySelector('.footer-note span:first-child');
    if (footerVersion) footerVersion.textContent = 'v1.2.7 // DESKTOP + MOBILE';
  }

  function patchPublicApiV127() {
    if (!window.PulseCourier || window.PulseCourier.version === '1.2.7') return Boolean(window.PulseCourier);
    window.PulseCourier = Object.freeze({ ...window.PulseCourier, version: '1.2.7' });
    return true;
  }

  localizeHealthCopy();
  ensureTheme('theme-v124.css');
  ensureTheme('theme-v125.css');
  ensureTheme('theme-v126.css');
  ensureScript('src/game-v127-core.js', () => ensureScript('src/game-v127.js'));
  patchVisibleVersionV127();
  if (!patchPublicApiV127()) document.addEventListener('DOMContentLoaded', patchPublicApiV127, { once: true });
})();
