// Crate puzzles need precise stops, which random search rarely finds. Each puzzle here is a
// scripted plan with one or two timing knobs; we grid-search the knobs and report a working setting.
import { Game } from '../src/game/engine'
import { STEP, T } from '../src/game/constants'
import { ui } from '../src/game/store'
import type { Action } from '../src/game/input'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
type Seg = [number, Action[]]

function play(level: number, tx: number, ty: number, segs: Seg[], ok: (g: Game) => boolean, setup?: (g: Game) => void): boolean {
  const g = new Game()
  g.startWorld(level)
  g.player.x = tx * T + 7
  g.player.y = (ty + 1) * T - g.player.h
  setup?.(g)
  // keys held across consecutive segments stay down (no accidental re-press)
  let held = new Set<Action>()
  for (const [d, hold] of segs) {
    const next = new Set(hold)
    for (const a of held) if (!next.has(a)) g.input.release(a)
    for (const a of next) if (!held.has(a)) g.input.press(a)
    held = next
    for (let i = 0; i < Math.round(d / STEP); i++) {
      ;(g as Any).update(STEP)
      g.input.endStep()
      if (ok(g)) return true
      if (ui.hearts < 3) return false
    }
  }
  return ok(g)
}

function solve(name: string, level: number, tx: number, ty: number, plan: (a: number, b: number) => Seg[], ok: (g: Game) => boolean, setup?: (g: Game) => void): void {
  for (let a = 0.1; a <= 4; a += 0.05)
    for (let b = 0.05; b <= 2; b += 0.1)
      if (play(level, tx, ty, plan(a, b), ok, setup)) {
        console.log(`PASS  ${name.padEnd(30)} a=${a.toFixed(2)} b=${b.toFixed(2)}`)
        return
      }
  console.log(`FAIL  ${name}`)
}

const X = (g: Game): number => g.player.x / T
const R: Action[] = ['right']
const L: Action[] = ['left']

solve('L3 crate → button', 2, 3, 11, (a) => [[a, R], [0.1, []], [0.5, ['right', 'jump']], [1.5, R]], (g) => X(g) > 19)
solve('L3 crate off ledge', 2, 19, 11, (a) => [[0.6, R], [0.5, ['right', 'jump']], [a, R], [0.1, []], [0.5, ['right', 'jump']], [1.5, R]], (g) => X(g) > 36)
solve('L3 crate under crystal', 2, 67, 11, (a, b) => [
  [0.95, R], [0.65, ['right', 'jump']], [0.3, R], [a, L], [0.1, []], [0.15, ['left', 'jump']], [0.4, ['jump']], [0.2, []], [b, ['jump']], [0.25, ['jump', 'up', 'dash']], [0.4, []],
], (g) => g.sw === 1)
solve('L3 crate step → key', 2, 97, 11, (a, b) => [[a, R], [0.15, []], [0.08, ['jump']], [b / 4, ['right', 'jump']], [0.5, ['jump']], [0.3, []], [0.28, ['jump']], [0.25, ['jump', 'up', 'dash']], [0.6, []], [0.5, ['jump']]], () => ui.hasKey)
solve('W3 kitten C (crate + dash)', 2, 111, 11, (a, b) => [[a, R], [0.15, []], [0.08, ['jump']], [b / 4, ['right', 'jump']], [0.5, ['jump']], [0.3, []], [0.28, ['jump']], [0.25, ['jump', 'up', 'dash']], [0.6, []], [0.3, R], [0.3, L]], (g) => g.kittens.some((k) => Math.floor(k.x / T) === 116 && k.found))
solve('L3 last gate', 2, 111, 11, (a) => [[a, R], [0.1, []], [0.5, ['right', 'jump']], [1.5, R]], (g) => X(g) > 125)
solve('L5 crate over timed bridge', 4, 40, 11, (a) => [[0.4, ['jump']], [0.1, []], [a, R], [0.1, []], [0.5, ['right', 'jump']], [1.5, R]], (g) => X(g) > 53)
solve('L5 crate + clock crystal', 4, 128, 11, (a, b) => [
  [0.8, R], [0.65, ['right', 'jump']], [0.3, R], [a, L], [0.1, []], [0.15, ['left', 'jump']], [0.4, ['jump']], [0.2, []], [b, ['jump']], [0.25, ['jump', 'up', 'dash']], [0.3, []], [3, R],
], (g) => X(g) > 141)
