import type { CatName } from './store'

type Ctx = CanvasRenderingContext2D

export const INK = '#3d2b45'

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = true, lw = 2.5): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = lw
    ctx.strokeStyle = INK
    ctx.stroke()
  }
}

export interface HeroPose {
  facing: number
  sx: number
  sy: number
  runT: number
  grounded: boolean
  vy: number
  canDash: boolean
  alpha: number
  blink: boolean
}

/** Rosie — a tiny pink superhero girl with a giant head and huge eyes. Origin at bottom-center. */
export function drawRosie(ctx: Ctx, x: number, y: number, p: HeroPose): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(p.sx, p.sy)
  ctx.globalAlpha = p.alpha
  const f = p.facing
  const hair = '#ff5fa8'
  const hairDark = '#e8438f'
  const skin = '#ffe6da'
  const dress = '#ff8cc6'
  const bow = p.canDash ? '#ff2f7a' : '#c9b6c4'
  const flow = Math.max(-1, Math.min(1, p.vy * 0.0015))

  // long hair behind the head, swishing with movement
  ctx.beginPath()
  ctx.moveTo(-f * 4, -38)
  ctx.quadraticCurveTo(-f * 24, -30 - flow * 6, -f * 20 + Math.sin(p.runT * 6) * 2, -10 - flow * 8)
  ctx.quadraticCurveTo(-f * 10, -14, -f * 2, -16)
  ctx.closePath()
  ctx.fillStyle = hairDark
  ctx.fill()
  ctx.lineWidth = 2.2
  ctx.strokeStyle = INK
  ctx.stroke()

  // legs
  const r = p.grounded ? Math.sin(p.runT * 6) : 0.5
  ctx.lineCap = 'round'
  ctx.strokeStyle = INK
  ctx.lineWidth = 5.5
  ctx.beginPath()
  ctx.moveTo(-3.5, -9); ctx.lineTo(-3.5 + r * 3, -2)
  ctx.moveTo(3.5, -9); ctx.lineTo(3.5 - r * 3, -2)
  ctx.stroke()
  ellipse(ctx, -3.5 + r * 3, -2, 4, 2.6, '#ff2f7a', true, 1.6)
  ellipse(ctx, 3.5 - r * 3, -2, 4, 2.6, '#ff2f7a', true, 1.6)

  // dress
  ctx.beginPath()
  ctx.moveTo(-6, -19)
  ctx.lineTo(6, -19)
  ctx.lineTo(10, -7)
  ctx.quadraticCurveTo(0, -4, -10, -7)
  ctx.closePath()
  ctx.fillStyle = dress
  ctx.fill()
  ctx.lineWidth = 2.2
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.fillRect(-7, -12.5, 14, 2.5)

  // stubby arms
  const arm = p.grounded ? Math.sin(p.runT * 6 + 1) * 2 : -4
  ellipse(ctx, f * 9, -15 + arm, 3.2, 3.2, skin, true, 1.8)
  ellipse(ctx, -f * 8, -15 - arm, 3.2, 3.2, skin, true, 1.8)

  // head
  ellipse(ctx, 0, -31, 15, 13.5, skin, true, 2.5)
  // bangs
  ctx.beginPath()
  ctx.moveTo(-15, -30)
  ctx.quadraticCurveTo(-14, -46, 0, -45.5)
  ctx.quadraticCurveTo(14, -46, 15, -30)
  ctx.quadraticCurveTo(10, -38, f * 3, -36)
  ctx.quadraticCurveTo(-6, -40, -15, -30)
  ctx.closePath()
  ctx.fillStyle = hair
  ctx.fill()
  ctx.lineWidth = 2.2
  ctx.stroke()

  // big bow
  ctx.save()
  ctx.translate(-f * 3, -45)
  ctx.rotate(-f * 0.15 + flow * 0.2)
  ctx.fillStyle = bow
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, -11, -15, 1); ctx.quadraticCurveTo(-9, 5, 0, 0)
  ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, -11, 15, 1); ctx.quadraticCurveTo(9, 5, 0, 0)
  ctx.fill()
  ctx.stroke()
  ellipse(ctx, 0, 0, 3.4, 3.4, bow, true, 2)
  ctx.restore()

  // huge eyes
  const ex = f * 3
  if (p.blink) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(ex - 10, -29); ctx.quadraticCurveTo(ex - 6, -26, ex - 2, -29)
    ctx.moveTo(ex + 2, -29); ctx.quadraticCurveTo(ex + 6, -26, ex + 10, -29)
    ctx.stroke()
  } else {
    for (const s of [-1, 1]) {
      const cx = ex + s * 6
      ellipse(ctx, cx, -29, 5.6, 7, '#ffffff', true, 1.8)
      ellipse(ctx, cx + f * 1.2, -28, 4, 5.4, '#ff3f95', false)
      ellipse(ctx, cx + f * 1.4, -27.5, 2.2, 3, INK, false)
      ellipse(ctx, cx + f * 0.2 - 1, -30.5, 1.6, 2, '#ffffff', false)
      ellipse(ctx, cx + f * 2.2 + 1, -25.8, 0.8, 0.8, '#ffffff', false)
    }
  }
  ctx.globalAlpha = p.alpha * 0.55
  ellipse(ctx, ex - 11, -22.5, 3, 1.8, '#ff7fae', false)
  ellipse(ctx, ex + 11, -22.5, 3, 1.8, '#ff7fae', false)
  ctx.globalAlpha = p.alpha
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(ex, -21.5, 2.2, 0.2, Math.PI - 0.2)
  ctx.stroke()
  ctx.restore()
}

