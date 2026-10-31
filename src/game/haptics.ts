// Vibration on Android via navigator.vibrate; on iPhone (Safari 18+) by toggling a hidden
// <input switch>, which makes iOS fire its native "selection" haptic.
let label: HTMLLabelElement | null = null
/** padIndex ≥ 0 while the player is using a controller: buzzes go to its rumble motors instead. */
export const haptics = { enabled: true, padIndex: -1 }

function iosSwitch(): HTMLLabelElement | null {
  if (label) return label
  if (typeof document === 'undefined') return null
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.id = 'haptic-switch'
  input.setAttribute('switch', '')
  input.style.cssText = 'position:fixed;left:-100px;opacity:0;pointer-events:none'
  label = document.createElement('label')
  label.htmlFor = input.id
  label.style.cssText = 'position:fixed;left:-100px;opacity:0;pointer-events:none'
  document.body.append(input, label)
  return label
}

export type Buzz = 'tap' | 'light' | 'medium' | 'heavy' | 'success'

const PATTERNS: Record<Buzz, number[]> = {
  tap: [8],
  light: [12],
  medium: [25],
  heavy: [40, 40, 40],
  success: [20, 60, 20, 60, 40],
}

const RUMBLE: Record<Buzz, [number, number, number]> = {
  tap: [40, 0, 0.35],
  light: [60, 0.1, 0.5],
  medium: [90, 0.45, 0.6],
  heavy: [200, 1, 0.8],
  success: [450, 0.6, 0.9],
}

function rumble(kind: Buzz): boolean {
  const gp = navigator.getGamepads?.()[haptics.padIndex]
  const act = (gp as (Gamepad & { vibrationActuator?: GamepadHapticActuator | null }) | null)?.vibrationActuator
  if (!act?.playEffect) return false
  const [duration, strongMagnitude, weakMagnitude] = RUMBLE[kind]
  act.playEffect('dual-rumble', { duration, strongMagnitude, weakMagnitude }).catch(() => undefined)
  return true
}

export function buzz(kind: Buzz): void {
  if (!haptics.enabled || typeof navigator === 'undefined') return
  try {
    if (haptics.padIndex >= 0) {
      rumble(kind)
      return
    }
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[kind])
      return
    }
    const l = iosSwitch()
    if (!l) return
    const pulses = kind === 'heavy' ? 2 : kind === 'success' ? 3 : 1
    for (let i = 0; i < pulses; i++) setTimeout(() => l.click(), i * 90)
  } catch {
    // haptics are a nicety
  }
}

const STEP_RUMBLE = { ground: [0.12, 0.05], wood: [0.05, 0.14], soft: [0, 0.04] } as const

/** Controller-only footstep rumble, different per surface. Phones stay quiet for footsteps. */
export function stepRumble(surface: keyof typeof STEP_RUMBLE): void {
  if (!haptics.enabled || haptics.padIndex < 0 || typeof navigator === 'undefined') return
  const gp = navigator.getGamepads?.()[haptics.padIndex]
  const act = (gp as (Gamepad & { vibrationActuator?: GamepadHapticActuator | null }) | null)?.vibrationActuator
  const [strongMagnitude, weakMagnitude] = STEP_RUMBLE[surface]
  act?.playEffect?.('dual-rumble', { duration: 35, strongMagnitude, weakMagnitude }).catch(() => undefined)
}
