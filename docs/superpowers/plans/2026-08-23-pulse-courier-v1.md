# Pulse Courier: Neon Run v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a complete, dependency-free browser game with a risk/reward collection loop, combat-avoidance tools, upgrades, interactive onboarding, persistence, and a verified first release.

**Architecture:** Pure gameplay calculations live in a dependency-free UMD-style module that exposes `module.exports` in Node and `window.PulseCore` in the browser. Browser-only orchestration uses ordered classic deferred runtime segments so direct `file://` launch works reliably while each source stays small enough for reliable connector uploads; HTML/CSS provide accessible menus and overlays.

**Tech Stack:** HTML5, CSS3, dependency-free JavaScript, Canvas 2D, WebAudio, localStorage, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-23-pulse-courier-design.md`

## Global Constraints
- No runtime or build dependencies.
- No external network assets or backend.
- Main run must be finite: 4 minutes and 60 banked energy for victory.
- Tutorial must cover movement, collect, bank, dash, pulse, and HUD.
- `index.html` must work when opened directly via `file://` in a modern browser.
- Core automated tests use `node --test` and require no npm install.

---

### Task 1: Gameplay core and tests

**Files:**
- Create: `tests/game-core.test.js`
- Create: `src/game-core.js`

**Interfaces:**
- Produces: `clamp`, `circlesOverlap`, `carryMultiplier`, `carrySpeedFactor`, `bankReward`, `spawnInterval`, `missionStatus`, `applyUpgrade`, `pickUpgradeChoices`, `UPGRADES`.

- [x] Write failing tests for carry multiplier, slowdown cap, scoring, collision, spawn pressure, mission outcomes, upgrade mutations, and unique upgrade choice selection.
- [x] Run `node --test tests/game-core.test.js` and confirm failure because `src/game-core.js` does not exist.
- [x] Implement the smallest pure functions needed by the tests.
- [x] Run `node --test tests/game-core.test.js` and confirm all tests pass.
- [x] Refactor names/constants without changing tested behavior.

### Task 2: Browser shell and visual system

**Files:**
- Create: `index.html`
- Create: `styles.css`

**Interfaces:**
- Produces DOM ids consumed by `src/game.js`: `gameCanvas`, `menuScreen`, `tutorialScreen`, `upgradeScreen`, `pauseScreen`, `endScreen`, HUD fields, and control buttons.

- [x] Build the semantic page shell, HUD, menu, tutorial panel, upgrade cards, pause overlay, end overlay, and control buttons.
- [x] Add dark neon responsive styling, keyboard hints, progress bars, focus states, and canvas scaling.
- [x] Check HTML/CSS for duplicate ids and missing game.js selectors using a static verification script.

### Task 3: Main game loop and complete mechanics

**Files:**
- Create: `src/game.js`

**Interfaces:**
- Consumes: pure helpers from `src/game-core.js` and DOM ids from Task 2.
- Produces: playable state machine, input handlers, entities, collision handling, progression, persistence, audio, and render loop.

- [x] Implement state transitions for menu, playing, upgrade, paused, victory, and game over.
- [x] Implement movement, carry slowdown, cell spawning/collection, Relay banking, score/missions, damage/drop behavior.
- [x] Implement Dash, Pulse, Chaser, Charger, difficulty ramp, particles, telegraphs, and HUD.
- [x] Implement upgrade milestone selection using `pickUpgradeChoices` and `applyUpgrade`.
- [x] Implement localStorage bests/tutorial flag/sound preference and generated WebAudio with graceful fallback.
- [x] Run the core test suite again.

### Task 4: Interactive tutorial

**Files:**
- Modify: `src/game.js`
- Modify: `index.html`

**Interfaces:**
- Consumes the same input and render loop, but uses tutorial-safe spawning and tutorial-specific goals.
- Produces six sequential tutorial steps and completion transition.

- [x] Add deterministic tutorial setup with a highlighted energy cell and no hostile damage.
- [x] Advance tutorial only after observing movement, collection, banking, dash, and pulse actions.
- [x] Add final HUD explanation and Start Mission path.
- [x] Persist tutorial completion defensively.

### Task 5: Documentation and release verification

**Files:**
- Create: `README.md`
- Create: `LICENSE`

**Interfaces:**
- README documents direct-open launch, optional local HTTP server, controls, tutorial, mechanics, testing, files, and v1 acceptance scope.

- [x] Write README with introduction and exact beginner-friendly startup instructions.
- [x] Add MIT license.
- [x] Run `node --test`.
- [x] Serve project locally with `python3 -m http.server 4173` and run a Playwright smoke test that loads the page, starts a mission, confirms canvas/HUD, sends movement/dash keys, pauses/resumes, and reports page errors.
- [x] Run static checks for syntax and required files.
- [x] Inspect git diff/status and commit the complete v1 locally.


## Verification record

- Core gameplay tests: 10 passing.
- Static/release tests: 8 passing (including unique DOM ids, no external runtime assets, and upload-safe runtime segment sizing).
- Chromium interaction smoke: start, movement, Dash, pause/resume, all six tutorial steps, tutorial-to-mission transition, zero runtime exceptions.
- Visual QA: menu, mission HUD, and tutorial layout inspected at 1280×800.
