# Billion & Million

A cute platformer about Rosie, a tiny pink superhero, rescuing two tuxedo cats — **Billion** and **Million**.

Built with Vue 3, Vite and TypeScript. The game itself is a hand-written canvas engine in `src/game/`; Vue renders the menus, HUD and touch controls.

## Play

- **Keyboard:** ← → run · Space jump · Shift / X dash · C yarn hook · Esc pause · M mute
- **iPhone:** turn the phone sideways; joystick on the left, Yarn / Dash / Jump on the right. Vibration can be toggled in the pause menu.
- Languages: English and Thai.

## Worlds

1. **Candy Meadow** — jump, dash through cracked blocks, wall-jump up a chimney, melting clouds
2. **Cloud Garden** — yarn swinging, crystals that swap pink/blue blocks mid-air, dash-refill gems, a lift to the key → **Billion**
3. **Sugar Caves** — spikies (dash only), crystal rhythm jumps, a five-gem dash chain
4. **Sunset Roofs** — everything together → **Million**

## Develop

```bash
npm install
npm run dev            # local dev server
npm run build          # production build → dist/
npm run build:single   # one self-contained HTML file → dist-single/
npm test               # headless bot checks that every level section is passable
```

## Layout

- `src/game/engine.ts` — physics, mechanics, enemies, game flow
- `src/game/levels.ts` — level layouts (tile legend at the top)
- `src/game/render.ts`, `sprites.ts` — all drawing
- `src/game/i18n.ts` — English / Thai strings
- `src/game/audio.ts`, `haptics.ts` — WebAudio sfx + music, vibration (iOS switch trick)
- `test/sim.ts` — random/beam-search playtester
