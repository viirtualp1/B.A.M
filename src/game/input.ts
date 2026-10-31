import { haptics } from './haptics'
import { ui } from './store'

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'dash' | 'yarn' | 'pause' | 'mute' | 'confirm'

const KEYMAP: Record<string, Action[]> = {
  ArrowLeft: ['left'],
  KeyA: ['left'],
  ArrowRight: ['right'],
  KeyD: ['right'],
  ArrowUp: ['up', 'jump'],
  KeyW: ['up', 'jump'],
  ArrowDown: ['down'],
  KeyS: ['down'],
  Space: ['jump', 'confirm'],
  KeyZ: ['jump'],
  KeyK: ['jump'],
  ShiftLeft: ['dash'],
  ShiftRight: ['dash'],
  KeyX: ['dash'],
  KeyJ: ['dash'],
  KeyC: ['yarn'],
  KeyL: ['yarn'],
  Enter: ['confirm'],
  Escape: ['pause'],
  KeyP: ['pause'],
  KeyM: ['mute'],
}

// Standard Gamepad mapping (DualSense / DualShock / Xbox all report this layout).
const PAD = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, options: 9, up: 12, down: 13, left: 14, right: 15 }

export class Input {
  private counts = new Map<Action, number>()
  private pressed = new Set<Action>()
  private padHeld = new Set<Action>()
  private onKeyDown = (e: KeyboardEvent): void => {
    const actions = KEYMAP[e.code]
    if (!actions) return
    e.preventDefault()
    if (e.repeat) return
    haptics.padIndex = -1
    ui.inputMode = 'keyboard'
    actions.forEach((a) => this.press(a))
  }
  private onKeyUp = (e: KeyboardEvent): void => {
    KEYMAP[e.code]?.forEach((a) => this.release(a))
  }
  private onBlur = (): void => {
    this.counts.clear()
    this.padHeld.clear()
  }

  press(a: Action): void {
    const c = this.counts.get(a) ?? 0
    if (c === 0) this.pressed.add(a)
    this.counts.set(a, c + 1)
  }

  release(a: Action): void {
    this.counts.set(a, Math.max(0, (this.counts.get(a) ?? 0) - 1))
  }

  down(a: Action): boolean {
    return (this.counts.get(a) ?? 0) > 0
  }

  hit(a: Action): boolean {
    return this.pressed.has(a)
  }

  /** Reads every connected controller and turns its buttons into actions. Returns whether any pad is connected. */
  pollGamepads(): boolean {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return false
    const want = new Set<Action>()
    let connected = false
    for (const gp of navigator.getGamepads()) {
      if (!gp || !gp.connected) continue
      connected = true
      const b = (i: number): boolean => !!gp.buttons[i]?.pressed
      const ax = gp.axes[0] ?? 0
      const ay = gp.axes[1] ?? 0
      const before = want.size
      if (ax < -0.4 || b(PAD.left)) want.add('left')
      if (ax > 0.4 || b(PAD.right)) want.add('right')
      if (ay < -0.5 || b(PAD.up)) want.add('up')
      if (ay > 0.5 || b(PAD.down)) want.add('down')
      if (b(PAD.cross)) { want.add('jump'); want.add('confirm') }
      if (b(PAD.square) || b(PAD.r1) || b(PAD.r2)) want.add('dash')
      if (b(PAD.circle) || b(PAD.l1) || b(PAD.l2)) want.add('yarn')
      if (b(PAD.options)) want.add('pause')
      if (want.size > before && [...want].some((a) => !this.padHeld.has(a))) {
        haptics.padIndex = gp.index
        ui.inputMode = 'pad'
      }
    }
    for (const a of this.padHeld) if (!want.has(a)) this.release(a)
    for (const a of want) if (!this.padHeld.has(a)) this.press(a)
    this.padHeld = want
    return connected
  }

  endStep(): void {
    this.pressed.clear()
  }

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }
}
