# Pulse Courier: Neon Run — v1 Design

## Product goal
Create a self-contained browser game that a first-time player can understand without prior genre knowledge, start without installing a game engine, finish in a short session, and want to replay for a higher score or different upgrade build.

## Player fantasy
You are a courier piloting a small neon craft inside an unstable energy field. Collect loose energy cells, decide how long to stay exposed while carrying them, then return to the central Relay to bank them before hostile drones hit you.

## Core loop
1. Move around the arena and collect energy cells.
2. Carrying more cells raises the bank multiplier, but also raises threat and slightly reduces movement speed.
3. Return to the Relay in the center to bank carried cells into score and mission progress.
4. Use Dash to escape danger and Pulse to clear nearby enemies when charged.
5. At score milestones, choose one of three upgrades.
6. Survive 4 minutes and bank at least 60 energy to complete the mission. Losing all hull ends the run.

## Controls
- Move: WASD or arrow keys.
- Dash: Space. Short burst, brief invulnerability, 3-second base cooldown.
- Pulse: E. Available when the Pulse meter is full; destroys nearby drones and resets the meter.
- Pause: P or Escape.
- UI buttons: Start, Tutorial, Pause/Resume, Sound on/off, Restart.

## Risk / reward
- Carry multiplier: 1 + 0.12 × carried cells, capped at 2.5x.
- Carrying cells slows the player by 2.5% each, capped at 20% slowdown.
- Enemy spawn pressure increases with elapsed time and current carried cells.
- Taking damage drops half of currently carried cells back into the arena.

## Player systems
- Base hull: 3.
- Base speed: 245 px/s.
- Carry capacity: 6 cells.
- Dash: 3.0 s cooldown, 0.22 s duration, 2.5× movement speed, invulnerable while active.
- Pulse: meter charges by banking; each banked cell grants 16 charge, full at 100.

## Enemies
- Chaser: follows the player continuously. Moderate speed, standard collision damage.
- Charger: appears later in the run, periodically telegraphs and lunges toward the player's last known position.
- Difficulty ramps over time; threat from carrying energy accelerates spawning but never changes enemy damage.

## Upgrades
On each upgrade milestone, pause the run and show three random distinct choices from:
- Overdrive: +12% movement speed.
- Reinforced Hull: +1 maximum hull and heal 1.
- Cargo Lattice: +2 carry capacity and +5% banking bonus.
- Phase Cooling: -15% dash cooldown, minimum 1.4 s.
- Wide Pulse: +22% pulse radius.
- Capacitor: Pulse charges 20% faster.

## Tutorial
Interactive tutorial mode uses a safe arena and guides a new player through:
1. Moving with WASD / arrows.
2. Collecting a highlighted energy cell.
3. Returning to the Relay to bank it.
4. Using Dash with Space.
5. Filling and using Pulse with E.
6. Reading hull, timer, carried energy, multiplier, and mission progress.
After completion, the tutorial offers a Start Mission button. Tutorial progress is not required to play the main run.

## States
- Menu
- Tutorial
- Playing
- Upgrade selection
- Paused
- Victory
- Game over

## Persistence
Use localStorage for:
- best score
- best banked energy
- sound preference
- whether the tutorial has been completed
No account, backend, analytics, network request, or external asset dependency.

## Presentation
- Dark neon sci-fi visual language, rendered with Canvas primitives and CSS only.
- High-contrast HUD and readable text.
- Generated WebAudio bleeps only; no downloaded audio.
- Responsive canvas scaling for desktop browser windows while preserving a 16:10 logical arena.

## Technical architecture
- `index.html`: semantic shell, menus, HUD, tutorial/upgrade/end overlays.
- `styles.css`: layout, HUD, overlays, responsive design.
- `src/game-core.js`: dependency-free UMD-style gameplay math/state helpers. It exports through `module.exports` in Node tests and `window.PulseCore` in the browser.
- `src/game.js` + `src/game-02.js` … `src/game-05.js`: ordered classic deferred browser runtime segments for Canvas rendering, input, storage/audio, and state transitions. Splitting keeps each source file upload-safe and readable; classic scripts are intentional so `index.html` works from `file://` without module CORS restrictions.
- `tests/game-core.test.js`: deterministic Node built-in tests for scoring, collision, threat, upgrades, carry slowdown, and mission completion.
- `README.md`: game description, controls, first-time instructions, two launch methods, project structure, testing, and v1 scope.

## Error handling / robustness
- Clamp delta time to avoid huge simulation jumps after tab switching.
- Ignore gameplay keys when the run is not active.
- Handle localStorage access failures without preventing gameplay.
- Handle unavailable WebAudio by silently disabling audio.
- Prevent duplicate upgrade choices in a single selection.
- Keep all spawned entities within arena-safe bounds when appropriate.

## v1 acceptance criteria
- A fresh clone can be played by opening `index.html` directly in a modern Chromium/Firefox/Edge browser; running a local server is also documented.
- Main run supports movement, collection, banking, damage, dash, pulse, two enemy types, upgrade choices, pause, restart, victory, and game over.
- Tutorial explains and exercises all primary controls and HUD concepts.
- README contains introduction and exact launch instructions.
- Automated core tests pass with Node.js and require no npm install.
- Browser smoke test loads with no page errors and can start a mission.
