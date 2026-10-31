import { trace } from './trace'
for (const a of [0.7, 0.9, 1.1]) {
  const g = trace(2, 111, 11, [[a, ['right']], [0.15, []], [0.08, ['jump']], [0.06, ['right', 'jump']], [0.5, ['jump']], [0.3, []], [0.28, ['jump']], [0.25, ['jump', 'up', 'dash']], [0.6, []]])
  const c = g.crates.find((q) => q.x0 > 112 * 40 && q.x0 < 116 * 40)!
  console.log(a, 'crate', (c.x / 40).toFixed(2), 'p', (g.player.x / 40).toFixed(2), (g.player.y / 40).toFixed(2), 'kit', g.kittens.map((k) => [k.x / 40, k.y / 40, k.found]))
}
