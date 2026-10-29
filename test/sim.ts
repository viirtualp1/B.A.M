// Headless reachability check: random-search input scripts per level section and report
// whether at least one script clears it (proves the section is passable with this physics).
import { Game } from '../src/game/engine'
import { STEP, T } from '../src/game/constants'
import { ui } from '../src/game/store'
import type { Action } from '../src/game/input'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
type Seg = { d: number; hold: Action[] }

const COMBOS: Action[][] = [
  ['right'], ['right'], ['right', 'jump'], ['right', 'jump'], ['jump'], ['right', 'dash'], ['right', 'up', 'dash'],
  ['up', 'dash'], ['yarn'], ['right', 'yarn'], ['left'], ['left', 'jump'], [], ['right', 'jump', 'dash'],
  ['right', 'up', 'jump', 'dash'], ['left', 'yarn'], ['down'],
]

function sim(level: number, tx: number, ty: number, segs: Seg[], ok: (g: Game) => boolean, setup?: (g: Game) => void): { pass: boolean; g: Game } {
  const g = new Game()
  g.newGame(level)
  const p = g.player
  p.x = tx * T + 7
  p.y = (ty + 1) * T - p.h
  ;(g as Any).respawn = { x: -9999, y: 9999 }
  setup?.(g)
  const held = new Set<Action>()
  for (const s of segs) {
    for (const a of held) g.input.release(a)
    held.clear()
    for (const a of s.hold) { g.input.press(a); held.add(a) }
    const n = Math.round(s.d / STEP)
    for (let i = 0; i < n; i++) {
      ;(g as Any).update(STEP)
      g.input.endStep()
      if (ok(g)) return { pass: true, g }
      if (ui.screen === 'over' || p.x < -1000 || ui.hearts < 3) return { pass: false, g }
    }
  }
  return { pass: ok(g), g }
}

function randomScript(len: number): Seg[] {
  return Array.from({ length: len }, () => ({ d: 0.03 + Math.random() ** 1.5 * 0.6, hold: COMBOS[Math.floor(Math.random() * COMBOS.length)] }))
}

/** Beam search: grow scripts segment by segment, keeping the ones that got furthest right. */
function beam(level: number, tx: number, ty: number, ok: (g: Game) => boolean, setup?: (g: Game) => void, target?: (g: Game) => number): Seg[] | null {
  const score = target ?? ((g: Game) => g.player.x / T - Math.max(0, g.player.y / T - 12) * 5)
  let pop: { segs: Seg[]; s: number }[] = [{ segs: [], s: 0 }]
  for (let gen = 0; gen < 40; gen++) {
    const next: { segs: Seg[]; s: number }[] = []
    for (const c of pop) {
      for (let k = 0; k < 10; k++) {
        const segs = [...c.segs, ...randomScript(1 + Math.floor(Math.random() * 2))]
        const r = sim(level, tx, ty, segs, ok, setup)
        if (r.pass) return segs
        if (ui.screen === 'over' || ui.hearts < 3 || r.g.player.y > 13 * T) continue
        next.push({ segs, s: score(r.g) })
      }
    }
    next.sort((a, b) => b.s - a.s)
    pop = next.slice(0, 40)
    if (!pop.length) return null
  }
  return null
}

function section(name: string, level: number, tx: number, ty: number, ok: (g: Game) => boolean, opts: { tries?: number; len?: number; setup?: (g: Game) => void; target?: (g: Game) => number; wait?: boolean } = {}): void {
  const tries = opts.tries ?? 1500
  let wins = 0
  let first = -1
  for (let i = 0; i < tries; i++) {
    const r = sim(level, tx, ty, [...(opts.wait ? [{ d: Math.random() * 7, hold: [] as Action[] }] : []), ...randomScript(opts.len ?? 14)], ok, opts.setup)
    if (r.pass) { wins++; if (first < 0) first = i }
  }
  if (wins === 0) {
    const segs = beam(level, tx, ty, ok, opts.setup, opts.target)
    console.log(`${segs ? 'PASS' : 'FAIL'}  ${name.padEnd(30)} beam ${segs ? segs.map((x) => `${x.hold.join('+') || '·'}:${x.d.toFixed(2)}`).join(' ') : ''}`)
    return
  }
  console.log(`PASS  ${name.padEnd(30)} wins ${String(wins).padStart(4)}/${tries}  first@${first}`)
}

const X = (g: Game): number => g.player.x / T
const Y = (g: Game): number => g.player.y / T
const only = process.argv[2]
const L = (n: number): boolean => !only || only === String(n)

if (L(1)) {
  section('L1 start → gap', 0, 3, 11, (g) => X(g) > 26)
  section('L1 jelly wall', 0, 30, 11, (g) => X(g) > 38)
  section('L1 dash cracked', 0, 44, 11, (g) => X(g) > 49)
  section('L1 spikes + walkers', 0, 49, 11, (g) => X(g) > 63)
  section('L1 chimney climb', 0, 63, 11, (g) => X(g) > 69 && Y(g) < 3)
  section('L1 melting clouds', 0, 89, 11, (g) => X(g) > 108 && Y(g) < 12)
  section('L1 to goal', 0, 108, 11, () => ui.screen === 'clear')
}
if (L(2)) {
  section('L2 yarn chain', 1, 10, 11, (g) => X(g) > 35 && Y(g) < 12)
  section('L2 crystal midair', 1, 41, 11, (g) => X(g) > 65 && Y(g) < 12)
  section('L2 gems + platform', 1, 79, 11, (g) => X(g) > 101 && Y(g) < 12, { wait: true, tries: 6000 })
  section('L2 lift → key', 1, 104, 11, () => ui.hasKey, { target: (g) => -Math.hypot(g.player.x - 114.5 * T, g.player.y - 4.5 * T) / T })
  section('L2 yarn over thorns', 1, 117, 11, (g) => X(g) > 134 && Y(g) < 12)
  section('L2 cage', 1, 135, 11, () => ui.screen === 'clear', { setup: () => (ui.hasKey = true) })
}
if (L(3)) {
  section('L3 spiky tunnel', 2, 3, 11, (g) => X(g) > 27)
  section('L3 jelly → ledge', 2, 36, 11, (g) => X(g) > 44 && Y(g) < 5)
  section('L3 crystal rhythm', 2, 47, 4, (g) => X(g) > 61 && Y(g) < 12)
  section('L3 spikies + spitter', 2, 62, 11, (g) => X(g) > 88)
  section('L3 gem chain', 2, 96, 11, (g) => X(g) > 123 && Y(g) < 12)
  section('L3 to goal', 2, 124, 11, () => ui.screen === 'clear')
}
if (L(4)) {
  section('L4 chimney', 3, 3, 11, (g) => X(g) > 22 && Y(g) < 2)
  section('L4 dash gaps', 3, 27, 1, (g) => X(g) > 47 && Y(g) < 12)
  section('L4 crystal stairs', 3, 48, 11, (g) => X(g) > 62 && Y(g) < 4)
  section('L4 lift + yarn + gem', 3, 65, 11, (g) => X(g) > 101 && Y(g) < 12, { wait: true, tries: 6000 })
  section('L4 key room', 3, 101, 11, () => ui.hasKey, { target: (g) => -Math.hypot(g.player.x - 109.5 * T, g.player.y - 11 * T) / T })
  section('L4 roof cage', 3, 113, 11, () => ui.screen === 'clear', { setup: () => (ui.hasKey = true), len: 18 })
}