export interface CatPose {
  facing: number
  t: number
  moving: boolean
  scale?: number
  hop?: number
}

/** Tuxedo cat. Origin at bottom-center. Billion wears a pink bow tie, Million a golden bell. */
export function drawCat(ctx: Ctx, x: number, y: number, name: CatName, p: CatPose): void {
  const s = p.scale ?? 1
  ctx.save()
  ctx.translate(x, y - (p.hop ?? 0))
  ctx.scale(p.facing * s, s)
  const black = '#2a2531'
  const white = '#ffffff'
  const step = p.moving ? Math.sin(p.t * 14) : 0

  // tail
  ctx.strokeStyle = INK
  ctx.lineCap = 'round'
  ctx.lineWidth = 9
  const tw = Math.sin(p.t * 3) * 6
  ctx.beginPath()
  ctx.moveTo(-12, -10)
  ctx.quadraticCurveTo(-26, -14, -22 + tw * 0.3, -32 + tw)
  ctx.stroke()
  ctx.strokeStyle = black
  ctx.lineWidth = 5.5
  ctx.stroke()

  // back paws
  ellipse(ctx, -9 - step * 2, -3, 5.5, 3.5, white, true, 2)
  // body
  ellipse(ctx, -1, -13, 15, 12, black, true, 2.5)
  // bib
  ellipse(ctx, 7, -12, 6.5, 9, white, false)
  // front paws
  ellipse(ctx, 6 + step * 2, -3, 5.5, 3.5, white, true, 2)

  // head
  ctx.save()
  ctx.translate(8, -27)
  ctx.rotate(p.moving ? step * 0.04 : Math.sin(p.t * 1.3) * 0.06)
  // ears
  for (const ex of [-7, 7]) {
    ctx.beginPath()
    ctx.moveTo(ex - 5.5, -6)
    ctx.lineTo(ex * 1.15, -18)
    ctx.lineTo(ex + 5.5, -6)
    ctx.closePath()
    ctx.fillStyle = black
    ctx.fill()
    ctx.lineWidth = 2.2
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(ex - 2.5, -8)
    ctx.lineTo(ex * 1.1, -14)
    ctx.lineTo(ex + 2.5, -8)
    ctx.closePath()
    ctx.fillStyle = '#ff9fbf'
    ctx.fill()
  }
  ellipse(ctx, 0, 0, 12.5, 11, black, true, 2.5)
  // white blaze + muzzle
  ctx.beginPath()
  ctx.moveTo(-2, -10)
  ctx.lineTo(2, -10)
  ctx.lineTo(4.5, 2)
  ctx.lineTo(-4.5, 2)
  ctx.closePath()
  ctx.fillStyle = white
  ctx.fill()
  ellipse(ctx, 0, 4, 7.5, 5.5, white, false)
  // eyes
  const blink = Math.sin(p.t * 0.9 + (name === 'million' ? 2 : 0)) > 0.985
  if (blink) {
    ctx.strokeStyle = '#a5e88a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-8, -2); ctx.lineTo(-3, -2)
    ctx.moveTo(3, -2); ctx.lineTo(8, -2)
    ctx.stroke()
  } else {
    ellipse(ctx, -5.5, -2, 3.3, 3.8, '#a5e88a', false)
    ellipse(ctx, 5.5, -2, 3.3, 3.8, '#a5e88a', false)
    ellipse(ctx, -5.2, -2, 1.2, 3, '#1c1820', false)
    ellipse(ctx, 5.8, -2, 1.2, 3, '#1c1820', false)
    ellipse(ctx, -4.5, -3.5, 0.9, 0.9, '#ffffff', false)
    ellipse(ctx, 6.5, -3.5, 0.9, 0.9, '#ffffff', false)
  }
  // nose + mouth
  ctx.beginPath()
  ctx.moveTo(-1.8, 2); ctx.lineTo(1.8, 2); ctx.lineTo(0, 4)
  ctx.closePath()
  ctx.fillStyle = '#ff8fb0'
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(0, 4); ctx.quadraticCurveTo(-2, 6.5, -3.5, 5)
  ctx.moveTo(0, 4); ctx.quadraticCurveTo(2, 6.5, 3.5, 5)
  ctx.stroke()
  // whiskers
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(5, 4); ctx.lineTo(15, 2)
  ctx.moveTo(5, 5); ctx.lineTo(15, 6)
  ctx.moveTo(-5, 4); ctx.lineTo(-15, 2)
  ctx.moveTo(-5, 5); ctx.lineTo(-15, 6)
  ctx.stroke()
  ctx.restore()

  // accessory
  if (name === 'billion') {
    ctx.fillStyle = '#ff5f9e'
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(8, -17); ctx.lineTo(1, -21); ctx.lineTo(1, -13); ctx.closePath()
    ctx.moveTo(8, -17); ctx.lineTo(15, -21); ctx.lineTo(15, -13); ctx.closePath()
    ctx.fill(); ctx.stroke()
    ellipse(ctx, 8, -17, 2.4, 2.4, '#ff86b5', true, 1.4)
  } else {
    ctx.strokeStyle = '#4fb6ff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(8, -24, 9, 0.6, Math.PI - 0.6)
    ctx.stroke()
    ellipse(ctx, 8, -14.5, 3.5, 3.5, '#ffd34a', true, 1.4)
  }
  ctx.restore()
}

