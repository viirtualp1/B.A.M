import { trace } from './trace'
const g = trace(2, 67, 11, [[0.95, ['right']], [0.65, ['right', 'jump']], [0.3, ['right']], [1.4, ['left']], [0.1, []], [0.15, ['left', 'jump']], [0.4, ['jump']], [0.2, []], [0.12, ['jump']], [0.25, ['up', 'dash']], [0.4, []]])
const c = g.crates.find((q) => q.x0 > 70 * 40 && q.x0 < 80 * 40)!
console.log('crate', (c.x / 40).toFixed(2), 'sw', g.sw)
