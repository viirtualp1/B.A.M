import { MAX_HEARTS, PHYS, STEP, T, VIEW_H } from './constants'
import { Input } from './input'
import { audio, type Sfx } from './audio'
import { buzz, type Buzz } from './haptics'
import { buildLevels, type LevelDef, type SignDef } from './levels'
import { loadProgress, saveProgress, ui, type CatName } from './store'
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

export interface Enemy extends Body { kind: EnemyKind; dir: 1 | -1; alive: boolean; squash: number; t: number; x0: number; y0: number; timer: number }
export interface Candy { x: number; y: number; taken: boolean; t: number; hue: number }
export interface Orb { x: number; y: number; inside: boolean; flash: number }
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
  gems: Gem[] = []
  platforms: Platform[] = []
  seeds: Seed[] = []
  signNear: { sign: SignDef; a: number } | null = null
  hooks: Hook[] = []
  orbs: Orb[] = []
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
    ui.savedLevel = Math.min(loadProgress(), this.levels.length - 1)
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
        this.update(STEP)
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

  unmount(): void {
    cancelAnimationFrame(this.raf)
    this.input.detach()
    window.removeEventListener('resize', this.resize)
  }

  resize = (): void => {
    if (!this.canvas) return
    const w = window.innerWidth
    const h = window.innerHeight
    // Short landscape phones get a closer camera so Rosie isn't tiny.
    this.viewH = h < 500 ? 420 : VIEW_H
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

  newGame(fromLevel = 0): void {
    audio.unlock()
    ui.candy = 0
    this.loadLevel(fromLevel)
    ui.screen = 'play'
    this.showBanner()
    audio.startSong(fromLevel)
  }

  restartLevel(): void {
    this.loadLevel(ui.levelIndex)
    ui.screen = 'play'
    this.showBanner()
    audio.startSong(ui.levelIndex)
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
          case 'S': this.orbs.push({ x: cx, y: cy, inside: false, flash: 0 }); break
          case 'k': this.key = { x: cx, y: cy, taken: false }; break
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

    this.respawn = { ...this.start }
    this.player = this.makePlayer(this.start.x, this.start.y)
    this.followers = this.levels.slice(0, i).map((l) => l.cat).filter((c): c is CatName => !!c)
    this.trail = []
    for (let n = 0; n < 200; n++) this.trail.push({ x: this.start.x + 13, y: this.start.y + 30, f: 1, moving: false })
    this.cam.x = clamp(this.player.x - this.viewW / 3, 0, this.W * T - this.viewW)
    this.cam.y = clamp(this.player.y - this.viewH * 0.55, 0, this.H * T - this.viewH)

    ui.levelIndex = i
    ui.hearts = MAX_HEARTS
    ui.levelCandy = 0
    ui.levelCandyTotal = this.candies.length
    ui.hasKey = false
    ui.levelNeedsKey = !!this.key
    ui.rescued = [...this.followers]
    ui.justRescued = null
  }

  private addEnemy(kind: EnemyKind, cx: number, bottom: number): void {
    const w = kind === 'shooter' ? 28 : 30
    const h = kind === 'shooter' ? 34 : 26
    this.enemies.push({
      kind, x: cx - w / 2, y: bottom - h, w, h, vx: 0, vy: 0, grounded: false, hitL: false, hitR: false, hitTop: false,
      gtx: 0, gty: 0, dir: -1, alive: true, squash: 0, t: Math.random() * 5, x0: cx - w / 2, y0: bottom - h, timer: 1 + Math.random(),
    })
  }

  private makePlayer(x: number, y: number): Player {
    return {
      x, y, w: 26, h: 30, vx: 0, vy: 0, grounded: false, hitL: false, hitR: false, hitTop: false, gtx: 0, gty: 0,
      facing: 1, coyote: 0, jumpBuf: 0, canDash: true, dashT: 0, dashDir: { x: 1, y: 0 }, lockT: 0, inv: 0,
      noCut: false, onWallL: false, onWallR: false, grapple: null, sx: 1, sy: 1, runT: 0, ghosts: [], plat: null,
    }
  }

  // ───────────────────────── tiles ─────────────────────────

  char(tx: number, ty: number): string {
    if (ty < 0 || ty >= this.H) return ' '
    if (tx < 0 || tx >= this.W) return '#'
    return this.grid[ty][tx]
  }

  solid(tx: number, ty: number, forPlayer: boolean): boolean {
    const c = this.char(tx, ty)
    switch (c) {
      case '#': case 'C': case 'J': return true
      case 'P': return this.sw === 0 && !(forPlayer && this.ghost.has(k(tx, ty)))
      case 'B': return this.sw === 1 && !(forPlayer && this.ghost.has(k(tx, ty)))
      default: return false
    }
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
    }

    const prevBottom = b.y + b.h
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

    if (ui.screen === 'title' || ui.screen === 'end' || ui.screen === 'over') {
      if (I.hit('confirm')) {
        if (ui.screen === 'over') this.restartLevel()
        else this.newGame(ui.screen === 'title' ? ui.savedLevel : 0)
      }
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
      if (this.clearT <= 0 || (this.clearT < 2.2 && I.hit('confirm'))) this.nextLevel()
      return
    }

    this.updatePlatforms(dt)
    this.updatePlayer(dt)
    this.updateEnemies(dt)
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
    if (p.grounded) {
      p.coyote = PHYS.coyote
      if (p.dashT <= 0) p.canDash = true
    }

    this.grappleTarget = p.grapple ? null : this.findHook()
    if (I.hit('yarn')) {
      if (p.grapple) this.releaseGrapple(false)
      else this.attachGrapple()
    }

    if (I.hit('dash') && p.canDash && p.dashT <= 0) {
      let dx = dir
      let dy = dirY
      if (dx === 0 && dy === 0) dx = p.facing
      if (p.grounded && dy > 0) dy = 0
      const len = Math.hypot(dx, dy)
      p.dashDir = { x: dx / len, y: dy / len }
      p.dashT = PHYS.dashTime
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
      if (preVy > 500) { this.sfx('land'); this.buzz('tap') }
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
    if (ui.hearts <= 0) this.gameOver()
  }

  private fallOut(): void {
    ui.hearts--
    this.sfx('hurt')
    this.buzz('heavy')
    if (ui.hearts <= 0) { this.gameOver(); return }
    const p = this.player
    Object.assign(p, this.makePlayer(this.respawn.x, this.respawn.y))
    p.inv = 1.2
    this.sw = 0
    this.ghost.clear()
    this.seeds = []
    for (const o of this.orbs) o.inside = false
  }

  private gameOver(): void {
    ui.hearts = 0
    ui.screen = 'over'
    audio.stopSong()
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
          e.x = e.x0 + Math.sin(e.t * 1.2) * 2.5 * T
          e.y = e.y0 + Math.sin(e.t * 3.1) * 10
          e.dir = Math.cos(e.t * 1.2) > 0 ? 1 : -1
          break
        }
        case 'frog': {
          e.vy = Math.min(e.vy + PHYS.gravity * dt, PHYS.maxFall)
          if (e.grounded) {
            e.vx = 0
            e.timer -= dt
            if (near) e.dir = pcx > ecx ? 1 : -1
            if (e.timer <= 0 && near) {
              e.vy = -640
              e.vx = e.dir * 150
              e.timer = 1.3
            }
          }
          this.moveBody(e, dt, false)
          break
        }
        case 'shooter': {
          if (near) e.dir = pcx > ecx ? 1 : -1
          e.timer -= dt
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
      if (c.taken || Math.hypot(c.x - cx, c.y - cy) > 28) continue
      c.taken = true
      ui.candy++
      ui.levelCandy++
      this.sfx('fish')
      for (let i = 0; i < 5; i++) this.spawn(c.x, c.y, (Math.random() - 0.5) * 200, -Math.random() * 200, 0.5, 5, '#ff9fcb', 'star', 300)
    }

    for (const gm of this.gems) {
      if (gm.t > 0) { gm.t -= dt; continue }
      if (Math.hypot(gm.x - cx, gm.y - cy) > 26 || (p.canDash && p.dashT <= 0)) continue
      gm.t = PHYS.gemRespawn
      p.canDash = true
      p.dashT = 0
      this.sfx('switch')
      this.buzz('tap')
      for (let i = 0; i < 8; i++) this.spawn(gm.x, gm.y, (Math.random() - 0.5) * 260, (Math.random() - 0.5) * 260, 0.5, 5, '#7cf0b0', 'star', 0)
    }

    if (this.key && !this.key.taken && Math.hypot(this.key.x - cx, this.key.y - cy) < 30) {
      this.key.taken = true
      ui.hasKey = true
      this.sfx('key')
      this.buzz('medium')
      for (let i = 0; i < 12; i++) this.spawn(this.key.x, this.key.y, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, 0.8, 6, '#ffd84a', 'star', 0)
    }

    for (const o of this.orbs) {
      o.flash = Math.max(0, o.flash - dt * 2)
      const inside = overlap(p, { x: o.x - 16, y: o.y - 16, w: 32, h: 32 })
      if (inside && !o.inside) this.toggleSwitch(o)
      o.inside = inside
    }

    for (const c of this.checkpoints) {
      c.t += dt
      if (c.active || Math.abs(c.x - cx) > 26 || Math.abs(c.y - (p.y + p.h)) > 50) continue
      this.checkpoints.forEach((o) => (o.active = false))
      c.active = true
      c.t = 0
      this.respawn = { x: c.x - p.w / 2, y: c.y - p.h }
      ui.hearts = MAX_HEARTS
      this.sfx('bell')
      this.buzz('light')
      for (let i = 0; i < 8; i++) this.spawn(c.x, c.y - 60, (Math.random() - 0.5) * 240, -Math.random() * 240, 0.8, 6, '#ff8fb8', 'heart', 300)
    }

    if (this.goal && Math.abs(this.goal.x - cx) < 30 && Math.abs(this.goal.y - (p.y + p.h)) < 60) this.levelClear()

    this.lockedTipT -= dt
    if (this.cage && !this.cage.open && Math.abs(this.cage.x - cx) < 34 && Math.abs(this.cage.y - (p.y + p.h)) < 60) {
      if (ui.hasKey) {
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
    this.ghost.clear()
    for (let ty = Math.floor(p.y / T); ty <= Math.floor((p.y + p.h - 0.01) / T); ty++)
      for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) {
        const c = this.char(tx, ty)
        if (c === 'P' || c === 'B') this.ghost.add(k(tx, ty))
      }
    this.sfx('switch')
    this.buzz('light')
    this.shake = Math.max(this.shake, 0.1)
    const col = this.sw === 0 ? '#ff8fc0' : '#7cc4ff'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      this.spawn(o.x, o.y, Math.cos(a) * 260, Math.sin(a) * 260, 0.5, 5, col, 'star', 0)
    }
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
    const tx = p.x + p.w / 2 - this.viewW / 2 + p.facing * 50
    const ty = p.y + p.h / 2 - this.viewH * 0.55
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
    this.clearT = this.cage ? 5 : 3.2
    this.player.grapple = null
    this.player.dashT = 0
    audio.stopSong()
    this.sfx('clear')
    const next = Math.min(ui.levelIndex + 1, this.levels.length - 1)
    if (next > ui.savedLevel) {
      ui.savedLevel = next
      saveProgress(next)
    }
  }

  private nextLevel(): void {
    const n = ui.levelIndex + 1
    if (n >= this.levels.length) {
      ui.screen = 'end'
      ui.savedLevel = 0
      saveProgress(0)
      audio.startSong(0)
      return
    }
    this.loadLevel(n)
    ui.screen = 'play'
    this.showBanner()
    audio.startSong(n)
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