/** Grumble — a sulky storm puff. Origin at bottom-center. */
export function drawGrumble(ctx: Ctx, x: number, y: number, dir: number, t: number, squash: number): void {
  ctx.save()
  ctx.translate(x, y)
  const sq = squash > 0 ? Math.max(0.25, 1 - squash * 3) : 1 + Math.sin(t * 8) * 0.04
  ctx.scale(dir * (2 - sq) * 0.9 + dir * 0.1, sq)
  const step = Math.sin(t * 10)
  ellipse(ctx, -7 + step * 2, -2, 5, 3.5, '#6f73a8')
  ellipse(ctx, 7 - step * 2, -2, 5, 3.5, '#6f73a8')
  ctx.beginPath()
  ctx.arc(-9, -13, 9, 0, Math.PI * 2)
  ctx.arc(0, -18, 11, 0, Math.PI * 2)
  ctx.arc(10, -13, 9, 0, Math.PI * 2)
  ctx.fillStyle = '#a7aee0'
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(-9, -13, 7.6, 0, Math.PI * 2)
  ctx.arc(0, -18, 9.6, 0, Math.PI * 2)
  ctx.arc(10, -13, 7.6, 0, Math.PI * 2)
  ctx.rect(-12, -14, 24, 10)
  ctx.fillStyle = '#a7aee0'
  ctx.fill()
  ellipse(ctx, -2, -23, 5, 2.5, '#d4d9f7', false)
  if (squash > 0) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    for (const ex of [-1, 6]) {
      ctx.beginPath()
      ctx.moveTo(ex - 2, -16); ctx.lineTo(ex + 2, -12)
      ctx.moveTo(ex + 2, -16); ctx.lineTo(ex - 2, -12)
      ctx.stroke()
    }
  } else {
    ellipse(ctx, 0, -14, 2, 2.8, INK, false)
    ellipse(ctx, 7, -14, 2, 2.8, INK, false)
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-3, -20); ctx.lineTo(2, -18)
    ctx.moveTo(10, -20); ctx.lineTo(5, -18)
    ctx.moveTo(1, -8); ctx.quadraticCurveTo(3.5, -10, 6, -8)
    ctx.stroke()
  }
  ctx.restore()
}

const CANDY = [['#ff7fae', '#ffd1e4'], ['#7cc4ff', '#d6ecff'], ['#b28cff', '#e6d9ff']]

