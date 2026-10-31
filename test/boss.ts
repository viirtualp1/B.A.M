// Phase 3 needs reactions (jump the charge, then punish), so drive it with a tiny reactive policy.
import { Game } from '../src/game/engine'
import { STEP, T } from '../src/game/constants'
import { ui } from '../src/game/store'
import type { Action } from '../src/game/input'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

const g = new Game()
g.startWorld(6)
const b = g.boss!
Object.assign(b, { hp: 2, phase: 'charge', mode: 'float', t: 0, y: (g.H - 2) * T - 70 })
g.player.x = 20 * T
let held = new Set<Action>()
const hold = (acts: Action[]): void => {
  const next = new Set(acts)
  for (const a of held) if (!next.has(a)) g.input.release(a)
  for (const a of next) if (!held.has(a)) g.input.press(a)
  held = next
}
let hurt = 0
let last = ui.hearts
for (let i = 0; i < 120 * 30 && b.hp >= 2; i++) {
  const p = g.player
  const dx = b.x + b.w / 2 - (p.x + p.w / 2)
  if (b.mode === 'charge' && Math.abs(dx) < 150 && Math.sign(b.vx) === -Math.sign(dx)) hold(['jump'])
  else if (b.mode === 'stuck') hold(Math.abs(dx) < 110 ? [dx > 0 ? 'right' : 'left', 'dash'] : [dx > 0 ? 'right' : 'left'])
  else hold([])
  ;(g as Any).update(STEP)
  g.input.endStep()
  if (ui.hearts < last) hurt++
  last = ui.hearts
}
console.log(b.hp < 2 ? 'PASS' : 'FAIL', ' W7 phase 3 (charge → hit)  hp', b.hp, 'hits taken', hurt)
