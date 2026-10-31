import { reactive } from 'vue'

export type CostumeId = 'classic' | 'mint' | 'sky' | 'ears' | 'royal' | 'gold'

/** Where to drop Rosie back in when she continues a world she left mid-way. */
export interface Resume {
  world: number
  checkpoint: number
  candies: number[]
  key: boolean
}

export interface SaveData {
  v: 1
  created: number
  updated: number
  playTime: number
  unlocked: number
  cleared: boolean[]
  bestCandy: number[]
  kittens: boolean[][]
  costume: CostumeId
  resume: Resume | null
}

export const SLOT_COUNT = 3
export const KITTENS_PER_WORLD = 3

export const saveState = reactive({ slot: -1, data: null as SaveData | null })

const key = (slot: number): string => `billion-million-slot-${slot}`

export function freshSave(worlds: number): SaveData {
  const now = Date.now()
  return {
    v: 1,
    created: now,
    updated: now,
    playTime: 0,
    unlocked: 0,
    cleared: Array(worlds).fill(false),
    bestCandy: Array(worlds).fill(0),
    kittens: Array.from({ length: worlds }, () => Array(KITTENS_PER_WORLD).fill(false)),
    costume: 'classic',
    resume: null,
  }
}

/** Accepts anything that looks like a save, fills gaps so older or partial saves still load. */
function normalize(raw: unknown, worlds: number): SaveData | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<SaveData>
  if (r.v !== 1) return null
  const base = freshSave(worlds)
  const fit = <T>(arr: unknown, fallback: T[], each: (v: unknown, i: number) => T): T[] =>
    fallback.map((f, i) => (Array.isArray(arr) && i < arr.length ? each(arr[i], i) : f))
  return {
    v: 1,
    created: Number(r.created) || base.created,
    updated: Number(r.updated) || base.updated,
    playTime: Number(r.playTime) || 0,
    unlocked: Math.max(0, Math.min(worlds - 1, Number(r.unlocked) || 0)),
    cleared: fit(r.cleared, base.cleared, (v) => v === true),
    bestCandy: fit(r.bestCandy, base.bestCandy, (v) => Math.max(0, Number(v) || 0)),
    kittens: fit(r.kittens, base.kittens, (v, i) => fit(v, base.kittens[i], (x) => x === true)),
    costume: (['classic', 'mint', 'sky', 'ears', 'royal', 'gold'] as const).includes(r.costume as CostumeId) ? (r.costume as CostumeId) : 'classic',
    resume:
      r.resume && typeof r.resume === 'object' && Number.isInteger(r.resume.world)
        ? {
            world: Math.max(0, Math.min(worlds - 1, r.resume.world)),
            checkpoint: Number(r.resume.checkpoint) || 0,
            candies: Array.isArray(r.resume.candies) ? r.resume.candies.filter(Number.isInteger) : [],
            key: r.resume.key === true,
          }
        : null,
  }
}

export function readSlot(slot: number, worlds: number): SaveData | null {
  try {
    const raw = localStorage.getItem(key(slot))
    return raw ? normalize(JSON.parse(raw), worlds) : null
  } catch {
    return null
  }
}

export function writeSlot(slot: number, data: SaveData): void {
  data.updated = Date.now()
  try {
    localStorage.setItem(key(slot), JSON.stringify(data))
  } catch {
    // storage full or blocked — the save code export still works
  }
}

export function deleteSlot(slot: number): void {
  try {
    localStorage.removeItem(key(slot))
  } catch {
    // ignore
  }
}

/** Persists the active slot. Call after any change to saveState.data. */
export function persist(): void {
  if (saveState.slot >= 0 && saveState.data) writeSlot(saveState.slot, saveState.data)
}

const PREFIX = 'BAM1-'

export function exportCode(data: SaveData): string {
  const json = JSON.stringify(data)
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return PREFIX + btoa(bin)
}

export function importCode(code: string, worlds: number): SaveData | null {
  try {
    const clean = code.trim().replace(/\s+/g, '')
    if (!clean.startsWith(PREFIX)) return null
    const bin = atob(clean.slice(PREFIX.length))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return normalize(JSON.parse(new TextDecoder().decode(bytes)), worlds)
  } catch {
    return null
  }
}

export function kittenCount(d: SaveData | null): number {
  return d ? d.kittens.reduce((n, w) => n + w.filter(Boolean).length, 0) : 0
}

export interface Costume {
  id: CostumeId
  need: number
  dress: string
  bow: string
  accessory: 'bow' | 'star' | 'ears' | 'crown'
}

export const COSTUMES: Costume[] = [
  { id: 'classic', need: 0, dress: '#ff8cc6', bow: '#ff2f7a', accessory: 'bow' },
  { id: 'mint', need: 3, dress: '#7fe0c4', bow: '#ffd84a', accessory: 'star' },
  { id: 'sky', need: 6, dress: '#8cc8ff', bow: '#ffffff', accessory: 'bow' },
  { id: 'ears', need: 9, dress: '#3a3342', bow: '#ff6fae', accessory: 'ears' },
  { id: 'royal', need: 12, dress: '#b48cff', bow: '#ffcf3a', accessory: 'crown' },
  { id: 'gold', need: 18, dress: '#ffcf5a', bow: '#ff5fa8', accessory: 'crown' },
]

export function costumeOf(d: SaveData | null): Costume {
  return COSTUMES.find((c) => c.id === d?.costume) ?? COSTUMES[0]
}