/** Wrapped swirl candy. */
export function drawCandy(ctx: Ctx, x: number, y: number, t: number, hue: number): void {
  const [main, light] = CANDY[hue % 3]
  ctx.save()
  ctx.translate(x, y + Math.sin(t * 3) * 3)
  ctx.rotate(Math.sin(t * 2) * 0.2)
  ctx.lineWidth = 2
  ctx.strokeStyle = INK
  ctx.fillStyle = light
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * 7, 0)
    ctx.lineTo(s * 15, -6)
    ctx.lineTo(s * 13, 0)
    ctx.lineTo(s * 15, 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ellipse(ctx, 0, 0, 8.5, 8.5, light, true, 2)
  ctx.strokeStyle = main
  ctx.lineWidth = 2.6
  ctx.beginPath()
  for (let a = 0; a < Math.PI * 3.2; a += 0.2) {
    const r = 1 + a * 0.62
    ctx.lineTo(Math.cos(a + t) * r, Math.sin(a + t) * r)
  }
  ctx.stroke()
  ellipse(ctx, -3, -4, 2, 1.3, 'rgba(255,255,255,0.9)', false)
  ctx.restore()
}

/** Spiky — a grumpy chestnut. Can't be stomped. */
export function drawSpiky(ctx: Ctx, x: number, y: number, dir: number, t: number, squash: number): void {
  ctx.save()
  ctx.translate(x, y)
  const sq = squash > 0 ? Math.max(0.25, 1 - squash * 3) : 1
  ctx.scale(dir, sq)
  const step = Math.sin(t * 9)
  ellipse(ctx, -6 + step * 2, -2, 4.5, 3, '#7a4a3a')
  ellipse(ctx, 6 - step * 2, -2, 4.5, 3, '#7a4a3a')
  ctx.fillStyle = '#c8a1ff'
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI
    ctx.beginPath()
    ctx.moveTo(Math.cos(a - 0.22) * 12, -14 + Math.sin(a - 0.22) * 12)
    ctx.lineTo(Math.cos(a) * 21, -14 + Math.sin(a) * 21)
    ctx.lineTo(Math.cos(a + 0.22) * 12, -14 + Math.sin(a + 0.22) * 12)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ellipse(ctx, 0, -13, 14, 12, '#a0705a', true, 2.5)
  ellipse(ctx, 3, -9, 8, 5, '#d9a88a', false)
  ellipse(ctx, 1, -15, 1.8, 2.6, INK, false)
  ellipse(ctx, 7, -15, 1.8, 2.6, INK, false)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-2, -20); ctx.lineTo(3, -18)
  ctx.moveTo(10, -20); ctx.lineTo(5, -18)
  ctx.stroke()
  ctx.restore()
}

/** Buzzy — a round bumblebee. */
export function drawBee(ctx: Ctx, x: number, y: number, dir: number, t: number, squash: number): void {
  ctx.save()
  ctx.translate(x, y - 13)
  ctx.scale(dir, squash > 0 ? Math.max(0.25, 1 - squash * 3) : 1)
  const flap = Math.sin(t * 40) * 0.5
  ctx.globalAlpha = 0.8
  for (const s of [-1, 1]) {
    ctx.save()
    ctx.translate(s * 3, -10)
    ctx.rotate(s * (0.4 + flap))
    ellipse(ctx, 0, -6, 5, 8, '#e8f6ff', true, 1.6)
    ctx.restore()
  }
  ctx.globalAlpha = 1
  ellipse(ctx, 0, 0, 13, 11, '#ffd84a', true, 2.5)
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = INK
  ctx.fillRect(-5, -12, 4, 24)
  ctx.fillRect(-12, -12, 3, 24)
  ctx.restore()
  ctx.beginPath()
  ctx.moveTo(-13, 0); ctx.lineTo(-19, 2); ctx.lineTo(-13, 4)
  ctx.fillStyle = INK
  ctx.fill()
  ellipse(ctx, 5, -2, 2, 2.8, INK, false)
  ellipse(ctx, 10, -2, 2, 2.8, INK, false)
  ellipse(ctx, 9, 4, 2.4, 1.4, '#ff8fb3', false)
  ctx.restore()
}

