import { MAX_HEARTS, PHYS, STEP, T, VIEW_H } from './constants'
import { Input } from './input'
import { audio, type Sfx } from './audio'
import { buzz, stepRumble, type Buzz } from './haptics'
import { buildLevels, type LevelDef, type SignDef } from './levels'
import { ui, type CatName } from './store'
import { KITTENS_PER_WORLD, persist, saveState } from './save'
import { render } from './render'

export interface Body {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  grounded: boolean
  hitL: boolean
  hitR: boolean
  hitTop: boolean
  gtx: number
  gty: number
}

export interface Hook { x: number; y: number }

export interface Player extends Body {
  facing: 1 | -1
  coyote: number
  jumpBuf: number
  canDash: boolean
  dashT: number
  dashCd: number
  canHover: boolean
  airT: number
  hoverT: number
  dashDir: { x: number; y: number }
  lockT: number
  inv: number
  noCut: boolean
  onWallL: boolean
  onWallR: boolean
  grapple: { hook: Hook; len: number; t: number } | null
  sx: number
  sy: number
  runT: number
  ghosts: { x: number; y: number; a: number; f: number }[]
  plat: Platform | null
}

export type EnemyKind = 'walker' | 'spiky' | 'bee' | 'frog' | 'shooter'
export interface Platform { x: number; y: number; w: number; h: number; x0: number; y0: number; axis: 'x' | 'y'; dx: number; dy: number; phase: number }
export interface Gem { x: number; y: number; t: number }
export interface Seed { x: number; y: number; vx: number; t: number }

export interface Enemy extends Body {
  kind: EnemyKind
  dir: 1 | -1
  alive: boolean
  squash: number
  t: number
  x0: number
  y0: number
  timer: number
  /** 0 idle/patrol, 1 winding up (telegraph), 2 attacking, 3 returning */
  state: number
  tx: number
  ty: number
}
export interface Kitten { x: number; y: number; idx: number; found: boolean; t: number }
export type BossPhase = 'intro' | 'slam' | 'shield' | 'charge' | 'defeated'
export interface Boss {
  x: number
  y: number
  w: number
  h: number
  hp: number
  phase: BossPhase
  /** sub-state inside a phase */
  mode: 'float' | 'wind' | 'drop' | 'dazed' | 'rise' | 'charge' | 'stuck'
  t: number
  vx: number
  flash: number
  dir: 1 | -1
  spawnT: number
}
export interface Drop { x: number; y: number; vy: number; dead: boolean }
export interface Wave { x: number; dir: 1 | -1; t: number }
export interface Candy { x: number; y: number; taken: boolean; t: number; hue: number }
export interface Orb { x: number; y: number; inside: boolean; flash: number; timed: boolean }
export interface Crate extends Body { x0: number; y0: number; lost: number }
export interface Plate { tx: number; ty: number; pressed: boolean; open: number }
export interface Checkpoint { x: number; y: number; active: boolean; t: number }
export interface Cage { x: number; y: number; cat: CatName; open: boolean; t: number }
export interface KeyItem { x: number; y: number; taken: boolean }
export interface Crumble { state: 0 | 1 | 2; t: number }
export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number
  size: number; color: string; kind: 'dot' | 'star' | 'heart' | 'chunk'; g: number; rot: number
}

