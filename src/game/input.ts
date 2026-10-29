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

export class Input {
  private counts = new Map<Action, number>()
  private pressed = new Set<Action>()
  private onKeyDown = (e: KeyboardEvent): void => {
    const actions = KEYMAP[e.code]
    if (!actions) return
    e.preventDefault()
    if (e.repeat) return
    actions.forEach((a) => this.press(a))
  }
  private onKeyUp = (e: KeyboardEvent): void => {
    KEYMAP[e.code]?.forEach((a) => this.release(a))
  }
  private onBlur = (): void => this.counts.clear()

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