/** Hopper — a squishy frog that leaps toward Rosie. */
export function drawFrog(ctx: Ctx, x: number, y: number, dir: number, t: number, squash: number, airborne: boolean): void {
  ctx.save()
  ctx.translate(x, y)
  const sq = squash > 0 ? Math.max(0.25, 1 - squash * 3) : airborne ? 1.15 : 1 + Math.sin(t * 5) * 0.04
  ctx.scale(dir * (squash > 0 ? 1.3 : 1), sq)
  ellipse(ctx, -9, -3, 6, 3.5, '#5fc46a')
  ellipse(ctx, 9, -3, 6, 3.5, '#5fc46a')
  ellipse(ctx, 0, -11, 15, 11, '#7ddc7a', true, 2.5)
  ellipse(ctx, 2, -7, 9, 4.5, '#c9f5b5', false)
  for (const ex of [-5, 7]) {
    ellipse(ctx, ex, -21, 5.5, 5.5, '#7ddc7a', true, 2.2)
    ellipse(ctx, ex + 1, -21, 3, 3.4, '#ffffff', false)
    ellipse(ctx, ex + 1.6, -20.5, 1.6, 2, INK, false)
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(3, -12, 4, 0.3, Math.PI - 0.3)
  ctx.stroke()
  ctx.restore()
}

/** Spitter — a potted flower that spits seeds. */
export function drawShooter(ctx: Ctx, x: number, y: number, dir: number, t: number, squash: number, charge: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, squash > 0 ? Math.max(0.25, 1 - squash * 3) : 1)
  ctx.fillStyle = '#d98a5f'
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(-11, -12); ctx.lineTo(11, -12); ctx.lineTo(8, 0); ctx.lineTo(-8, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#4fae5a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.quadraticCurveTo(-3, -18, 0, -24)
  ctx.stroke()
  const puff = 1 + Math.max(0, 0.4 - charge) * 0.5
  ctx.save()
  ctx.translate(0, -28)
  ctx.rotate(Math.sin(t * 2) * 0.1)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.5
    ellipse(ctx, Math.cos(a) * 9 * puff, Math.sin(a) * 9 * puff, 5.5, 5.5, '#ff9ccf', true, 1.8)
  }
  ellipse(ctx, 0, 0, 8, 8, '#ffe066', true, 2)
  ellipse(ctx, 4, 0, 3.5 * puff, 3 * puff, INK, false)
  ellipse(ctx, -2, -3, 1.4, 1.8, INK, false)
  ctx.restore()
  ctx.restore()
}

export function drawSeed(ctx: Ctx, x: number, y: number, t: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(t * 10)
  ellipse(ctx, 0, 0, 6, 5, '#a8673f', true, 2)
  ellipse(ctx, -1.5, -1.5, 1.6, 1.2, '#e2b08a', false)
  ctx.restore()
}

export function drawGem(ctx: Ctx, x: number, y: number, t: number, used: boolean): void {
  ctx.save()
  ctx.translate(x, y + Math.sin(t * 3) * 3)
  ctx.rotate(Math.sin(t * 1.5) * 0.15)
  if (used) {
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = '#7cf0b0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -12); ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0)
    ctx.closePath()
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    ctx.globalAlpha = 0.35
    ellipse(ctx, 0, 0, 18, 18, '#b8ffd9', false)
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.moveTo(0, -13); ctx.lineTo(11, 0); ctx.lineTo(0, 13); ctx.lineTo(-11, 0)
    ctx.closePath()
    ctx.fillStyle = '#4fe39a'
    ctx.fill()
    ctx.lineWidth = 2.4
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.beginPath()
    ctx.moveTo(0, -9); ctx.lineTo(5, -1); ctx.lineTo(0, 0); ctx.lineTo(-5, -1)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

export function drawPlatform(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 8)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.clip()
  ctx.fillStyle = '#ff8fc0'
  for (let i = -h; i < w; i += 16) {
    ctx.beginPath()
    ctx.moveTo(x + i, y + h)
    ctx.lineTo(x + i + 8, y + h)
    ctx.lineTo(x + i + 8 + h, y)
    ctx.lineTo(x + i + h, y)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 8)
  ctx.lineWidth = 2.5
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.roundRect(x + 6, y + 3, w - 12, 3, 2)
  ctx.fill()
}

export function drawHeart(ctx: Ctx, x: number, y: number, s: number, color: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s / 10, s / 10)
  ctx.beginPath()
  ctx.moveTo(0, 4)
  ctx.bezierCurveTo(-10, -3, -6, -11, 0, -6)
  ctx.bezierCurveTo(6, -11, 10, -3, 0, 4)
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

export function drawStar(ctx: Ctx, x: number, y: number, r: number, rot: number, color: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.4 : r
    const a = (i / 8) * Math.PI * 2
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}
