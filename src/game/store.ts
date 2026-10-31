import { reactive } from 'vue'

export type CatName = 'billion' | 'million'
export type Screen = 'title' | 'slots' | 'hub' | 'play' | 'paused' | 'clear' | 'end'
export type InputMode = 'touch' | 'keyboard' | 'pad'

export const ui = reactive({
  screen: 'title' as Screen,
  hearts: 3,
  candy: 0,
  levelCandy: 0,
  levelCandyTotal: 0,
  hasKey: false,
  levelNeedsKey: false,
  levelIndex: 0,
  levelCount: 0,
  banner: false,
  rescued: [] as CatName[],
  justRescued: null as CatName | null,
  muted: false,
  levelKittens: [] as boolean[],
  kittensPerWorld: [] as number[],
  bossHp: 0,
  hubFocus: 0,
  inputMode: 'keyboard' as InputMode,
  gamepad: false,
  dashReady: true,
  uiScale: loadUiScale(),
})

function loadUiScale(): number {
  try {
    const v = Number(localStorage.getItem('billion-million-ui-scale'))
    return v >= 0.8 && v <= 1.3 ? v : 1
  } catch {
    return 1
  }
}

export function saveUiScale(v: number): void {
  ui.uiScale = v
  try {
    localStorage.setItem('billion-million-ui-scale', String(v))
  } catch {
    // ignore
  }
}

