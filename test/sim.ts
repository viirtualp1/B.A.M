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
  ['right', 'up', 'jump', 'dash'], ['left', 'yarn'], ['down'], ['left', 'dash'], ['left', 'up', 'dash'],
]

function sim(level: number, tx: number, ty: number, segs: Seg[], ok: (g: Game) => boolean, setup?: (g: Game) => void): { pass: boolean; g: Game } {
  const g = new Game()
  g.startWorld(level)
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

let lastScript: Seg[] = []

function section(name: string, level: number, tx: number, ty: number, ok: (g: Game) => boolean, opts: { tries?: number; len?: number; setup?: (g: Game) => void; target?: (g: Game) => number; wait?: boolean } = {}): void {
  const tries = opts.tries ?? 1500
  let wins = 0
  let first = -1
  for (let i = 0; i < tries; i++) {
    const r = sim(level, tx, ty, lastScript = [...(opts.wait ? [{ d: Math.random() * 7, hold: [] as Action[] }] : []), ...randomScript(opts.len ?? 14)], ok, opts.setup)
    if (r.pass) { wins++; if (first < 0) { first = i; if (process.env.SHOW) console.log(JSON.stringify(lastScript)) } }
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

// kittens are numbered in reading order, so look them up by tile position
const kitAt = (g: Game, tx: number, ty: number): boolean => g.kittens.find((k) => Math.floor(k.x / T) === tx && k.y / T === ty + 1)?.found ?? false
const near = (kx: number, ky: number) => (g: Game): number => -Math.hypot(g.player.x - kx * T, g.player.y - ky * T) / T
const KIT = { len: 18, tries: 2500 }

if (only === 'cheat') {
  // These must FAIL: the puzzles should not be skippable without the crate.
  const noCrates = (g: Game): void => { g.crates = [] }
  section('cheat: W3 crystal w/o crate', 2, 67, 11, (g) => g.sw === 1, { setup: noCrates, tries: 4000 })
  section('cheat: W3 key w/o crate', 2, 97, 11, () => ui.hasKey, { setup: noCrates, tries: 4000 })
  section('cheat: W5 clock w/o crate', 4, 125, 11, (g) => g.swTimer > 0, { setup: noCrates, tries: 4000 })
  section('cheat: W3 gate 1 w/o crate', 2, 3, 11, (g) => X(g) > 19, { setup: noCrates, tries: 3000 })
}
if (L(1)) {
  section('W1 start → gap', 0, 3, 11, (g) => X(g) > 26)
  section('W1 jelly wall', 0, 30, 11, (g) => X(g) > 38)
  section('W1 dash cracked', 0, 44, 11, (g) => X(g) > 49)
  section('W1 spikes + walkers', 0, 49, 11, (g) => X(g) > 63)
  section('W1 chimney climb', 0, 63, 11, (g) => X(g) > 69 && Y(g) < 3)
  section('W1 melting clouds', 0, 89, 11, (g) => X(g) > 108 && Y(g) < 12)
  section('W1 to goal', 0, 108, 11, () => ui.screen === 'clear')
  section('W1 kitten A (jelly+dash)', 0, 30, 11, (g) => kitAt(g, 38, 2), { ...KIT, target: near(38, 2) })
  section('W1 kitten B (cracked room)', 0, 64, 11, (g) => kitAt(g, 71, 11), { ...KIT, target: near(71, 11) })
  section('W1 kitten C (high cloud)', 0, 113, 11, (g) => kitAt(g, 116, 2), { ...KIT, target: near(116, 2) })
}
if (L(2)) {
  section('W2 practice + pit', 1, 3, 11, (g) => X(g) > 79 && Y(g) < 12)
  section('W2 bees + swings', 1, 80, 11, (g) => X(g) > 121 && Y(g) < 12)
  section('W2 clouds + swings', 1, 122, 11, (g) => X(g) > 166 && Y(g) < 12)
  section('W2 tower → goal', 1, 167, 11, () => ui.screen === 'clear', { len: 18 })
  section('W2 kitten A (high cloud)', 1, 12, 11, (g) => kitAt(g, 21, 1), { ...KIT, target: near(21, 1) })
  section('W2 kitten B (island)', 1, 139, 11, (g) => kitAt(g, 150, 11), { ...KIT, target: near(150, 11) })
  section('W2 kitten C (tower room)', 1, 176, 11, (g) => kitAt(g, 185, 11), { ...KIT, target: near(185, 11) })
}
if (L(3)) {
  section('W3 clock race', 2, 38, 11, (g) => X(g) > 64 && Y(g) < 12)
  section('W3 stairs after crystal', 2, 77, 11, (g) => X(g) > 88 && Y(g) < 6, { setup: (g) => (g.sw = 1) })
  section('W3 plateau → checkpoint', 2, 89, 5, (g) => X(g) > 97)
  section('W3 kitten A (cloud over ledge)', 2, 19, 11, (g) => kitAt(g, 24, 4), { ...KIT, target: near(24, 4) })
  section('W3 kitten B (cracked room)', 2, 84, 11, (g) => kitAt(g, 91, 11), { ...KIT, target: near(91, 11), setup: (g) => (g.sw = 1) })
}
if (L(4)) {
  section('W4 spiky tunnel', 3, 3, 11, (g) => X(g) > 27)
  section('W4 jelly → ledge', 3, 36, 11, (g) => X(g) > 44 && Y(g) < 5)
  section('W4 gem gap', 3, 47, 4, (g) => X(g) > 61 && Y(g) < 12)
  section('W4 spikies + spitter', 3, 62, 11, (g) => X(g) > 88)
  section('W4 gem chain', 3, 96, 11, (g) => X(g) > 123 && Y(g) < 12)
  section('W4 cracked wall → goal', 3, 124, 11, () => ui.screen === 'clear')
  section('W4 kitten A (tunnel ceiling)', 3, 18, 11, (g) => kitAt(g, 21, 7), { ...KIT, target: near(21, 7) })
  section('W4 kitten B (ceiling room)', 3, 79, 11, (g) => kitAt(g, 80, 6), { ...KIT, target: near(80, 6) })
  section('W4 kitten C (gem tower)', 3, 101, 11, (g) => kitAt(g, 108, 3), { ...KIT, target: near(108, 3) })
}
if (L(5)) {
  section('W5 timed stones', 4, 3, 11, (g) => X(g) > 25 && Y(g) < 12)
  section('W5 to the crate', 4, 28, 11, (g) => X(g) > 39)
  section('W5 chimney', 4, 55, 11, (g) => X(g) > 67 && Y(g) < 12)
  section('W5 swing pink/blue', 4, 76, 11, (g) => X(g) > 101 && Y(g) < 12, { len: 18 })
  section('W5 crystal rhythm', 4, 101, 11, (g) => X(g) > 120 && Y(g) < 12 && g.sw === 0, { len: 18 })
  section('W5 after the pink wall → goal', 4, 141, 11, () => ui.screen === 'clear')
  section('W5 kitten A (timed stone)', 4, 3, 11, (g) => kitAt(g, 19, 5), { ...KIT, target: near(19, 5) })
  section('W5 kitten B (chimney wall)', 4, 54, 11, (g) => kitAt(g, 56, 3), { ...KIT, target: near(56, 3) })
  section('W5 kitten C (tower room)', 4, 68, 11, (g) => kitAt(g, 63, 11), { ...KIT, target: near(63, 11), setup: (g) => { g.enemies = [] } })
}
if (L(6)) {
  section('W6 chimney', 5, 3, 11, (g) => X(g) > 22 && Y(g) < 2)
  section('W6 dash gaps', 5, 27, 1, (g) => X(g) > 47 && Y(g) < 12)
  section('W6 crystal stairs', 5, 49, 11, (g) => X(g) > 62 && Y(g) < 4)
  section('W6 lift + yarn + gem', 5, 65, 11, (g) => X(g) > 101 && Y(g) < 12, { wait: true })
  section('W6 key room', 5, 101, 11, () => ui.hasKey, { target: near(109.5, 11) })
  section('W6 roof cage', 5, 113, 11, () => ui.screen === 'clear', { setup: (g) => { ui.hasKey = true; g.enemies = g.enemies.filter((e) => e.kind !== 'bee') }, len: 18 })
  section('W6 kitten A (sky cloud)', 5, 36, 4, (g) => kitAt(g, 39, 0), { ...KIT, target: near(39, 0) })
  section('W6 kitten B (island)', 5, 70, 11, (g) => kitAt(g, 88, 11), { ...KIT, target: near(88, 11), wait: true })
  section('W6 kitten C (roof room)', 5, 136, 11, (g) => kitAt(g, 144, 11), { ...KIT, target: near(144, 11) })
}
if (L(7)) {
  // Boss: each phase must be beatable from a fresh respawn.
  const hp = (n: number) => (g: Game): void => { const b = g.boss!; b.hp = n; b.phase = n > 4 ? 'slam' : n > 2 ? 'shield' : 'charge'; b.mode = 'float'; b.t = 0; b.y = n > 2 ? 1.5 * T : (g.H - 2) * T - 70 }
  section('W7 phase 1 (slam → stomp)', 6, 3, 11, (g) => (g.boss?.hp ?? 6) < 6, { setup: hp(6), len: 22 })
  section('W7 phase 2 (crystal stairs → dash)', 6, 20, 9, (g) => (g.boss?.hp ?? 4) < 4, { setup: hp(4), len: 22 })
}
