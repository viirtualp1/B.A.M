import { T } from './constants'
import type { Game } from './engine'
import type { Palette } from './levels'
import { INK, drawBee, drawCandy, drawCat, drawFrog, drawGem, drawGrumble, drawHeart, drawPlatform, drawRosie, drawSeed, drawShooter, drawSpiky, drawStar } from './sprites'
import { t, type TextKey } from './i18n'
import type { Enemy } from './engine'
import { ui } from './store'

type Ctx = CanvasRenderingContext2D

const FONT = (w: number, size: number): string => `${w} ${size}px Nunito, Mali, ui-rounded, system-ui, sans-serif`

const hash = (x: number, y: number): number => {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return (h ^ (h >>> 16)) >>> 0
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[]): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// ───────────────────────── background ─────────────────────────

function drawSky(ctx: Ctx, g: Game, pal: Palette): void {
  const W = g.viewW
  const grad = ctx.createLinearGradient(0, 0, 0, g.viewH)
  grad.addColorStop(0, pal.skyTop)
  grad.addColorStop(1, pal.skyBottom)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, g.viewH)

  if (g.level?.cave && ui.screen !== 'title' && ui.screen !== 'end') {
    // glowing sugar crystals in the cave background
    for (let i = 0; i < 16; i++) {
      const span = W + 200
      const x = ((i * 173 - g.cam.x * 0.25) % span + span) % span - 100
      const y = 120 + ((i * 89) % 300) - g.cam.y * 0.25
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(g.time * 2 + i)
      drawStar(ctx, x, y, 6 + (i % 3) * 3, i, pal.sun)
    }
    ctx.globalAlpha = 1
  }
  // sun
  const sx = W * 0.78 - g.cam.x * 0.03
  const cave = !!g.level?.cave && ui.screen !== 'title' && ui.screen !== 'end'
  ctx.globalAlpha = cave ? 0 : 0.35
  ctx.fillStyle = pal.sun
  ctx.beginPath(); ctx.arc(sx, 110, 90, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = cave ? 0 : 1
  ctx.beginPath(); ctx.arc(sx, 110, 52, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1

  // clouds
  ctx.fillStyle = cave ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.85)'
  for (let i = 0; i < 7; i++) {
    const span = W + 400
    const x = ((i * 337 - g.cam.x * 0.12 + g.time * 8) % span + span) % span - 200
    const y = 50 + ((i * 97) % 160)
    const s = 0.7 + ((i * 53) % 10) / 14
    ctx.beginPath()
    ctx.arc(x, y, 26 * s, 0, Math.PI * 2)
    ctx.arc(x + 30 * s, y - 12 * s, 32 * s, 0, Math.PI * 2)
    ctx.arc(x + 64 * s, y, 24 * s, 0, Math.PI * 2)
    ctx.rect(x, y, 64 * s, 24 * s)
    ctx.fill()
  }

  // hills
  const layer = (color: string, par: number, base: number, amp: number, freq: number, seed: number): void => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, g.viewH)
    const off = g.cam.x * par
    const yOff = -g.cam.y * par
    for (let x = 0; x <= W + 20; x += 20) {
      const wx = x + off
      const y = base + yOff - (Math.sin(wx * freq + seed) * amp + Math.sin(wx * freq * 2.3 + seed * 2) * amp * 0.35)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(W, g.viewH)
    ctx.closePath()
    ctx.fill()
  }
  const k = g.viewH / 540
  layer(pal.hillFar, 0.18, 350 * k, 50, 0.004, 1)
  layer(pal.hillNear, 0.35, 420 * k, 40, 0.007, 4)

  // little round trees on near hills
  ctx.fillStyle = pal.grass
  for (let i = 0; i < 12; i++) {
    const span = W + 200
    const x = ((i * 211 - g.cam.x * 0.35) % span + span) % span - 100
    const wx = x + g.cam.x * 0.35
    const y = 420 * (g.viewH / 540) - g.cam.y * 0.35 - (Math.sin(wx * 0.007 + 4) * 40 + Math.sin(wx * 0.007 * 2.3 + 8) * 14)
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.arc(x, y - 14, 16, 0, Math.PI * 2)
    ctx.arc(x + 12, y - 6, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

// ───────────────────────── tiles ─────────────────────────

function drawGround(ctx: Ctx, g: Game, tx: number, ty: number, pal: Palette): void {
  const is = (x: number, y: number): boolean => g.char(x, y) === '#'
  const x = tx * T
  const y = ty * T
  const up = ty === 0 ? g.level.cave : is(tx, ty - 1)
  const dn = is(tx, ty + 1) || ty === g.H - 1
  const lf = is(tx - 1, ty)
  const rt = is(tx + 1, ty)
  const r = 14
  const radii = [!up && !lf ? r : 0, !up && !rt ? r : 0, !dn && !rt ? r : 0, !dn && !lf ? r : 0]
  ctx.fillStyle = pal.soil
  rr(ctx, x - (lf ? 0.5 : 0), y - (up ? 0.5 : 0), T + (lf ? 0.5 : 0) + (rt ? 0.5 : 0), T + (up ? 0.5 : 0) + (dn ? 0.5 : 0), radii)
  ctx.fill()
  if (!dn) {
    ctx.fillStyle = pal.soilEdge
    rr(ctx, x + (lf ? 0 : 3), y + T - 7, T - (lf ? 0 : 3) - (rt ? 0 : 3), 5, [0, 0, radii[2], radii[3]])
    ctx.fill()
  }
  const h = hash(tx, ty)
  ctx.fillStyle = pal.soilDot
  if (h % 3 === 0) { ctx.beginPath(); ctx.arc(x + 9 + (h % 20), y + 16 + ((h >> 4) % 16), 3.5, 0, Math.PI * 2); ctx.fill() }
  if (h % 4 === 1) { ctx.beginPath(); ctx.arc(x + 6 + ((h >> 6) % 26), y + 10 + ((h >> 9) % 22), 2.5, 0, Math.PI * 2); ctx.fill() }

  if (!up) {
    ctx.fillStyle = pal.grass
    rr(ctx, x - (lf ? 0.5 : 1), y - 3, T + (lf ? 0.5 : 1) + (rt ? 0.5 : 1), 13, [radii[0] ? 9 : 0, radii[1] ? 9 : 0, 0, 0])
    ctx.fill()
    for (let i = 0; i < 4; i++) {
      if ((i === 0 && !lf) || (i === 3 && !rt)) continue
      ctx.beginPath()
      ctx.arc(x + 5 + i * 10, y + 10, 5.5, 0, Math.PI)
      ctx.fill()
    }
    ctx.fillStyle = pal.grassLight
    rr(ctx, x + (lf ? 0 : 5), y - 1, T - (lf ? 0 : 5) - (rt ? 0 : 5), 4, 2)
    ctx.fill()
    if (h % 7 === 0) {
      // tiny flower
      ctx.fillStyle = h % 2 ? '#ffffff' : '#ffb0d0'
      const fx = x + 10 + (h % 20)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 3, y - 6 + Math.sin(a) * 3, 2.2, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#ffd84a'
      ctx.beginPath(); ctx.arc(fx, y - 6, 1.8, 0, Math.PI * 2); ctx.fill()
    }
  }
}

function drawCloudTile(ctx: Ctx, x: number, y: number, fill: string, alpha: number, wob: number): void {
  ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(120,100,170,0.18)'
  ctx.beginPath()
  ctx.roundRect(x + 2, y + 8, T - 4, 12, 6)
  ctx.fill()
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(x + 10 + wob, y + 8, 10, 0, Math.PI * 2)
  ctx.arc(x + 22 - wob, y + 5, 12, 0, Math.PI * 2)
  ctx.arc(x + 32 + wob, y + 9, 9, 0, Math.PI * 2)
  ctx.rect(x + 2, y + 6, T - 4, 10)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawToggleBlock(ctx: Ctx, x: number, y: number, pink: boolean, active: boolean): void {
  const main = pink ? '#ff8fc0' : '#76c2ff'
  const dark = pink ? '#e05d97' : '#3f93dc'
  if (active) {
    ctx.fillStyle = dark
    rr(ctx, x + 1, y + 1, T - 2, T - 2, 9)
    ctx.fill()
    ctx.fillStyle = main
    rr(ctx, x + 1, y + 1, T - 2, T - 6, 9)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    rr(ctx, x + 6, y + 5, T - 16, 5, 3)
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = INK
    rr(ctx, x + 1, y + 1, T - 2, T - 2, 9)
    ctx.stroke()
    if (pink) drawHeart(ctx, x + T / 2, y + T / 2 + 2, 9, 'rgba(255,255,255,0.8)')
    else drawStar(ctx, x + T / 2, y + T / 2, 8, 0, 'rgba(255,255,255,0.8)')
  } else {
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2
    ctx.strokeStyle = main
    ctx.globalAlpha = 0.75
    rr(ctx, x + 4, y + 4, T - 8, T - 8, 7)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }
}

function drawGate(ctx: Ctx, x: number, y: number, open: number, top: boolean): void {
  const h = T * (1 - open)
  if (top) {
    ctx.fillStyle = '#ffd88a'
    rr(ctx, x + 2, y - 6, T - 4, 8, 3); ctx.fill()
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
  }
  if (h < 1) return
  for (const bx of [x + 9, x + 20, x + 31]) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(bx - 4, y, 8, h)
    ctx.clip()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(bx - 4, y, 8, T)
    ctx.fillStyle = '#ff6fae'
    for (let s = -8; s < T; s += 10) {
      ctx.beginPath()
      ctx.moveTo(bx - 4, y + s); ctx.lineTo(bx + 4, y + s - 6); ctx.lineTo(bx + 4, y + s - 1); ctx.lineTo(bx - 4, y + s + 5)
      ctx.fill()
    }
    ctx.restore()
    ctx.lineWidth = 2; ctx.strokeStyle = INK
    rr(ctx, bx - 4, y, 8, h, 3); ctx.stroke()
  }
}

function drawPlate(ctx: Ctx, x: number, y: number, pressed: boolean): void {
  const b = y + T
  ctx.fillStyle = '#c9b6d6'
  rr(ctx, x + 3, b - 7, T - 6, 7, [3, 3, 0, 0]); ctx.fill()
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
  const capH = pressed ? 3 : 8
  ctx.fillStyle = pressed ? '#7ddc7a' : '#ff7fae'
  rr(ctx, x + 8, b - 7 - capH, T - 16, capH + 1, [5, 5, 0, 0]); ctx.fill(); ctx.stroke()
}

function drawCrate(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = '#e9b97f'
  rr(ctx, x, y, w, h, 6); ctx.fill()
  ctx.fillStyle = '#f6d3a3'
  rr(ctx, x + 4, y + 4, w - 8, h - 8, 4); ctx.fill()
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK
  rr(ctx, x, y, w, h, 6); ctx.stroke()
  ctx.lineWidth = 2; ctx.strokeStyle = '#c48a54'
  rr(ctx, x + 4, y + 4, w - 8, h - 8, 4); ctx.stroke()
  drawStar(ctx, x + w / 2, y + h / 2, 9, 0.3, '#ff9fcb')
}

function drawTiles(ctx: Ctx, g: Game, pal: Palette): void {
  const x0 = Math.max(0, Math.floor(g.cam.x / T) - 1)
  const x1 = Math.min(g.W - 1, Math.ceil((g.cam.x + g.viewW) / T) + 1)
  for (let ty = 0; ty < g.H; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = g.grid[ty][tx]
      const x = tx * T
      const y = ty * T
      switch (c) {
        case '#': drawGround(ctx, g, tx, ty, pal); break
        case 'C': {
          ctx.fillStyle = '#d9b48a'
          rr(ctx, x + 1, y + 1, T - 2, T - 2, 7); ctx.fill()
          ctx.fillStyle = '#ecd0aa'
          rr(ctx, x + 1, y + 1, T - 2, T - 8, 7); ctx.fill()
          ctx.lineWidth = 2; ctx.strokeStyle = INK
          rr(ctx, x + 1, y + 1, T - 2, T - 2, 7); ctx.stroke()
          ctx.strokeStyle = '#8f6a48'
          ctx.beginPath()
          ctx.moveTo(x + 12, y + 4); ctx.lineTo(x + 18, y + 16); ctx.lineTo(x + 12, y + 24); ctx.lineTo(x + 20, y + 35)
          ctx.moveTo(x + 18, y + 16); ctx.lineTo(x + 30, y + 14)
          ctx.stroke()
          break
        }
        case 'J': {
          const sq = g.jellies.get(tx + ',' + ty) ?? 0
          const wob = Math.sin(g.time * 30) * sq
          const top = y + 10 + sq * 8 + wob * 3
          ctx.fillStyle = '#ff6fae'
          ctx.beginPath()
          ctx.moveTo(x + 2, y + T)
          ctx.lineTo(x + 2, top + 10)
          ctx.quadraticCurveTo(x + 2 - wob * 2, top, x + 14, top)
          ctx.lineTo(x + T - 14, top)
          ctx.quadraticCurveTo(x + T - 2 + wob * 2, top, x + T - 2, top + 10)
          ctx.lineTo(x + T - 2, y + T)
          ctx.closePath()
          ctx.fill()
          ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke()
          ctx.fillStyle = 'rgba(255,255,255,0.6)'
          rr(ctx, x + 8, top + 4, 12, 5, 3); ctx.fill()
          ctx.beginPath(); ctx.arc(x + 28, top + 7, 2.5, 0, Math.PI * 2); ctx.fill()
          break
        }
        case '^': {
          for (let i = 0; i < 3; i++) {
            const bx = x + 2 + i * 12.5
            ctx.beginPath()
            ctx.moveTo(bx, y + T)
            ctx.lineTo(bx + 6, y + 14 + (i === 1 ? -4 : 0))
            ctx.lineTo(bx + 12, y + T)
            ctx.closePath()
            ctx.fillStyle = '#b892ff'
            ctx.fill()
            ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
            ctx.fillStyle = 'rgba(255,255,255,0.6)'
            ctx.beginPath(); ctx.moveTo(bx + 4, y + T - 4); ctx.lineTo(bx + 6, y + 20); ctx.lineTo(bx + 7, y + T - 4); ctx.fill()
          }
          break
        }
        case '-': drawCloudTile(ctx, x, y, '#ffffff', 1, 0); break
        case 'c': {
          const s = g.crumbles.get(tx + ',' + ty)
          if (!s || s.state === 0) drawCloudTile(ctx, x, y, '#fff4fb', 1, Math.sin(g.time * 2 + tx) * 1.5)
          else if (s.state === 1) drawCloudTile(ctx, x + (Math.random() - 0.5) * 4, y + (0.5 - s.t) * 10, '#ffe0f0', 0.5 + s.t, 0)
          else if (s.t < 0.6) drawCloudTile(ctx, x, y, '#fff4fb', (0.6 - s.t) * 0.8, 0)
          break
        }
        case '|': {
          const i = g.gatePlate.get(tx + ',' + ty) ?? -1
          const open = i >= 0 ? g.plates[i].open : 0
          drawGate(ctx, x, y, open, g.char(tx, ty - 1) !== '|')
          break
        }
        case '_': {
          const pl = g.plates.find((q) => q.tx === tx && q.ty === ty)
          drawPlate(ctx, x, y, pl?.pressed ?? false)
          break
        }
        case 'P': drawToggleBlock(ctx, x, y, true, g.sw === 0); break
        case 'B': drawToggleBlock(ctx, x, y, false, g.sw === 1); break
      }
    }
  }
}

// ───────────────────────── objects ─────────────────────────

function drawSign(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = '#b07a4f'
  rr(ctx, x - 3, y - 26, 6, 26, 2); ctx.fill()
  ctx.fillStyle = '#e8b885'
  rr(ctx, x - 16, y - 38, 32, 20, 5); ctx.fill()
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
  ctx.fillStyle = INK
  ctx.font = FONT(900, 14)
  ctx.textAlign = 'center'
  ctx.fillText('!', x, y - 23)
}

function drawHook(ctx: Ctx, g: Game, x: number, y: number, target: boolean): void {
  if (target) {
    ctx.globalAlpha = 0.35 + Math.sin(g.time * 8) * 0.15
    ctx.fillStyle = '#fff3a8'
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.lineWidth = 9; ctx.strokeStyle = INK
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = 5.5; ctx.strokeStyle = '#ffc93d'
  ctx.stroke()
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff1b0'
  ctx.beginPath(); ctx.arc(x, y, 10, -2.4, -1.2); ctx.stroke()
}

function drawOrb(ctx: Ctx, g: Game, x: number, y: number, flash: number, timed: boolean): void {
  const col = g.sw === 0 ? '#ff8fc0' : '#76c2ff'
  const bob = Math.sin(g.time * 3) * 3
  ctx.globalAlpha = 0.3 + flash * 0.5
  ctx.fillStyle = col
  ctx.beginPath(); ctx.arc(x, y + bob, 22 + flash * 14, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
  ctx.save()
  ctx.translate(x, y + bob)
  ctx.scale(Math.cos(g.time * 2) * 0.25 + 0.85, 1)
  ctx.beginPath()
  ctx.moveTo(0, -16); ctx.lineTo(11, -3); ctx.lineTo(0, 16); ctx.lineTo(-11, -3)
  ctx.closePath()
  ctx.fillStyle = col; ctx.fill()
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(5, -3); ctx.lineTo(0, -1); ctx.lineTo(-5, -3); ctx.closePath(); ctx.fill()
  ctx.restore()
  if (timed) {
    // clock ring: dashed when idle, drains while the swap is running
    ctx.lineWidth = 4
    ctx.strokeStyle = INK
    ctx.beginPath(); ctx.arc(x, y + bob, 21, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#ffffff'
    const frac = g.swTimer > 0 ? g.swTimer / 3.5 : 1
    if (g.swTimer <= 0) ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.arc(x, y + bob, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke()
    ctx.setLineDash([])
  }
}

function drawKey(ctx: Ctx, g: Game, x: number, y: number): void {
  ctx.save()
  ctx.translate(x, y + Math.sin(g.time * 3) * 4)
  ctx.rotate(Math.sin(g.time * 2) * 0.2)
  ctx.globalAlpha = 0.4
  ctx.fillStyle = '#fff3a8'
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.fillStyle = '#ffcf3a'
  ctx.beginPath(); ctx.arc(-6, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  rr(ctx, 0, -2.5, 14, 5, 2); ctx.fill(); ctx.stroke()
  rr(ctx, 9, 1, 3.5, 6, 1); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#fff6c9'
  ctx.beginPath(); ctx.arc(-6, 0, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  if (Math.sin(g.time * 5) > 0.7) drawStar(ctx, x + 12, y - 12, 5, g.time, '#ffffff')
}

function drawCheckpoint(ctx: Ctx, g: Game, x: number, y: number, active: boolean, t: number): void {
  ctx.fillStyle = '#c99a6b'
  rr(ctx, x - 3, y - 60, 6, 60, 3); ctx.fill()
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
  const swing = active ? Math.sin(t * 8) * Math.exp(-t * 1.5) * 0.6 : Math.sin(g.time * 1.5) * 0.06
  ctx.save()
  ctx.translate(x, y - 58)
  ctx.rotate(swing)
  ctx.fillStyle = active ? '#ffd84a' : '#d8d2c8'
  ctx.beginPath()
  ctx.moveTo(-10, 18); ctx.quadraticCurveTo(-10, 2, 0, 2); ctx.quadraticCurveTo(10, 2, 10, 18); ctx.closePath()
  ctx.fill(); ctx.stroke()
  ctx.fillStyle = INK
  ctx.beginPath(); ctx.arc(0, 19, 3, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  if (active) {
    ctx.fillStyle = '#ff7fae'
    ctx.beginPath()
    ctx.moveTo(x + 3, y - 52); ctx.quadraticCurveTo(x + 20, y - 48 + Math.sin(g.time * 4) * 3, x + 30, y - 44); ctx.lineTo(x + 3, y - 40)
    ctx.closePath(); ctx.fill()
  }
}

function drawGoal(ctx: Ctx, g: Game, x: number, y: number): void {
  const h = 110
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff'
    rr(ctx, x + s * 40 - 6, y - h, 12, h, 6); ctx.fill()
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke()
    ctx.fillStyle = '#ff9cc4'
    for (let i = 0; i < 5; i++) { rr(ctx, x + s * 40 - 6, y - h + 12 + i * 20, 12, 8, 2); ctx.fill() }
  }
  ctx.strokeStyle = '#ff7fae'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(x - 40, y - h + 6)
  ctx.quadraticCurveTo(x, y - h + 40 + Math.sin(g.time * 2) * 6, x + 40, y - h + 6)
  ctx.stroke()
  drawStar(ctx, x, y - h - 12, 18, g.time, '#ffd84a')
  if (Math.random() < 0.1) g.spawn(x + (Math.random() - 0.5) * 80, y - h + Math.random() * h, 0, -30, 0.8, 4, '#fff6a8', 'star', 0)
}

function drawCage(ctx: Ctx, g: Game): void {
  const c = g.cage
  if (!c) return
  const x = c.x
  const y = c.y
  const lift = c.open ? Math.min(1, c.t * 1.2) : 0
  if (!c.open) drawCat(ctx, x, y - 4, c.cat, { facing: -1, t: g.time, moving: false })
  // base
  ctx.fillStyle = '#ffd88a'
  rr(ctx, x - 30, y - 8, 60, 8, 3); ctx.fill()
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke()
  // bars + top fly up when opened
  ctx.save()
  ctx.globalAlpha = 1 - lift
  ctx.translate(0, -lift * 140)
  ctx.lineWidth = 4
  for (let i = 0; i < 6; i++) {
    const bx = x - 25 + i * 10
    ctx.strokeStyle = INK
    ctx.beginPath(); ctx.moveTo(bx, y - 8); ctx.lineTo(bx, y - 62); ctx.stroke()
    ctx.strokeStyle = '#ffcf3a'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(bx, y - 8); ctx.lineTo(bx, y - 62); ctx.stroke()
    ctx.lineWidth = 4
  }
  ctx.fillStyle = '#ffd88a'
  ctx.beginPath()
  ctx.moveTo(x - 30, y - 60); ctx.quadraticCurveTo(x, y - 86, x + 30, y - 60); ctx.closePath()
  ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke()
  if (!c.open) {
    ctx.fillStyle = '#ffcf3a'
    rr(ctx, x - 8, y - 38, 16, 13, 3); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(x, y - 38, 5, Math.PI, 0); ctx.stroke()
  }
  ctx.restore()
  if (!c.open) {
    const name = t(c.cat)
    nameTag(ctx, x, y - 96, name)
    if (Math.sin(g.time * 2) > 0.3) {
      ctx.font = FONT(900, 13)
      ctx.fillStyle = INK
      ctx.textAlign = 'center'
      ctx.fillText(t('meow'), x + 34, y - 70 + Math.sin(g.time * 6) * 2)
    }
  }
}

function nameTag(ctx: Ctx, x: number, y: number, text: string): void {
  ctx.font = FONT(900, 13)
  const w = ctx.measureText(text).width + 16
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  rr(ctx, x - w / 2, y - 11, w, 20, 10); ctx.fill()
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.textBaseline = 'alphabetic'
}

function drawFollowers(ctx: Ctx, g: Game): void {
  const n = g.trail.length
  g.followers.forEach((cat, i) => {
    const idx = Math.max(0, n - 1 - (i + 1) * 26)
    const p = g.trail[idx]
    let x = p.x
    let y = p.y
    let hop = p.moving ? Math.abs(Math.sin(g.time * 9 + i)) * 4 : 0
    if (g.cage && g.cage.open && g.cage.cat === cat && g.cage.t < 1.2) {
      const t = g.cage.t / 1.2
      x = g.cage.x + (p.x - g.cage.x) * t
      y = g.cage.y + (p.y - g.cage.y) * t
      hop = Math.sin(t * Math.PI) * 90
    }
    drawCat(ctx, x, y, cat, { facing: p.f, t: g.time + i, moving: p.moving, scale: 0.85, hop })
  })
}

function drawRope(ctx: Ctx, g: Game): void {
  const p = g.player
  if (!p.grapple) return
  const sx = p.x + p.w / 2
  const sy = p.y + p.h / 2
  const hx = sx + (p.grapple.hook.x - sx) * p.grapple.t
  const hy = sy + (p.grapple.hook.y - sy) * p.grapple.t
  ctx.lineCap = 'round'
  ctx.lineWidth = 5; ctx.strokeStyle = INK
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke()
  ctx.lineWidth = 3; ctx.strokeStyle = '#ff7fae'
  ctx.stroke()
  ctx.fillStyle = '#ff7fae'
  ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke()
}

function drawPlayer(ctx: Ctx, g: Game): void {
  const p = g.player
  for (const gh of p.ghosts) {
    ctx.globalAlpha = gh.a * 0.7
    ctx.fillStyle = '#ff7fbf'
    ctx.beginPath(); ctx.ellipse(gh.x + p.w / 2, gh.y + p.h - 20, 15, 15, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = gh.a * 0.5
    ctx.beginPath(); ctx.ellipse(gh.x + p.w / 2, gh.y + p.h - 20, 6, 6, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  drawRope(ctx, g)
  const flicker = p.inv > 0 && Math.floor(g.time * 20) % 2 === 0
  drawRosie(ctx, p.x + p.w / 2, p.y + p.h, {
    facing: p.facing, sx: p.sx, sy: p.sy, runT: p.runT, grounded: p.grounded, vy: p.vy,
    canDash: p.canDash && p.dashCd <= 0, alpha: flicker ? 0.35 : 1, blink: g.time % 3.4 < 0.12,
  })
}

function drawParticles(ctx: Ctx, g: Game): void {
  for (const q of g.particles) {
    const a = Math.min(1, q.life / q.max * 1.5)
    ctx.globalAlpha = a
    const s = q.size * (0.5 + 0.5 * (q.life / q.max))
    if (q.kind === 'dot') { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, Math.PI * 2); ctx.fill() }
    else if (q.kind === 'star') drawStar(ctx, q.x, q.y, s, q.rot, q.color)
    else if (q.kind === 'heart') drawHeart(ctx, q.x, q.y, s * 1.4, q.color)
    else { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.color; ctx.fillRect(-s / 2, -s / 2, s, s * 0.7); ctx.restore() }
  }
  ctx.globalAlpha = 1
}

// ───────────────────────── title scene ─────────────────────────

function drawTitleScene(ctx: Ctx, g: Game): void {
  const pal = g.levels[1].palette
  const saved = { x: g.cam.x, y: g.cam.y }
  g.cam.x = g.time * 30
  g.cam.y = 0
  drawSky(ctx, g, pal)
  g.cam.x = saved.x
  g.cam.y = saved.y
  const W = g.viewW
  const groundY = g.viewH - 70
  ctx.fillStyle = pal.soil
  ctx.fillRect(0, groundY, W, 70)
  ctx.fillStyle = pal.grass
  ctx.fillRect(0, groundY - 4, W, 16)
  for (let x = 0; x < W; x += 10) { ctx.beginPath(); ctx.arc(x + 5, groundY + 12, 5.5, 0, Math.PI); ctx.fill() }
  ctx.fillStyle = pal.grassLight
  ctx.fillRect(0, groundY - 2, W, 4)

  const cx = W / 2
  const hop = Math.abs(Math.sin(g.time * 3)) * 18
  const end = ui.screen === 'end'
  drawCat(ctx, cx - 120, groundY, 'billion', { facing: 1, t: g.time, moving: end, scale: 1.6, hop: end ? hop : 0 })
  drawRosie(ctx, cx, groundY - hop, {
    facing: 1, sx: 1.6 * (1 + Math.sin(g.time * 6) * 0.03), sy: 1.6, runT: 0, grounded: hop < 2, vy: 0, canDash: true, alpha: 1, blink: g.time % 3 < 0.12,
  })
  drawCat(ctx, cx + 120, groundY, 'million', { facing: -1, t: g.time + 1.3, moving: end, scale: 1.6, hop: end ? Math.abs(Math.sin(g.time * 3 + 1)) * 18 : 0 })
  if (Math.random() < (end ? 0.3 : 0.06)) g.spawn(Math.random() * W, -10, 0, 60, 6, 6, ['#ff8fc0', '#ffd84a', '#7cc4ff'][Math.floor(Math.random() * 3)], 'heart', 20)
  drawParticles(ctx, g)
}

// ───────────────────────── main ─────────────────────────

export function render(ctx: Ctx, g: Game): void {
  if (ui.screen === 'title' || ui.screen === 'end') {
    drawTitleScene(ctx, g)
    return
  }
  const pal = g.level.palette
  drawSky(ctx, g, pal)
  ctx.save()
  const sh = g.shake > 0 ? g.shake * 18 : 0
  ctx.translate(-Math.round(g.cam.x) + (Math.random() - 0.5) * sh, -Math.round(g.cam.y) + (Math.random() - 0.5) * sh)

  for (const s of g.signs) drawSign(ctx, s.x * T + T / 2, (s.y + 1) * T)
  for (const c of g.checkpoints) drawCheckpoint(ctx, g, c.x, c.y, c.active, c.t)
  if (g.goal) drawGoal(ctx, g, g.goal.x, g.goal.y)
  drawTiles(ctx, g, pal)
  for (const h of g.hooks) drawHook(ctx, g, h.x, h.y, h === g.grappleTarget)
  for (const o of g.orbs) drawOrb(ctx, g, o.x, o.y, o.flash, o.timed)
  for (const c of g.crates) drawCrate(ctx, c.x, c.y, c.w, c.h)
  for (const c of g.candies) if (!c.taken) drawCandy(ctx, c.x, c.y, c.t, c.hue)
  for (const gm of g.gems) drawGem(ctx, gm.x, gm.y, g.time, gm.t > 0)
  for (const pl of g.platforms) drawPlatform(ctx, pl.x, pl.y, pl.w, pl.h)
  if (g.key && !g.key.taken) drawKey(ctx, g, g.key.x, g.key.y)
  drawCage(ctx, g)
  for (const e of g.enemies) drawEnemy(ctx, e)
  for (const sd of g.seeds) drawSeed(ctx, sd.x, sd.y, sd.t)
  drawFollowers(ctx, g)
  drawPlayer(ctx, g)
  drawParticles(ctx, g)
  if (g.signNear) {
    const sg = g.signNear.sign
    bubble(ctx, sg.x * T + T / 2, (sg.y + 1) * T - 46, t(sg.text), g.signNear.a, g)
  }
  if (g.cage && !g.cage.open && g.lockedTipT > 0) bubble(ctx, g.cage.x, g.cage.y - 112, t('locked'), Math.min(1, g.lockedTipT * 2), g)
  ctx.restore()
}

function drawEnemy(ctx: Ctx, e: Enemy): void {
  const x = e.x + e.w / 2
  const y = e.y + e.h
  const sq = e.alive ? 0 : e.squash + 0.01
  switch (e.kind) {
    case 'walker': drawGrumble(ctx, x, y, e.dir, e.t, sq); break
    case 'spiky': drawSpiky(ctx, x, y, e.dir, e.t, sq); break
    case 'bee': drawBee(ctx, x, y, e.dir, e.t, sq); break
    case 'frog': drawFrog(ctx, x, y, e.dir, e.t, sq, !e.grounded); break
    case 'shooter': drawShooter(ctx, x, y, e.dir, e.t, sq, e.timer); break
  }
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null

/** Splits text into lines that fit maxW. Uses Intl.Segmenter so Thai (no spaces) wraps on word boundaries. */
function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const words = segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : text.split(/(\s+)/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line + w
    if (ctx.measureText(test).width > maxW && line.trim()) {
      lines.push(line.trim())
      line = w.trimStart()
    } else line = test
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

function bubble(ctx: Ctx, x: number, y: number, text: string, a: number, g: { cam: { x: number }; viewW: number }): void {
  ctx.save()
  ctx.font = FONT(800, 15)
  const lines = wrap(ctx, text, 230)
  const lh = 20
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28
  const h = lines.length * lh + 18
  const bx = Math.max(g.cam.x + 10, Math.min(g.cam.x + g.viewW - w - 10, x - w / 2))
  const by = y - h - 6 * (1 - a)
  ctx.globalAlpha = a
  ctx.fillStyle = 'rgba(61,43,69,0.18)'
  ctx.beginPath(); ctx.roundRect(bx, by + 5, w, h, 16); ctx.fill()
  ctx.fillStyle = '#fffaf4'
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(bx, by, w, h, 16)
  ctx.fill(); ctx.stroke()
  const tx = Math.max(bx + 18, Math.min(bx + w - 18, x))
  ctx.beginPath()
  ctx.moveTo(tx - 9, by + h - 1.5); ctx.lineTo(tx, by + h + 10); ctx.lineTo(tx + 9, by + h - 1.5)
  ctx.fill(); ctx.stroke()
  ctx.fillRect(tx - 7.5, by + h - 4, 15, 4)
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 9 + lh / 2 + i * lh))
  ctx.restore()
}

export type { TextKey }
