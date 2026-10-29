import { reactive } from 'vue'

export type CatName = 'billion' | 'million'
export type Screen = 'title' | 'play' | 'paused' | 'clear' | 'over' | 'end'

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
  savedLevel: 0,
})

const SAVE_KEY = 'billion-million-progress'

export function loadProgress(): number {
  try {
    return Number(localStorage.getItem(SAVE_KEY) ?? 0) || 0
  } catch {
    return 0
  }
}

export function saveProgress(level: number): void {
  try {
    localStorage.setItem(SAVE_KEY, String(level))
  } catch {
    // storage blocked — progress just won't persist
  }
}
