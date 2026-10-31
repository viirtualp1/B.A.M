import { Game } from '../src/game/engine'
import { STEP, T } from '../src/game/constants'
import { ui } from '../src/game/store'
import type { Action } from '../src/game/input'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

export function trace(level: number, tx: number, ty: number, segs: [number, Action[]][], setup?: (g: Game) => void): Game {
  const g = new Game()
  g.startWorld(level)
  const p = g.player
  p.x = tx * T + 7
  p.y = (ty + 1) * T - p.h
  setup?.(g)
  let tt = 0
  let held = new Set<Action>()
  for (const [d, hold] of segs) {
    const next = new Set(hold)
    for (const a of held) if (!next.has(a)) g.input.release(a)
    for (const a of next) if (!held.has(a)) g.input.press(a)
    held = next
    for (let i = 0; i < Math.round(d / STEP); i++) {
      ;(g as Any).update(STEP)
      g.input.endStep()
      tt += STEP
      if (process.env.TRACE && i % 6 === 0) console.log(`t=${tt.toFixed(2)} x=${(p.x / T).toFixed(2)} y=${(p.y / T).toFixed(2)} vx=${p.vx.toFixed(0)} vy=${p.vy.toFixed(0)} g=${p.grounded} sw=${g.sw} dash=${p.canDash} hearts=${ui.hearts} [${hold.join(',')}]`)
    }
  }
  return g
}
