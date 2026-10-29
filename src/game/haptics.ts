// Vibration on Android via navigator.vibrate; on iPhone (Safari 18+) by toggling a hidden
// <input switch>, which makes iOS fire its native "selection" haptic.
let label: HTMLLabelElement | null = null
export const haptics = { enabled: true }

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

export function buzz(kind: Buzz): void {
  if (!haptics.enabled || typeof navigator === 'undefined') return
  try {
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
