# Billion & Million

A cute platformer about Rosie, a tiny pink superhero, rescuing two tuxedo cats — **Billion** and **Million**.

Built with Vue 3, Vite and TypeScript. The game itself is a hand-written canvas engine in `src/game/`; Vue renders the menus, HUD and touch controls.

## Play

- **Keyboard:** ← → run · Space jump · Shift / X dash · C yarn hook · Esc pause · M mute
- **iPhone:** turn the phone sideways; joystick on the left, Yarn / Dash / Jump on the right. Vibration can be toggled in the pause menu.
- Languages: English and Thai.

## Worlds

Each world is built around one main mechanic, introduced safely, then twisted:

1. **Candy Meadow** — jump, float (press jump again in mid-air), dash, wall-jump
2. **Cloud Garden** — swing on yarn hooks
3. **Toy Workshop** — push crates onto buttons, use them as steps → rescue **Billion**
4. **Sugar Caves** — dash with recharge gems, cracked ceilings, spikies
5. **Clock Tower** — clock crystals that swap blocks for a few seconds
6. **Sunset Roofs** — everything at once → rescue **Million**
7. **Storm Crown** — the Grumble King boss (slam, crystal-stairs and charge phases)

Every world except the boss hides 3 kittens; they move into Rosie's house and unlock outfits in the wardrobe.

## Saves

Three save slots in the browser. Bells save the current spot, so *Continue* drops you back at the last bell.
*Save code* in the house copies a text code that loads the same progress on another device.

## Install (PWA)

On iPhone: Safari → Share → *Add to Home Screen*. On Android: the *Install app* button on the title screen.
The installed app runs full-screen, in landscape, and works offline.

## Develop

```bash
npm install
npm run dev            # local dev server
npm run build          # production build → dist/
npm run build:single   # one self-contained HTML file → dist-single/
npm test               # headless bot: every section, kitten and boss phase is reachable
node … test/puzzles.ts # scripted crate puzzles (see test/)
```

## Layout

- `src/game/engine.ts` — physics, mechanics, enemies, game flow
- `src/game/levels.ts` — level layouts (tile legend at the top)
- `src/game/render.ts`, `sprites.ts` — all drawing
- `src/game/i18n.ts` — English / Thai strings
- `src/game/audio.ts`, `haptics.ts` — WebAudio sfx + music, vibration (iOS switch trick)
- `test/sim.ts` — random/beam-search playtester