const k = (tx: number, ty: number): string => tx + ',' + ty
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v))
const approach = (v: number, target: number, d: number): number => (v < target ? Math.min(v + d, target) : Math.max(v - d, target))
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export class Game {
  readonly input = new Input()
  readonly levels: LevelDef[] = buildLevels()
  level!: LevelDef
  grid: string[][] = []
  W = 0
  H = 0
  player!: Player
  enemies: Enemy[] = []
  candies: Candy[] = []
  kittens: Kitten[] = []
  boss: Boss | null = null
  drops: Drop[] = []
  waves: Wave[] = []
  /** real-time effects: freeze frames, slow motion, camera reveals, off-screen pointers, respawn iris */
  hitstop = 0
  slowT = 0
  slowScale = 1
  focus: { x: number; y: number; t: number } | null = null
  pointer: { x: number; y: number; t: number } | null = null
  iris = 0
  private revealed = new Set<object>()
  private mewT = 0
  private stepPhase = 0
  private checkpointIdx = -1
  private playClock = 0
  gems: Gem[] = []
  platforms: Platform[] = []
  seeds: Seed[] = []
  signNear: { sign: SignDef; a: number } | null = null
  hooks: Hook[] = []
  orbs: Orb[] = []
  crates: Crate[] = []
  plates: Plate[] = []
  gatePlate = new Map<string, number>()
  swTimer = 0
  private tickT = 0
  checkpoints: Checkpoint[] = []
  goal: { x: number; y: number } | null = null
  cage: Cage | null = null
  key: KeyItem | null = null
  signs: SignDef[] = []
  crumbles = new Map<string, Crumble>()
  jellies = new Map<string, number>()
  ghost = new Set<string>()
  sw: 0 | 1 = 0
  particles: Particle[] = []
  cam = { x: 0, y: 0 }
  shake = 0
  time = 0
  respawn = { x: 0, y: 0 }
  start = { x: 0, y: 0 }
  followers: CatName[] = []
  trail: { x: number; y: number; f: number; moving: boolean }[] = []
  grappleTarget: Hook | null = null
  clearT = 0
  lockedTipT = 0
  private signFade = new Map<SignDef, number>()
  viewW = 960
  viewH = VIEW_H
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private raf = 0
  private last = 0
  private acc = 0
  private scale = 1
  private dpr = 1

  constructor() {
    ui.levelCount = this.levels.length
    ui.kittensPerWorld = this.levels.map((l) => Math.min(KITTENS_PER_WORLD, l.grid.flat().filter((c) => c === 'n').length))
    this.loadLevel(0)
  }

  // ───────────────────────── lifecycle ─────────────────────────

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.input.attach()
    this.resize()
    window.addEventListener('resize', this.resize)
    this.last = performance.now()
    const frame = (now: number): void => {
      const dt = Math.min(0.1, (now - this.last) / 1000)
      this.last = now
      this.acc += dt
      const pad = this.input.pollGamepads()
      if (pad !== ui.gamepad) ui.gamepad = pad
      let steps = 0
      while (this.acc >= STEP && steps < 8) {
        this.update(STEP * this.timeScale())
        this.tickRealTime(STEP)
        this.input.endStep()
        this.acc -= STEP
        steps++
      }
      if (steps === 8) this.acc = 0
      audio.tick()
      this.draw()
      this.raf = requestAnimationFrame(frame)
    }
    this.raf = requestAnimationFrame(frame)
  }

  private timeScale(): number {
    if (ui.screen !== 'play') return 1
    if (this.hitstop > 0) return 0
    if (this.focus && this.focus.t > 0) return 0.25
    return this.slowT > 0 ? this.slowScale : 1
  }

  private tickRealTime(dt: number): void {
    this.hitstop = Math.max(0, this.hitstop - dt)
    this.slowT = Math.max(0, this.slowT - dt)
    if (this.focus) { this.focus.t -= dt; if (this.focus.t <= -0.6) this.focus = null }
    if (this.pointer) { this.pointer.t -= dt; if (this.pointer.t <= 0) this.pointer = null }
    this.iris = Math.max(0, this.iris - dt * 2.2)
    if (ui.screen === 'play' && saveState.data) {
      this.playClock += dt
      if (this.playClock >= 5) { saveState.data.playTime += this.playClock; this.playClock = 0 }
    }
  }

  freeze(t: number): void {
    this.hitstop = Math.max(this.hitstop, t)
  }

  slowmo(t: number, scale: number): void {
    this.slowT = Math.max(this.slowT, t)
    this.slowScale = scale
  }

  unmount(): void {
    cancelAnimationFrame(this.raf)
    this.input.detach()
    window.removeEventListener('resize', this.resize)
  }

  resize = (): void => {
    if (!this.canvas) return
    const w = window.innerWidth
    const h = window.innerHeight
    // Short landscape phones get a closer camera so Rosie isn't tiny; the boss arena always fits whole.
    this.viewH = this.boss ? this.H * T : h < 500 ? 420 : VIEW_H
    this.viewW = Math.round(clamp((w / h) * this.viewH, 600, 1280))
    this.scale = Math.min(w / this.viewW, h / this.viewH)
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.style.width = this.viewW * this.scale + 'px'
    this.canvas.style.height = this.viewH * this.scale + 'px'
    this.canvas.width = Math.round(this.viewW * this.scale * this.dpr)
    this.canvas.height = Math.round(this.viewH * this.scale * this.dpr)
  }

  private draw(): void {
    if (!this.ctx) return
    const s = this.scale * this.dpr
    this.ctx.setTransform(s, 0, 0, s, 0, 0)
    render(this.ctx, this)
  }

  // ───────────────────────── flow ─────────────────────────

  /** Starts a world. With resume, Rosie reappears at the checkpoint saved in this slot. */
  startWorld(i: number, resume = false): void {
    audio.unlock()
    this.loadLevel(i)
    const r = saveState.data?.resume
    if (resume && r && r.world === i) {
      const cp = this.checkpoints[r.checkpoint]
      if (cp) {
        this.activateCheckpoint(cp, false)
        Object.assign(this.player, this.makePlayer(this.respawn.x, this.respawn.y))
        this.trail.forEach((q) => { q.x = cp.x; q.y = cp.y })
        this.snapCamera()
      }
      for (const idx of r.candies) if (this.candies[idx]) this.candies[idx].taken = true
      ui.levelCandy = this.candies.filter((c) => c.taken).length
      if (r.key && this.key) { this.key.taken = true; ui.hasKey = true }
    }
    ui.screen = 'play'
    this.showBanner()
    audio.startSong(i)
  }

  restartLevel(): void {
    if (saveState.data) { saveState.data.resume = null; persist() }
    this.startWorld(ui.levelIndex)
  }

  toHub(): void {
    ui.screen = 'hub'
    audio.startSong(1)
  }

  togglePause(): void {
    if (ui.screen === 'play') ui.screen = 'paused'
    else if (ui.screen === 'paused') ui.screen = 'play'
  }

  toggleMute(): void {
    ui.muted = !ui.muted
    audio.setMuted(ui.muted)
  }

  private showBanner(): void {
    ui.banner = true
    globalThis.setTimeout(() => (ui.banner = false), 2600)
  }

  loadLevel(i: number): void {
    const def = this.levels[i]
    this.level = def
    this.W = def.W
    this.H = def.H
    this.grid = def.grid.map((r) => r.slice())
    this.enemies = []
    this.candies = []
    this.kittens = []
    this.boss = null
    this.drops = []
    this.waves = []
    this.revealed.clear()
    this.focus = null
    this.pointer = null
    this.checkpointIdx = -1
    this.gems = []
    this.platforms = []
    this.seeds = []
    this.signFade.clear()
    this.signNear = null
    this.lockedTipT = 0
    this.hooks = []
    this.orbs = []
    this.checkpoints = []
    this.goal = null
    this.cage = null
    this.key = null
    this.signs = def.signs
    this.crumbles.clear()
    this.jellies.clear()
    this.ghost.clear()
    this.crates = []
    this.plates = []
    this.gatePlate.clear()
    this.swTimer = 0
    this.particles = []
    this.sw = 0
    this.clearT = 0

    for (let ty = 0; ty < this.H; ty++) {
      for (let tx = 0; tx < this.W; tx++) {
        const c = this.grid[ty][tx]
        const cx = tx * T + T / 2
        const cy = ty * T + T / 2
        let clear = true
        switch (c) {
          case '@': this.start = { x: cx - 13, y: (ty + 1) * T - 30 }; break
          case '*': this.candies.push({ x: cx, y: cy, taken: false, t: Math.random() * 6, hue: (tx * 7 + ty) % 3 }); break
          case 'r': this.gems.push({ x: cx, y: cy, t: 0 }); break
          case 'm': case 'v':
            this.platforms.push({ x: tx * T, y: ty * T, w: 3 * T, h: 16, x0: tx * T, y0: ty * T, axis: c === 'm' ? 'x' : 'y', dx: 0, dy: 0, phase: 0 })
            break
          case 'o': this.hooks.push({ x: cx, y: cy }); break
          case 'S': case 'T': this.orbs.push({ x: cx, y: cy, inside: false, flash: 0, timed: c === 'T' }); break
          case 'K':
            this.crates.push({
              x: tx * T + 1, y: ty * T + 2, w: T - 2, h: T - 2, vx: 0, vy: 0, grounded: false, hitL: false, hitR: false, hitTop: false,
              gtx: 0, gty: 0, x0: tx * T + 1, y0: ty * T + 2, lost: 0,
            })
            break
          case '_': this.plates.push({ tx, ty, pressed: false, open: 0 }); clear = false; break
          case 'k': this.key = { x: cx, y: cy, taken: false }; break
          case 'n': {
            const idx = this.kittens.length
            const found = saveState.data?.kittens[i]?.[idx] ?? false
            if (idx < KITTENS_PER_WORLD) this.kittens.push({ x: cx, y: (ty + 1) * T, idx, found, t: Math.random() * 5 })
            break
          }
          case 'Z':
            this.boss = { x: cx - 75, y: -200, w: 150, h: 110, hp: 6, phase: 'intro', mode: 'float', t: 0, vx: 0, flash: 0, dir: -1, spawnT: 3 }
            break
          case 'F': this.checkpoints.push({ x: cx, y: (ty + 1) * T, active: false, t: 0 }); break
          case 'G': this.goal = { x: cx, y: (ty + 1) * T }; break
          case 'X': this.cage = { x: cx, y: (ty + 1) * T, cat: def.cat ?? 'billion', open: false, t: 0 }; break
          case 'e': this.addEnemy('walker', cx, (ty + 1) * T); break
          case 'h': this.addEnemy('spiky', cx, (ty + 1) * T); break
          case 'b': this.addEnemy('bee', cx, cy + 13); break
          case 'f': this.addEnemy('frog', cx, (ty + 1) * T); break
          case 'g': this.addEnemy('shooter', cx, (ty + 1) * T); break
          case 'c': this.crumbles.set(k(tx, ty), { state: 0, t: 0 }); clear = false; break
          default: clear = false
        }
        if (clear) this.grid[ty][tx] = ' '
      }
    }

    for (let ty = 0; ty < this.H; ty++)
      for (let tx = 0; tx < this.W; tx++) {
        if (this.grid[ty][tx] !== '|') continue
        let best = -1
        let bd = Infinity
        this.plates.forEach((pl, i) => {
          const d = Math.abs(pl.tx - tx) + Math.abs(pl.ty - ty) * 0.5
          if (d < bd) { bd = d; best = i }
        })
        this.gatePlate.set(k(tx, ty), best)
      }
    this.respawn = { ...this.start }
    this.player = this.makePlayer(this.start.x, this.start.y)
    // cats already rescued in this save follow Rosie (the one caged in this world only after she frees it)
    this.followers = this.levels
      .map((l, wi) => (saveState.data?.cleared[wi] && wi !== i ? l.cat : null))
      .filter((c): c is CatName => !!c)
    this.trail = []
    for (let n = 0; n < 200; n++) this.trail.push({ x: this.start.x + 13, y: this.start.y + 30, f: 1, moving: false })
    this.snapCamera()

    ui.levelIndex = i
    ui.hearts = MAX_HEARTS
    ui.levelCandy = 0
    ui.levelCandyTotal = this.candies.length
    ui.hasKey = false
    ui.levelNeedsKey = !!this.key
    ui.rescued = [...this.followers]
    ui.justRescued = null
    ui.levelKittens = this.kittens.map((kt) => kt.found)
    ui.bossHp = this.boss ? this.boss.hp : 0
    this.resize()
    this.snapCamera()
  }

  private snapCamera(): void {
    this.cam.x = clamp(this.player.x + this.player.w / 2 - this.viewW / 2, 0, this.W * T - this.viewW)
    this.cam.y = clamp(this.player.y - this.viewH * 0.55, 0, this.H * T - this.viewH)
  }

  private addEnemy(kind: EnemyKind, cx: number, bottom: number): void {
    const w = kind === 'shooter' ? 28 : 30
    const h = kind === 'shooter' ? 34 : 26
    this.enemies.push({
      kind, x: cx - w / 2, y: bottom - h, w, h, vx: 0, vy: 0, grounded: false, hitL: false, hitR: false, hitTop: false,
      gtx: 0, gty: 0, dir: -1, alive: true, squash: 0, t: Math.random() * 5, x0: cx - w / 2, y0: bottom - h, timer: 1 + Math.random(), state: 0, tx: 0, ty: 0,
    })
  }

  private makePlayer(x: number, y: number): Player {
    return {
      x, y, w: 26, h: 30, vx: 0, vy: 0, grounded: false, hitL: false, hitR: false, hitTop: false, gtx: 0, gty: 0,
      facing: 1, coyote: 0, jumpBuf: 0, canDash: true, dashT: 0, dashCd: 0, canHover: true, hoverT: 0, airT: 0, dashDir: { x: 1, y: 0 }, lockT: 0, inv: 0,
      noCut: false, onWallL: false, onWallR: false, grapple: null, sx: 1, sy: 1, runT: 0, ghosts: [], plat: null,
    }
  }

  // ───────────────────────── tiles ─────────────────────────

  char(tx: number, ty: number): string {
    if (tx < 0 || tx >= this.W) return '#'
    // walls that reach the top row continue upward, so they can't be climbed over
    if (ty < 0) return this.grid[0][tx] === '#' || this.grid[0][tx] === 'P' || this.grid[0][tx] === 'B' ? this.grid[0][tx] : ' '
    if (ty >= this.H) return ' '
    return this.grid[ty][tx]
  }

  solid(tx: number, ty: number, forPlayer: boolean): boolean {
    const c = this.char(tx, ty)
    switch (c) {
      case '#': case 'C': case 'J': return true
      case 'P': return this.sw === 0 && !(forPlayer && this.ghost.has(k(tx, ty)))
      case 'B': return this.sw === 1 && !(forPlayer && this.ghost.has(k(tx, ty)))
      case '|': return !this.gateOpen(tx, ty) && !(forPlayer && this.ghost.has(k(tx, ty)))
      default: return false
    }
  }

  gateOpen(tx: number, ty: number): boolean {
    const i = this.gatePlate.get(k(tx, ty)) ?? -1
    return i >= 0 && this.plates[i].pressed
  }

  oneWay(tx: number, ty: number): boolean {
    const c = this.char(tx, ty)
    if (c === '-') return true
    if (c === 'c') return (this.crumbles.get(k(tx, ty))?.state ?? 0) < 2
    return false
  }

  private boxHitsSolid(x: number, y: number, w: number, h: number): boolean {
    for (let ty = Math.floor(y / T); ty <= Math.floor((y + h - 0.01) / T); ty++)
      for (let tx = Math.floor(x / T); tx <= Math.floor((x + w - 0.01) / T); tx++)
        if (this.solid(tx, ty, true)) return true
    return false
  }

  private moveBody(b: Body, dt: number, isPlayer: boolean): void {
    b.hitL = b.hitR = b.hitTop = false
    const wasGrounded = b.grounded
    b.grounded = false
    const dashing = isPlayer && this.player.dashT > 0

    if (b.vx !== 0) {
      b.x += b.vx * dt
      const y0 = Math.floor((b.y + 0.5) / T)
      const y1 = Math.floor((b.y + b.h - 0.5) / T)
      const tx = b.vx > 0 ? Math.floor((b.x + b.w - 0.001) / T) : Math.floor(b.x / T)
      for (let ty = y0; ty <= y1; ty++) {
        if (!this.solid(tx, ty, isPlayer)) continue
        if (dashing && this.char(tx, ty) === 'C') { this.breakBlock(tx, ty); continue }
        if (b.vx > 0) { b.x = tx * T - b.w; b.hitR = true } else { b.x = (tx + 1) * T; b.hitL = true }
        b.vx = 0
        break
      }
      for (const c of this.crates) {
        if (c === b || !overlap(b, c)) continue
        const fromLeft = b.x + b.w / 2 < c.x + c.w / 2
        if (isPlayer && wasGrounded && c.grounded) {
          const want = fromLeft ? b.x + b.w - c.x : b.x - (c.x + c.w)
          this.pushCrate(c, Math.sign(want) * Math.min(Math.abs(want), 130 * dt))
        }
        if (!overlap(b, c)) continue
        const pushing = isPlayer && wasGrounded && c.grounded
        if (fromLeft) { b.x = c.x - b.w; b.hitR = !pushing } else { b.x = c.x + c.w; b.hitL = !pushing }
        // keep a steady walking-push speed instead of stopping dead every frame
        b.vx = pushing ? Math.sign(b.vx) * Math.min(Math.abs(b.vx), 130) : 0
      }
    }

    const prevBottom = b.y + b.h
    const prevTop = b.y
    b.y += b.vy * dt
    const x0 = Math.floor((b.x + 0.5) / T)
    const x1 = Math.floor((b.x + b.w - 0.5) / T)
    const mid = Math.floor((b.x + b.w / 2) / T)
    if (b.vy > 0) {
      const ty = Math.floor((b.y + b.h - 0.001) / T)
      let hit = -1
      for (let tx = x0; tx <= x1; tx++) {
        const ok = this.solid(tx, ty, isPlayer) || (this.oneWay(tx, ty) && prevBottom <= ty * T + 1)
        if (ok && (hit < 0 || tx === mid)) hit = tx
      }
      if (hit >= 0) {
        b.y = ty * T - b.h
        b.vy = 0
        b.grounded = true
        b.gtx = hit
        b.gty = ty
      }
      for (const c of this.crates) {
        if (c === b || b.x + b.w <= c.x + 1 || b.x >= c.x + c.w - 1) continue
        if (prevBottom <= c.y + 1 && b.y + b.h >= c.y) {
          b.y = c.y - b.h
          b.vy = 0
          b.grounded = true
          b.gtx = -1
          b.gty = -1
        }
      }
      if (isPlayer) {
        this.player.plat = null
        for (const pl of this.platforms) {
          if (b.x + b.w <= pl.x + 2 || b.x >= pl.x + pl.w - 2) continue
          if (prevBottom <= pl.y + 2 && b.y + b.h >= pl.y) {
            b.y = pl.y - b.h
            b.vy = 0
            b.grounded = true
            b.gtx = -1
            b.gty = -1
            this.player.plat = pl
          }
        }
      }
    } else if (b.vy < 0) {
      const ty = Math.floor(b.y / T)
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.solid(tx, ty, isPlayer)) continue
        if (dashing && this.char(tx, ty) === 'C') { this.breakBlock(tx, ty); continue }
        b.y = (ty + 1) * T
        b.vy = 0
        b.hitTop = true
        break
      }
      for (const c of this.crates) {
        if (c === b || b.x + b.w <= c.x + 1 || b.x >= c.x + c.w - 1) continue
        if (prevTop >= c.y + c.h - 1 && b.y < c.y + c.h) {
          b.y = c.y + c.h
          b.vy = 0
          b.hitTop = true
        }
      }
    }
  }

  private pushCrate(c: Crate, dx: number): void {
    if (dx === 0) return
    c.x += dx
    const tx = dx > 0 ? Math.floor((c.x + c.w - 0.001) / T) : Math.floor(c.x / T)
    for (let ty = Math.floor((c.y + 0.5) / T); ty <= Math.floor((c.y + c.h - 0.5) / T); ty++) {
      if (!this.solid(tx, ty, false)) continue
      c.x = dx > 0 ? tx * T - c.w : (tx + 1) * T
      return
    }
    for (const o of this.crates) {
      if (o === c || !overlap(c, o)) continue
      c.x = dx > 0 ? o.x - c.w : o.x + o.w
    }
  }

  private wallAt(x: number, p: Body): boolean {
    const tx = Math.floor(x / T)
    for (let ty = Math.floor((p.y + 4) / T); ty <= Math.floor((p.y + p.h - 4) / T); ty++) if (this.solid(tx, ty, true)) return true
    return false
  }

  private breakBlock(tx: number, ty: number): void {
    this.grid[ty][tx] = ' '
    this.sfx('crack')
    this.buzz('medium')
    this.shake = Math.max(this.shake, 0.18)
    for (let i = 0; i < 10; i++)
      this.spawn(tx * T + Math.random() * T, ty * T + Math.random() * T, (Math.random() - 0.5) * 400, -Math.random() * 400, 0.8, 6 + Math.random() * 5, '#e2bf93', 'chunk', 1600)
  }

  // ───────────────────────── update ─────────────────────────

  private update(dt: number): void {
    this.time += dt
    const I = this.input
    if (I.hit('mute')) this.toggleMute()

    if (ui.screen !== 'play' && ui.screen !== 'paused' && ui.screen !== 'clear') {
      this.updateParticles(dt)
      return
    }
    if (I.hit('pause')) this.togglePause()
    else if (ui.screen === 'paused' && I.hit('confirm')) this.togglePause()
    if (ui.screen === 'paused') return

    if (ui.screen === 'clear') {
      this.clearT -= dt
      if (this.cage) this.cage.t += dt
      this.player.vx = approach(this.player.vx, 0, 2000 * dt)
      this.player.vy = Math.min(this.player.vy + PHYS.gravity * dt, PHYS.maxFall)
      this.moveBody(this.player, dt, true)
      this.pushTrail()
      this.updateParticles(dt)
      if (Math.random() < 0.25) this.confetti()
      if (this.clearT <= 0 || (this.clearT < 2.2 && I.hit('confirm'))) this.afterClear()
      return
    }

    this.updatePlatforms(dt)
    this.updateSwitchesAndGates(dt)
    this.updatePlayer(dt)
    this.updateEnemies(dt)
    if (this.boss) this.updateBoss(dt)
    this.updateSeeds(dt)
    this.updateItems(dt)
    this.updateTiles(dt)
    this.updateParticles(dt)
    this.updateCamera(dt)
  }

  private updatePlayer(dt: number): void {
    const p = this.player
    const I = this.input
    const dir = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0)
    const dirY = (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0)

    if (p.plat && p.grounded) {
      const nx = p.x + p.plat.dx
      if (!this.boxHitsSolid(nx, p.y, p.w, p.h)) p.x = nx
      p.y = p.plat.y - p.h
    }
    p.inv -= dt
    p.lockT -= dt
    p.coyote -= dt
    p.jumpBuf -= dt
    if (I.hit('jump')) p.jumpBuf = PHYS.jumpBuffer
    p.airT = p.grounded ? 0 : p.airT + dt
    if (p.grounded) {
      p.coyote = PHYS.coyote
      p.canHover = true
      p.hoverT = 0
      if (p.dashT <= 0) p.canDash = true
    }

    this.grappleTarget = p.grapple ? null : this.findHook()
    if (I.hit('yarn')) {
      if (p.grapple) this.releaseGrapple(false)
      else this.attachGrapple()
    }

    p.dashCd -= dt
    if (I.hit('dash') && p.canDash && p.dashT <= 0 && p.dashCd <= 0) {
      let dx = dir
      let dy = dirY
      if (dx === 0 && dy === 0) dx = p.facing
      if (p.grounded && dy > 0) dy = 0
      const len = Math.hypot(dx, dy)
      p.dashDir = { x: dx / len, y: dy / len }
      p.dashT = PHYS.dashTime
      p.dashCd = PHYS.dashTime + PHYS.dashCooldown
      p.canDash = false
      p.grapple = null
      p.noCut = false
      p.sx = 1.35
      p.sy = 0.75
      this.sfx('dash')
      this.buzz('light')
      this.shake = Math.max(this.shake, 0.08)
      for (let i = 0; i < 8; i++)
        this.spawn(p.x + p.w / 2, p.y + p.h / 2, -p.dashDir.x * 200 + (Math.random() - 0.5) * 160, -p.dashDir.y * 200 + (Math.random() - 0.5) * 160, 0.4, 4, '#ffd1e4', 'dot', 0)
    }

    if (p.dashT > 0) {
      p.dashT -= dt
      p.vx = p.dashDir.x * PHYS.dashSpeed
      p.vy = p.dashDir.y * PHYS.dashSpeed
      if (Math.floor(this.time * 60) % 2 === 0) p.ghosts.push({ x: p.x, y: p.y, a: 0.55, f: p.facing })
      if (p.dashDir.x !== 0) p.facing = p.dashDir.x > 0 ? 1 : -1
      if (p.dashT <= 0) {
        p.vx *= 0.55
        p.vy *= 0.45
      }
    } else if (p.grapple) {
      const g = p.grapple
      g.t = Math.min(1, g.t + dt * 10)
      g.len = approach(g.len, Math.min(g.len, PHYS.grappleReel), 380 * dt)
      p.vy += PHYS.gravity * dt
      const cx = p.x + p.w / 2
      const cy = p.y + p.h / 2
      const d = Math.hypot(cx - g.hook.x, cy - g.hook.y) || 1
      let tx = -(cy - g.hook.y) / d
      let ty = (cx - g.hook.x) / d
      if (tx * dir < 0) { tx = -tx; ty = -ty }
      if (dir !== 0) {
        p.vx += tx * PHYS.swingForce * dt
        p.vy += ty * PHYS.swingForce * dt
        p.facing = dir > 0 ? 1 : -1
      }
      p.vx *= 1 - 0.15 * dt
    } else {
      if (p.lockT <= 0) {
        const target = dir * PHYS.run
        const a = p.grounded ? (dir ? PHYS.accelGround : PHYS.friction) : dir ? PHYS.accelAir : PHYS.accelAir * 0.35
        p.vx = approach(p.vx, target, a * dt)
        if (dir) p.facing = dir > 0 ? 1 : -1
      }
      if (p.vy >= 0) p.noCut = false
      const cut = p.vy < 0 && !I.down('jump') && !p.noCut
      p.vy = Math.min(p.vy + (cut ? PHYS.gravityCut : PHYS.gravity) * dt, PHYS.maxFall)
      // Hover (press jump again in mid-air and hold): a short, gentle float like a Powerpuff hero.
      if (p.hoverT > 0) {
        if (!I.down('jump') || p.grounded) p.hoverT = 0
        else {
          p.hoverT -= dt
          if (p.vy > PHYS.hoverFall) p.vy = approach(p.vy, PHYS.hoverFall, 5000 * dt)
          if (Math.random() < 0.6) this.spawn(p.x + p.w / 2 + (Math.random() - 0.5) * 20, p.y + p.h, (Math.random() - 0.5) * 40, 60, 0.4, 3.5, Math.random() < 0.5 ? '#ff9fcb' : '#ffffff', 'star', 0)
        }
      }
      if (!p.grounded && p.vy > 0 && ((p.onWallL && dir < 0) || (p.onWallR && dir > 0))) {
        p.vy = Math.min(p.vy, PHYS.wallSlide)
        if (Math.random() < 0.3) this.spawn(p.onWallL ? p.x : p.x + p.w, p.y + p.h, 0, -30, 0.35, 3, '#ffffff', 'dot', 0)
      }
    }

    if (p.jumpBuf > 0 && p.dashT <= 0) {
      if (p.grapple) {
        this.releaseGrapple(true)
        p.jumpBuf = 0
      } else if (p.coyote > 0) {
        p.vy = -PHYS.jumpV
        p.coyote = 0
        p.jumpBuf = 0
        p.grounded = false
        p.sx = 0.72
        p.sy = 1.32
        this.sfx('jump')
        this.dust(p.x + p.w / 2, p.y + p.h, 5)
      } else if (p.onWallL || p.onWallR) {
        const side = p.onWallL ? 1 : -1
        const toward = (p.onWallL && dir < 0) || (p.onWallR && dir > 0)
        p.vx = side * (toward ? PHYS.wallClimbVX : PHYS.wallJumpVX)
        p.vy = -PHYS.wallJumpVY
        p.lockT = toward ? 0.09 : 0.16
        p.facing = side > 0 ? 1 : -1
        p.jumpBuf = 0
        p.sx = 0.75
        p.sy = 1.3
        this.sfx('jump')
        this.dust(p.onWallL ? p.x : p.x + p.w, p.y + p.h / 2, 4)
        p.canHover = true
      } else if (I.hit('jump') && p.canHover && !p.grounded && p.airT > 0.12) {
        // a press just before landing stays buffered as a jump; only a real mid-air press floats
        p.canHover = false
        p.hoverT = PHYS.hoverTime
        this.sfx('hover')
        this.buzz('tap')
      }
    }

    const sp = Math.hypot(p.vx, p.vy)
    if (sp > PHYS.maxSpeed) {
      p.vx *= PHYS.maxSpeed / sp
      p.vy *= PHYS.maxSpeed / sp
    }

    const wasGrounded = p.grounded
    const preVy = p.vy
    this.moveBody(p, dt, true)
    if (p.x < 0) { p.x = 0; p.vx = 0 }
    if (p.x > this.W * T - p.w) { p.x = this.W * T - p.w; p.vx = 0 }

    if (p.grapple) {
      const g = p.grapple
      const cx = p.x + p.w / 2
      const cy = p.y + p.h / 2
      const dx = cx - g.hook.x
      const dy = cy - g.hook.y
      const d = Math.hypot(dx, dy)
      if (d > g.len) {
        const nx = dx / d
        const ny = dy / d
        const nxp = g.hook.x + nx * g.len - p.w / 2
        const nyp = g.hook.y + ny * g.len - p.h / 2
        if (!this.boxHitsSolid(nxp, nyp, p.w, p.h)) { p.x = nxp; p.y = nyp }
        const vr = p.vx * nx + p.vy * ny
        if (vr > 0) { p.vx -= nx * vr; p.vy -= ny * vr }
      }
    }

    if (p.grounded && !wasGrounded && preVy > 260) {
      p.sx = 1.3
      p.sy = 0.72
      this.dust(p.x + p.w / 2, p.y + p.h, 4)
      if (preVy > 500) { this.sfx('land'); this.buzz(this.oneWay(p.gtx, p.gty) ? 'tap' : 'light') }
    }
    if (p.grounded && Math.abs(p.vx) > 90) {
      const phase = Math.floor(p.runT * 6 / Math.PI)
      if (phase !== this.stepPhase) {
        this.stepPhase = phase
        stepRumble(this.oneWay(p.gtx, p.gty) ? 'soft' : p.gtx < 0 ? 'wood' : 'ground')
      }
    }

    if (p.grounded) {
      const gc = this.char(p.gtx, p.gty)
      if (gc === 'J') {
        p.vy = -PHYS.jelly
        p.grounded = false
        p.noCut = true
        p.canDash = true
        p.sx = 0.7
        p.sy = 1.38
        this.jellies.set(k(p.gtx, p.gty), 1)
        this.sfx('bounce')
        this.buzz('medium')
        for (let i = 0; i < 6; i++)
          this.spawn(p.gtx * T + T / 2, p.gty * T, (Math.random() - 0.5) * 300, -Math.random() * 200, 0.5, 4, '#ff9fcb', 'dot', 900)
      } else if (gc === 'c') {
        const c = this.crumbles.get(k(p.gtx, p.gty))
        if (c && c.state === 0) { c.state = 1; c.t = 0.5 }
      }
    }

    p.onWallL = !p.grounded && this.wallAt(p.x - 2, p)
    p.onWallR = !p.grounded && this.wallAt(p.x + p.w + 2, p)

    p.sx += (1 - p.sx) * Math.min(1, dt * 12)
    p.sy += (1 - p.sy) * Math.min(1, dt * 12)
    p.runT += p.grounded ? Math.abs(p.vx) * dt * 0.06 : 0
    for (const g of p.ghosts) g.a -= dt * 2.5
    p.ghosts = p.ghosts.filter((g) => g.a > 0)

    for (let ty = Math.floor((p.y + 10) / T); ty <= Math.floor((p.y + p.h - 1) / T); ty++)
      for (let tx = Math.floor((p.x + 5) / T); tx <= Math.floor((p.x + p.w - 5) / T); tx++)
        if (this.char(tx, ty) === '^' && p.y + p.h > ty * T + 16) this.hurt(tx * T + T / 2)

    if (p.y > this.H * T + 80) this.fallOut()

    for (const key of this.ghost) {
      const [tx, ty] = key.split(',').map(Number)
      if (!overlap(p, { x: tx * T, y: ty * T, w: T, h: T })) this.ghost.delete(key)
    }

    const ready = p.canDash && p.dashCd <= 0
    if (ui.dashReady !== ready) ui.dashReady = ready
    this.pushTrail()
  }

  private pushTrail(): void {
    const p = this.player
    this.trail.push({ x: p.x + p.w / 2, y: p.y + p.h, f: p.facing, moving: Math.abs(p.vx) > 20 || !p.grounded })
    if (this.trail.length > 400) this.trail.shift()
  }

  private findHook(): Hook | null {
    const p = this.player
    const cx = p.x + p.w / 2
    const cy = p.y + p.h / 2
    let best: Hook | null = null
    let bs = Infinity
    for (const h of this.hooks) {
      const dx = h.x - cx
      const dy = h.y - cy
      const d = Math.hypot(dx, dy)
      if (d > PHYS.grappleRange || dy > 10) continue
      const score = d - (dx * p.facing > 0 ? 90 : 0)
      if (score < bs) { bs = score; best = h }
    }
    return best
  }

  private attachGrapple(): void {
    const p = this.player
    const h = this.findHook()
    if (!h) { this.sfx('miss'); return }
    const d = Math.hypot(h.x - (p.x + p.w / 2), h.y - (p.y + p.h / 2))
    p.grapple = { hook: h, len: Math.max(50, d), t: 0 }
    p.dashT = 0
    p.canDash = true
    this.sfx('yarn')
    this.buzz('tap')
  }

  private releaseGrapple(jump: boolean): void {
    const p = this.player
    if (!p.grapple) return
    p.grapple = null
    if (jump) {
      p.vy = Math.min(p.vy, 0) - 380
      p.vx *= 1.1
      p.noCut = true
      p.sx = 0.8
      p.sy = 1.25
      this.sfx('jump')
    }
  }

  private hurt(fromX: number): void {
    const p = this.player
    if (p.inv > 0) return
    ui.hearts--
    p.inv = 1.4
    p.grapple = null
    p.dashT = 0
    p.vy = -420
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 260
    p.lockT = 0.25
    this.sfx('hurt')
    this.buzz('heavy')
    this.shake = 0.3
    for (let i = 0; i < 6; i++) this.spawn(p.x + p.w / 2, p.y + 10, (Math.random() - 0.5) * 300, -Math.random() * 300, 0.6, 6, '#ff6b9a', 'heart', 600)
    this.freeze(0.09)
    if (ui.hearts <= 0) this.respawnAtCheckpoint()
  }

  private fallOut(): void {
    this.sfx('hurt')
    this.buzz('heavy')
    this.respawnAtCheckpoint()
  }

  /** No game over: Rosie pops back at the last bell with full hearts, puzzles reset around her. */
  private respawnAtCheckpoint(): void {
    const p = this.player
    Object.assign(p, this.makePlayer(this.respawn.x, this.respawn.y))
    p.inv = 1.2
    ui.hearts = MAX_HEARTS
    this.sw = 0
    this.ghost.clear()
    this.seeds = []
    this.drops = []
    this.waves = []
    this.swTimer = 0
    this.crates.forEach((c) => this.resetCrate(c))
    for (const o of this.orbs) o.inside = false
    this.trail.forEach((q) => { q.x = p.x + p.w / 2; q.y = p.y + p.h })
    this.iris = 1
    this.snapCamera()
    if (this.boss && this.boss.phase !== 'defeated') this.resetBossPhase()
  }

  private updatePlatforms(dt: number): void {
    for (const pl of this.platforms) {
      pl.phase += dt
      const ox = pl.x
      const oy = pl.y
      const o = Math.sin(pl.phase * 0.9) * 2.5 * T
      if (pl.axis === 'x') pl.x = pl.x0 + o
      else pl.y = pl.y0 + Math.sin(pl.phase * 1.3) * 2.5 * T
      pl.dx = pl.x - ox
      pl.dy = pl.y - oy
    }
  }

  private stompBounce(): void {
    const p = this.player
    if (p.dashT <= 0) {
      p.vy = this.input.down('jump') ? -PHYS.jumpV : -PHYS.stomp
      p.noCut = true
    }
    p.canDash = true
  }

  private killEnemy(e: Enemy): void {
    e.alive = false
    e.squash = 0
    this.freeze(0.06)
    this.sfx('stomp')
    this.buzz('medium')
    this.shake = Math.max(this.shake, 0.12)
    for (let i = 0; i < 8; i++)
      this.spawn(e.x + e.w / 2, e.y + e.h / 2, (Math.random() - 0.5) * 360, -Math.random() * 300, 0.6, 5, i % 2 ? '#ffc2dd' : '#fff6a8', 'star', 700)
  }

  private updateEnemies(dt: number): void {
    const p = this.player
    const pcx = p.x + p.w / 2
    for (const e of this.enemies) {
      e.t += dt
      if (!e.alive) { e.squash += dt; continue }
      const ecx = e.x + e.w / 2
      const near = Math.abs(pcx - ecx) < 9 * T && Math.abs(p.y - e.y) < 4 * T

      switch (e.kind) {
        case 'walker':
        case 'spiky': {
          e.vy = Math.min(e.vy + PHYS.gravity * dt, PHYS.maxFall)
          e.vx = e.dir * (e.kind === 'spiky' ? PHYS.spikySpeed : PHYS.enemySpeed)
          this.moveBody(e, dt, false)
          if (e.hitL) e.dir = 1
          if (e.hitR) e.dir = -1
          if (e.grounded) {
            const ax = e.dir > 0 ? e.x + e.w + 2 : e.x - 2
            const tx = Math.floor(ax / T)
            const ty = Math.floor((e.y + e.h + 2) / T)
            if (!this.solid(tx, ty, false) && !this.oneWay(tx, ty)) e.dir = e.dir > 0 ? -1 : 1
          }
          break
        }
        case 'bee': {
          const below = p.y > e.y + 20 && p.y - e.y < 5 * T && Math.abs(pcx - ecx) < 3.5 * T
          if (e.state === 0) {
            e.x = e.x0 + Math.sin(e.t * 1.2) * 2.5 * T
            e.y = e.y0 + Math.sin(e.t * 3.1) * 10
            e.dir = Math.cos(e.t * 1.2) > 0 ? 1 : -1
            e.timer -= dt
            if (below && e.timer <= 0) { e.state = 1; e.timer = 0.55; this.sfx('buzz') }
          } else if (e.state === 1) {
            // wind-up: hover in place and shake so Rosie can see the dive coming
            e.timer -= dt
            e.dir = pcx > ecx ? 1 : -1
            if (e.timer <= 0) {
              const d = Math.hypot(pcx - ecx, p.y + p.h / 2 - (e.y + e.h / 2)) || 1
              e.tx = ((pcx - ecx) / d) * 330
              e.ty = ((p.y + p.h / 2 - (e.y + e.h / 2)) / d) * 330
              e.state = 2
              e.timer = 0.9
            }
          } else if (e.state === 2) {
            e.x += e.tx * dt
            e.y += e.ty * dt
            e.timer -= dt
            if (e.timer <= 0 || this.solid(Math.floor(ecx / T), Math.floor((e.y + e.h) / T), false)) { e.state = 3 }
          } else {
            const hx = e.x0 + Math.sin(e.t * 1.2) * 2.5 * T
            e.x += (hx - e.x) * Math.min(1, dt * 3)
            e.y += (e.y0 - e.y) * Math.min(1, dt * 3)
            if (Math.abs(e.y - e.y0) < 4) { e.state = 0; e.timer = 2.2 }
          }
          break
        }
        case 'frog': {
          e.vy = Math.min(e.vy + PHYS.gravity * dt, PHYS.maxFall)
          if (e.grounded) {
            e.vx = 0
            if (near) e.dir = pcx > ecx ? 1 : -1
            e.timer = near ? e.timer - dt : Math.max(e.timer, 0.6)
            // crouch for the last 0.35 s before a leap
            e.state = e.timer < 0.35 && near ? 1 : 0
            if (e.timer <= 0 && near) {
              e.vy = -640
              e.vx = e.dir * 150
              e.timer = 1.3
              e.state = 0
            }
          }
          this.moveBody(e, dt, false)
          break
        }
        case 'shooter': {
          if (near) e.dir = pcx > ecx ? 1 : -1
          e.timer = near ? e.timer - dt : Math.max(e.timer, 0.8)
          if (e.timer <= 0 && near) {
            e.timer = 2
            this.seeds.push({ x: ecx + e.dir * 14, y: e.y + 12, vx: e.dir * PHYS.seedSpeed, t: 0 })
            this.sfx('miss')
          }
          break
        }
      }
      if (e.y > this.H * T + 100) e.alive = false

      if (!overlap(p, e)) continue
      const fromAbove = p.vy > 40 && p.y + p.h - e.y < 18
      if (p.dashT > 0 || (p.grapple && Math.hypot(p.vx, p.vy) > 450 && e.kind !== 'spiky')) {
        this.killEnemy(e)
        p.canDash = true
      } else if (fromAbove && e.kind !== 'spiky') {
        this.killEnemy(e)
        this.stompBounce()
      } else {
        this.hurt(ecx)
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.squash < 0.6)
  }

  private updateSeeds(dt: number): void {
    const p = this.player
    for (const s of this.seeds) {
      s.t += dt
      s.x += s.vx * dt
      if (this.solid(Math.floor(s.x / T), Math.floor(s.y / T), false) || s.t > 4) { s.t = 99; continue }
      if (overlap(p, { x: s.x - 6, y: s.y - 6, w: 12, h: 12 })) {
        if (p.dashT > 0) { s.t = 99; continue }
        this.hurt(s.x)
        s.t = 99
      }
    }
    this.seeds = this.seeds.filter((s) => s.t < 99)
  }

  private updateItems(dt: number): void {
    const p = this.player
    const cx = p.x + p.w / 2
    const cy = p.y + p.h / 2

    for (const c of this.candies) {
      c.t += dt
      if (c.taken) continue
      const d = Math.hypot(c.x - cx, c.y - cy)
      if (d < 80 && d > 1) {
        const pull = (1 - d / 80) * 520 * dt + 40 * dt
        c.x += ((cx - c.x) / d) * pull
        c.y += ((cy - c.y) / d) * pull
      }
      if (d > 28) continue
      c.taken = true
      ui.candy++
      ui.levelCandy++
      this.sfx('fish')
      for (let i = 0; i < 5; i++) this.spawn(c.x, c.y, (Math.random() - 0.5) * 200, -Math.random() * 200, 0.5, 5, '#ff9fcb', 'star', 300)
    }

    for (const gm of this.gems) {
      if (gm.t > 0) { gm.t -= dt; continue }
      if (Math.hypot(gm.x - cx, gm.y - cy) > 26 || (p.canDash && p.dashT <= 0 && p.dashCd <= 0)) continue
      gm.t = PHYS.gemRespawn
      p.canDash = true
      p.dashCd = 0
      p.dashT = 0
      this.sfx('switch')
      this.buzz('tap')
      for (let i = 0; i < 8; i++) this.spawn(gm.x, gm.y, (Math.random() - 0.5) * 260, (Math.random() - 0.5) * 260, 0.5, 5, '#7cf0b0', 'star', 0)
    }

    this.mewT -= dt
    for (const kt of this.kittens) {
      kt.t += dt
      if (kt.found) continue
      const d = Math.hypot(kt.x - cx, kt.y - 14 - cy)
      if (d < 34) { this.findKitten(kt); continue }
      // a faint "mew" gets louder as Rosie gets close — the hint that a secret is nearby
      if (d < 7 * T && this.mewT <= 0) {
        this.mewT = 2.6
        audio.play('mew', 1 - d / (7 * T))
      }
    }

    if (this.key && !this.key.taken && Math.hypot(this.key.x - cx, this.key.y - cy) < 36) {
      this.key.taken = true
      ui.hasKey = true
      this.slowmo(0.35, 0.4)
      this.sfx('key')
      this.buzz('medium')
      for (let i = 0; i < 12; i++) this.spawn(this.key.x, this.key.y, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, 0.8, 6, '#ffd84a', 'star', 0)
    }

    for (const o of this.orbs) {
      o.flash = Math.max(0, o.flash - dt * 2)
      const inside = overlap(p, { x: o.x - 20, y: o.y - 20, w: 40, h: 40 })
      if (inside && !o.inside) {
        this.toggleSwitch(o)
        this.swTimer = o.timed ? PHYS.timedSwitch : 0
        this.tickT = 0
      }
      o.inside = inside
    }

    for (const c of this.checkpoints) {
      c.t += dt
      if (c.active || Math.abs(c.x - cx) > 26 || Math.abs(c.y - (p.y + p.h)) > 50) continue
      this.activateCheckpoint(c, true)
    }

    if (this.goal && Math.abs(this.goal.x - cx) < 30 && Math.abs(this.goal.y - (p.y + p.h)) < 60) this.levelClear()

    this.lockedTipT -= dt
    if (this.cage && !this.cage.open && Math.abs(this.cage.x - cx) < 34 && Math.abs(this.cage.y - (p.y + p.h)) < 60) {
      if (ui.hasKey) {
        this.slowmo(1.1, 0.3)
        this.cage.open = true
        this.cage.t = 0
        this.followers.push(this.cage.cat)
        ui.rescued = [...this.followers]
        ui.justRescued = this.cage.cat
        this.sfx('rescue')
        this.buzz('success')
        for (let i = 0; i < 24; i++)
          this.spawn(this.cage.x, this.cage.y - 30, (Math.random() - 0.5) * 500, -Math.random() * 500, 1.4, 8, '#ff7fae', 'heart', 500)
        this.levelClear()
      } else if (this.lockedTipT <= 0) {
        this.lockedTipT = 2.5
        this.sfx('locked')
        this.buzz('tap')
      }
    }

    // Sign bubbles fade in when Rosie walks up to a sign and fade out once she leaves.
    let nearest: SignDef | null = null
    let best = 110
    for (const s of this.signs) {
      const d = Math.hypot(s.x * T + T / 2 - cx, s.y * T + T / 2 - cy)
      if (d < best) { best = d; nearest = s }
    }
    for (const s of this.signs) {
      const a = this.signFade.get(s) ?? 0
      this.signFade.set(s, clamp(a + (s === nearest ? dt * 5 : -dt * 4), 0, 1))
    }
    let shown: { sign: SignDef; a: number } | null = null
    for (const [s, a] of this.signFade) if (a > 0 && (!shown || a > shown.a)) shown = { sign: s, a }
    this.signNear = shown
  }

  private toggleSwitch(o: Orb): void {
    this.sw = this.sw === 0 ? 1 : 0
    o.flash = 1
    const p = this.player
    for (const key of [...this.ghost]) {
      const [gx, gy] = key.split(',').map(Number)
      if (this.char(gx, gy) !== '|') this.ghost.delete(key)
    }
    for (let ty = Math.floor(p.y / T); ty <= Math.floor((p.y + p.h - 0.01) / T); ty++)
      for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) {
        const c = this.char(tx, ty)
        if (c === 'P' || c === 'B') this.ghost.add(k(tx, ty))
      }
    this.sfx('switch')
    this.buzz('light')
    this.shake = Math.max(this.shake, 0.1)
    if (!this.revealed.has(o)) {
      this.revealed.add(o)
      this.revealSwapped()
    }
    const col = this.sw === 0 ? '#ff8fc0' : '#7cc4ff'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      this.spawn(o.x, o.y, Math.cos(a) * 260, Math.sin(a) * 260, 0.5, 5, col, 'star', 0)
    }
  }

  private updateSwitchesAndGates(dt: number): void {
    if (this.swTimer > 0) {
      this.swTimer -= dt
      this.tickT -= dt
      if (this.tickT <= 0 && this.swTimer > 0) {
        this.tickT = this.swTimer < 1.2 ? 0.2 : 0.5
        this.sfx('tick')
      }
      if (this.swTimer <= 0) {
        this.swTimer = 0
        const o = this.orbs.find((x) => x.timed)
        if (o) this.toggleSwitch(o)
      }
    }

    const bodies: Body[] = [this.player, ...this.crates]
    for (const pl of this.plates) {
      const was = pl.pressed
      pl.pressed = bodies.some((b) => b.x + b.w > pl.tx * T + 6 && b.x < (pl.tx + 1) * T - 6 && Math.abs(b.y + b.h - (pl.ty + 1) * T) < 3)
      pl.open += ((pl.pressed ? 1 : 0) - pl.open) * Math.min(1, dt * 12)
      if (was !== pl.pressed) {
        this.sfx(pl.pressed ? 'switch' : 'locked')
        if (pl.pressed) {
          this.buzz('tap')
          this.freeze(0.05)
          if (!this.revealed.has(pl)) {
            this.revealed.add(pl)
            const gates = [...this.gatePlate].filter(([, i]) => this.plates[i] === pl).map(([key]) => key.split(',').map(Number))
            if (gates.length) this.reveal(gates.reduce((a, g) => a + g[0], 0) / gates.length * T + T / 2, gates.reduce((a, g) => a + g[1], 0) / gates.length * T + T / 2)
          }
        }
        if (!pl.pressed) {
          // a closing gate never traps Rosie: tiles she's standing in stay passable until she leaves
          const p = this.player
          for (const [key, i] of this.gatePlate) {
            if (this.plates[i] !== pl) continue
            const [tx, ty] = key.split(',').map(Number)
            if (overlap(p, { x: tx * T, y: ty * T, w: T, h: T })) this.ghost.add(key)
          }
        }
      }
    }

    for (const c of this.crates) {
      c.vx = 0
      c.vy = Math.min(c.vy + PHYS.gravity * dt, PHYS.maxFall)
      this.moveBody(c, dt, false)
      if (c.y > this.H * T + 60) {
        c.lost += dt
        if (c.lost > 0.6) this.resetCrate(c)
      }
    }
  }

  private resetCrate(c: Crate): void {
    c.x = c.x0
    c.y = c.y0
    c.vy = 0
    c.lost = 0
    for (let i = 0; i < 6; i++) this.spawn(c.x + c.w / 2, c.y + c.h / 2, (Math.random() - 0.5) * 200, -Math.random() * 200, 0.5, 5, '#ffffff', 'star', 200)
  }

  private updateTiles(dt: number): void {
    for (const [key, c] of this.crumbles) {
      if (c.state === 1) {
        c.t -= dt
        if (c.t <= 0) {
          c.state = 2
          c.t = 2.6
          const [tx, ty] = key.split(',').map(Number)
          for (let i = 0; i < 6; i++) this.spawn(tx * T + Math.random() * T, ty * T + 8, (Math.random() - 0.5) * 80, 40, 0.7, 7, '#ffffff', 'dot', 200)
        }
      } else if (c.state === 2) {
        c.t -= dt
        if (c.t <= 0) c.state = 0
      }
    }
    for (const [key, v] of this.jellies) {
      const nv = v - dt * 2.2
      if (nv <= 0) this.jellies.delete(key)
      else this.jellies.set(key, nv)
    }
  }

  private updateCamera(dt: number): void {
    const p = this.player
    let tx = p.x + p.w / 2 - this.viewW / 2 + p.facing * 50
    let ty = p.y + p.h / 2 - this.viewH * 0.55
    if (this.focus && this.focus.t > 0) {
      tx = this.focus.x - this.viewW / 2
      ty = this.focus.y - this.viewH / 2
      dt = STEP * 1.2
    }
    if (this.boss && this.boss.phase !== 'defeated') {
      // keep the whole arena framed around Rosie and the boss
      tx = (p.x + this.boss.x + this.boss.w / 2) / 2 - this.viewW / 2
    }
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 5)
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 5)
    this.cam.x = clamp(this.cam.x, 0, this.W * T - this.viewW)
    this.cam.y = clamp(this.cam.y, 0, this.H * T - this.viewH)
    this.shake = Math.max(0, this.shake - dt)
  }

  private updateParticles(dt: number): void {
    for (const q of this.particles) {
      q.life -= dt
      q.vy += q.g * dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      q.vx *= 1 - 1.5 * dt
      q.rot += dt * 4
    }
    this.particles = this.particles.filter((q) => q.life > 0)
  }

  private levelClear(): void {
    if (ui.screen !== 'play') return
    ui.screen = 'clear'
    this.clearT = this.cage || this.boss ? 5 : 3.2
    this.player.grapple = null
    this.player.dashT = 0
    audio.stopSong()
    this.sfx('clear')
    this.buzz('success')
    const d = saveState.data
    if (d) {
      const i = ui.levelIndex
      d.cleared[i] = true
      d.bestCandy[i] = Math.max(d.bestCandy[i], ui.levelCandy)
      d.unlocked = Math.max(d.unlocked, Math.min(i + 1, this.levels.length - 1))
      d.resume = null
      persist()
    }
  }

  private afterClear(): void {
    if (ui.levelIndex >= this.levels.length - 1) {
      ui.screen = 'end'
      audio.startSong(0)
      return
    }
    ui.hubFocus = Math.min(ui.levelIndex + 1, this.levels.length - 1)
    this.toHub()
  }

  private activateCheckpoint(c: Checkpoint, fresh: boolean): void {
    const p = this.player
    this.checkpoints.forEach((o) => (o.active = false))
    c.active = true
    c.t = 0
    this.checkpointIdx = this.checkpoints.indexOf(c)
    this.respawn = { x: c.x - p.w / 2, y: c.y - p.h }
    ui.hearts = MAX_HEARTS
    if (!fresh) return
    this.sfx('bell')
    this.buzz('light')
    for (let i = 0; i < 8; i++) this.spawn(c.x, c.y - 60, (Math.random() - 0.5) * 240, -Math.random() * 240, 0.8, 6, '#ff8fb8', 'heart', 300)
    const d = saveState.data
    if (d) {
      d.resume = {
        world: ui.levelIndex,
        checkpoint: this.checkpointIdx,
        candies: this.candies.flatMap((cd, i) => (cd.taken ? [i] : [])),
        key: ui.hasKey,
      }
      persist()
    }
  }

  private findKitten(kt: Kitten): void {
    kt.found = true
    this.sfx('kitten')
    this.buzz('success')
    this.slowmo(0.5, 0.35)
    for (let i = 0; i < 16; i++) this.spawn(kt.x, kt.y - 16, (Math.random() - 0.5) * 360, -Math.random() * 360, 1, 6, i % 2 ? '#ffd84a' : '#ff9fcb', i % 3 ? 'star' : 'heart', 300)
    ui.levelKittens = this.kittens.map((x) => x.found)
    const d = saveState.data
    if (d) {
      d.kittens[ui.levelIndex][kt.idx] = true
      persist()
    }
  }

  /** Camera briefly pans to an effect Rosie just caused, or points at it from the edge if it's far. */
  private reveal(x: number, y: number): void {
    const inView = x > this.cam.x + 30 && x < this.cam.x + this.viewW - 30 && y > this.cam.y + 30 && y < this.cam.y + this.viewH - 30
    if (inView) return
    if (Math.abs(x - (this.cam.x + this.viewW / 2)) < this.viewW * 1.6) this.focus = { x, y, t: 0.9 }
    else this.pointer = { x, y, t: 2.5 }
  }

  private revealSwapped(): void {
    const p = this.player
    let n = 0
    let sx = 0
    let sy = 0
    const x0 = Math.max(0, Math.floor(p.x / T) - 4)
    const x1 = Math.min(this.W - 1, Math.floor(p.x / T) + 24)
    for (let ty = 0; ty < this.H; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.grid[ty][tx]
        if (c !== 'P' && c !== 'B') continue
        n++
        sx += tx
        sy += ty
      }
    if (n) this.reveal((sx / n) * T + T / 2, (sy / n) * T + T / 2)
  }

  // ───────────────────────── boss ─────────────────────────

  private resetBossPhase(): void {
    const b = this.boss
    if (!b) return
    b.mode = 'float'
    b.t = 0
    b.vx = 0
    b.y = b.phase === 'charge' ? (this.H - 2) * T - 70 : 1.5 * T
  }

  private updateBoss(dt: number): void {
    const b = this.boss!
    const p = this.player
    const arenaL = T
    const arenaR = (this.W - 1) * T
    const floor = (this.H - 2) * T
    b.t += dt
    b.flash = Math.max(0, b.flash - dt * 3)
    const pcx = p.x + p.w / 2
    const bcx = b.x + b.w / 2

    if (b.phase === 'intro') {
      if (pcx > 9 * T) {
        b.y += (1.5 * T - b.y) * Math.min(1, dt * 2)
        if (Math.abs(b.y - 1.5 * T) < 4) { b.phase = 'slam'; b.mode = 'float'; b.t = 0; ui.bossHp = b.hp; this.sfx('roar'); this.shake = 0.4 }
      }
      return
    }
    if (b.phase === 'defeated') {
      b.y += 60 * dt
      if (Math.random() < 0.3) this.spawn(bcx + (Math.random() - 0.5) * b.w, b.y + Math.random() * b.h, (Math.random() - 0.5) * 300, -Math.random() * 300, 0.8, 7, ['#ffd84a', '#ff9fcb', '#ffffff'][Math.floor(Math.random() * 3)], 'star', 300)
      return
    }

    let vulnerable = false
    let dashOnly = false
    switch (b.phase) {
      case 'slam': {
        b.h = 110
        if (b.mode === 'float') {
          b.x += (pcx - b.w / 2 - b.x) * Math.min(1, dt * 1.8)
          b.y += (1.5 * T - b.y) * Math.min(1, dt * 3)
          if (b.t > 2.2) { b.mode = 'wind'; b.t = 0; this.sfx('buzz') }
        } else if (b.mode === 'wind') {
          if (b.t > 0.7) { b.mode = 'drop'; b.t = 0 }
        } else if (b.mode === 'drop') {
          b.y += 900 * dt
          if (b.y + b.h >= floor) {
            b.y = floor - b.h
            b.mode = 'dazed'
            b.t = 0
            this.shake = 0.45
            this.sfx('slam')
            this.buzz('heavy')
            this.waves.push({ x: bcx - b.w / 2, dir: -1, t: 0 }, { x: bcx + b.w / 2, dir: 1, t: 0 })
          }
        } else if (b.mode === 'dazed') {
          vulnerable = true
          if (b.t > 2.2) { b.mode = 'rise'; b.t = 0 }
        } else {
          b.y += (1.5 * T - b.y) * Math.min(1, dt * 3)
          if (b.t > 0.8) { b.mode = 'float'; b.t = 0 }
        }
        break
      }
      case 'shield': {
        // floats high; only a dash from the crystal stairs can reach it
        b.h = 110
        dashOnly = true
        vulnerable = true
        b.y += (1.2 * T - b.y) * Math.min(1, dt * 2)
        b.x = (arenaL + arenaR) / 2 - b.w / 2 + Math.sin(b.t * 0.6) * 6 * T
        b.spawnT -= dt
        if (b.spawnT <= 0) {
          b.spawnT = 0.9
          this.drops.push({ x: pcx + (Math.random() - 0.5) * 5 * T, y: b.y + b.h, vy: 120, dead: false })
        }
        break
      }
      case 'charge': {
        b.h = 70
        if (b.mode === 'float') {
          b.y += (floor - b.h - b.y) * Math.min(1, dt * 4)
          b.dir = pcx > bcx ? 1 : -1
          if (b.t > 1.4) { b.mode = 'wind'; b.t = 0; this.sfx('buzz') }
        } else if (b.mode === 'wind') {
          if (b.t > 0.8) { b.mode = 'charge'; b.t = 0; b.vx = b.dir * 540 }
        } else if (b.mode === 'charge') {
          b.x += b.vx * dt
          if (b.x < arenaL || b.x + b.w > arenaR) {
            b.x = clamp(b.x, arenaL, arenaR - b.w)
            b.mode = 'stuck'
            b.t = 0
            this.shake = 0.4
            this.sfx('slam')
            this.buzz('heavy')
          }
        } else if (b.mode === 'stuck') {
          vulnerable = true
          if (b.t > 2) { b.mode = 'float'; b.t = 0 }
        }
        break
      }
    }

    for (const w of this.waves) {
      w.t += dt
      w.x += w.dir * 330 * dt
      if (p.grounded && Math.abs(p.x + p.w / 2 - w.x) < 18 && w.t < 2.5) this.hurt(w.x)
    }
    this.waves = this.waves.filter((w) => w.t < 2.5 && w.x > arenaL && w.x < arenaR)
    for (const d of this.drops) {
      d.vy += 900 * dt
      d.y += d.vy * dt
      if (d.y > floor) { d.dead = true; this.spawn(d.x, floor - 4, 0, -80, 0.3, 4, '#a9d8ff', 'dot', 400) }
      else if (overlap(p, { x: d.x - 6, y: d.y - 6, w: 12, h: 12 })) { d.dead = true; this.hurt(d.x) }
    }
    this.drops = this.drops.filter((d) => !d.dead)

    if (!overlap(p, b)) return
    const stomp = p.vy > 60 && p.y + p.h - b.y < 24
    if (vulnerable && (p.dashT > 0 || (stomp && !dashOnly))) {
      this.hitBoss()
      if (stomp) { p.vy = -PHYS.jumpV; p.noCut = true }
      else { p.vx = -p.dashDir.x * 300; p.vy = -350; p.dashT = 0 }
      p.canDash = true
      p.dashCd = 0
    } else if (p.dashT > 0 && dashOnly === false) {
      p.vx = -p.dashDir.x * 300
      p.dashT = 0
      this.hurt(bcx)
    } else {
      this.hurt(bcx)
    }
  }

  private hitBoss(): void {
    const b = this.boss!
    b.hp--
    b.flash = 1
    ui.bossHp = b.hp
    this.freeze(0.12)
    this.shake = 0.35
    this.sfx('bosshit')
    this.buzz('heavy')
    for (let i = 0; i < 14; i++) this.spawn(b.x + b.w / 2, b.y + b.h / 2, (Math.random() - 0.5) * 500, -Math.random() * 400, 0.7, 6, '#fff6a8', 'star', 500)
    if (b.hp <= 0) {
      b.phase = 'defeated'
      this.drops = []
      this.waves = []
      this.slowmo(1.4, 0.3)
      this.sfx('rescue')
      for (let i = 0; i < 30; i++) this.spawn(b.x + b.w / 2, b.y + b.h / 2, (Math.random() - 0.5) * 700, -Math.random() * 600, 1.6, 8, '#ff7fae', 'heart', 400)
      globalThis.setTimeout(() => this.levelClear(), 1800)
      return
    }
    const next: BossPhase = b.hp > 4 ? 'slam' : b.hp > 2 ? 'shield' : 'charge'
    if (next !== b.phase) { b.phase = next; this.sfx('roar') }
    b.mode = next === 'slam' ? 'rise' : 'float'
    b.t = 0
    b.spawnT = 1.5
  }

  // ───────────────────────── fx ─────────────────────────

  spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, kind: Particle['kind'], g: number): void {
    if (this.particles.length > 400) return
    this.particles.push({ x, y, vx, vy, life, max: life, size, color, kind, g, rot: Math.random() * 6 })
  }

  private dust(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) this.spawn(x, y - 2, (Math.random() - 0.5) * 160, -Math.random() * 60, 0.35, 4 + Math.random() * 3, '#ffffff', 'dot', 0)
  }

  private confetti(): void {
    const cols = ['#ff8fc0', '#7cc4ff', '#ffd84a', '#8fe3b5', '#c5a3ff']
    this.spawn(this.cam.x + Math.random() * this.viewW, this.cam.y - 10, (Math.random() - 0.5) * 60, 60 + Math.random() * 80, 4, 5, cols[Math.floor(Math.random() * cols.length)], Math.random() < 0.3 ? 'heart' : 'chunk', 40)
  }

  private sfx(s: Sfx): void {
    audio.play(s)
  }

  private buzz(b: Buzz): void {
    buzz(b)
  }
}
