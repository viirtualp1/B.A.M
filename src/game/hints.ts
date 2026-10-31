// Wordless hints: a row of tiny pictograms (input glyph → effect), drawn inside the sign bubble.
// Input glyphs follow whatever Rosie is being played with right now: keys, touch buttons or a PlayStation pad.
import type { HintId } from './levels'
import type { InputMode } from './store'
import { INK, drawGem, drawSpiky, drawStar } from './sprites'

type Ctx = CanvasRenderingContext2D
export type Token =
  | 'btn:jump' | 'btn:dash' | 'btn:yarn' | 'hold' | 'then' | 'plus' | 'dirs' | 'up' | 'cracked' | 'wall' | 'float'
  | 'hook' | 'swing' | 'crystal' | 'swap' | 'clock' | 'timer' | 'gem' | 'crate' | 'button' | 'gateOpen' | 'spiky'
  | 'noStomp' | 'key' | 'lock'

export const HINTS: Record<HintId | 'locked', Token[]> = {
  jump: ['btn:jump', 'hold', 'up'],
  hover: ['btn:jump', 'then', 'btn:jump', 'hold', 'float'],
  dash: ['btn:dash', 'plus', 'dirs', 'then', 'cracked'],
  wall: ['wall', 'then', 'btn:jump'],
  yarn: ['hook', 'then', 'btn:yarn', 'then', 'swing'],
  crystal: ['crystal', 'then', 'swap'],
  timed: ['clock', 'then', 'swap', 'timer'],
  gem: ['gem', 'then', 'btn:dash'],
  crate: ['crate', 'then', 'button', 'then', 'gateOpen'],
  spiky: ['spiky', 'noStomp', 'then', 'btn:dash'],
  locked: ['lock', 'then', 'key'],
}

const KEYS: Record<string, string> = { jump: 'Space', dash: 'Shift', yarn: 'C' }
const PAD: Record<string, [string, string]> = { jump: ['✕', '#5aa9ff'], dash: ['□', '#ff7fd0'], yarn: ['○', '#ff6b6b'] }
const TOUCH: Record<string, string> = { jump: '#ff7fae', dash: '#ffcf3a', yarn: '#76c2ff' }

const FONT = (size: number): string => `900 ${size}px Nunito, Mali, ui-rounded, system-ui, sans-serif`

export function tokenWidth(ctx: Ctx, tk: Token, mode: InputMode): number {
  if (tk === 'then' || tk === 'plus') return 18
  if (tk === 'hold') return 26
  if (tk.startsWith('btn:') && mode === 'keyboard') {
    ctx.font = FONT(12)
    return Math.max(30, ctx.measureText(KEYS[tk.slice(4)]).width + 16)
  }
  return 32
}

function line(ctx: Ctx, pts: number[], w = 2.5, color = INK): void {
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.lineWidth = w
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, r = 4): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = INK
  ctx.stroke()
}

/** Draws one token centred at (x, y). `t` animates the little motions. */
export function drawToken(ctx: Ctx, tk: Token, x: number, y: number, mode: InputMode, t: number): void {
  ctx.save()
  ctx.translate(x, y)
  if (tk.startsWith('btn:')) {
    const a = tk.slice(4)
    const press = Math.sin(t * 6) > 0.4 ? 2 : 0
    if (mode === 'keyboard') {
      ctx.font = FONT(12)
      const w = Math.max(30, ctx.measureText(KEYS[a]).width + 16)
      rect(ctx, -w / 2, -12 + press, w, 24, '#ffffff', 6)
      ctx.fillStyle = INK
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(KEYS[a], 0, press + 1)
    } else if (mode === 'pad') {
      ctx.beginPath(); ctx.arc(0, press, 13, 0, Math.PI * 2)
      ctx.fillStyle = '#2c2a35'; ctx.fill()
      ctx.font = FONT(15)
      ctx.fillStyle = PAD[a][1]
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(PAD[a][0], 0, press + 1)
    } else {
      ctx.beginPath(); ctx.arc(0, press, 13, 0, Math.PI * 2)
      ctx.fillStyle = TOUCH[a]; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
      if (a === 'jump') line(ctx, [0, press + 6, 0, press - 6, -4, press - 2, 0, press - 6, 4, press - 2], 2.5, '#fff')
      else if (a === 'dash') { line(ctx, [-6, press - 5, -1, press, -6, press + 5], 2.5, '#fff'); line(ctx, [1, press - 5, 6, press, 1, press + 5], 2.5, '#fff') }
      else { ctx.beginPath(); ctx.arc(0, press, 5, 0, Math.PI * 2); ctx.fillStyle = '#ffd1e4'; ctx.fill() }
    }
  } else {
    switch (tk) {
      case 'then': line(ctx, [-6, 0, 6, 0, 2, -4, 6, 0, 2, 4], 2.2); break
      case 'plus': line(ctx, [-5, 0, 5, 0]); line(ctx, [0, -5, 0, 5]); break
      case 'hold': {
        const f = (t * 1.2) % 1
        rect(ctx, -11, -4, 22, 8, '#ffffff', 4)
        ctx.fillStyle = '#ff7fae'
        ctx.beginPath(); ctx.roundRect(-10, -3, 20 * f, 6, 3); ctx.fill()
        break
      }
      case 'up': line(ctx, [0, 10, 0, -10, -6, -4, 0, -10, 6, -4], 3); break
      case 'dirs':
        for (let i = 0; i < 8; i++) {
          const an = (i / 8) * Math.PI * 2
          line(ctx, [Math.cos(an) * 4, Math.sin(an) * 4, Math.cos(an) * 12, Math.sin(an) * 12], 2)
        }
        break
      case 'cracked':
        rect(ctx, -12, -12, 24, 24, '#ecd0aa', 5)
        line(ctx, [-4, -10, 0, -2, -4, 4, 2, 10], 2, '#8f6a48')
        break
      case 'wall':
        rect(ctx, -14, -14, 8, 28, '#c98b5e', 2)
        ctx.beginPath(); ctx.arc(2, -2, 7, 0, Math.PI * 2); ctx.fillStyle = '#ffe6da'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
        line(ctx, [8, 8, 13, 2, 13, 8], 2, '#ff7fae')
        break
      case 'float': {
        const bob = Math.sin(t * 4) * 2
        ctx.beginPath(); ctx.arc(0, -3 + bob, 8, 0, Math.PI * 2); ctx.fillStyle = '#ffe6da'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
        ctx.beginPath(); ctx.arc(0, -8 + bob, 7, Math.PI, 0); ctx.fillStyle = '#ff5fa8'; ctx.fill()
        drawStar(ctx, -9, 10 + bob, 4, t * 3, '#ff9fcb')
        drawStar(ctx, 8, 12 + bob, 3, -t * 3, '#ffd84a')
        break
      }
      case 'hook':
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke()
        ctx.lineWidth = 4; ctx.strokeStyle = '#ffc93d'; ctx.stroke()
        break
      case 'swing':
        ctx.beginPath(); ctx.arc(0, -12, 18, 0.5, Math.PI - 0.5); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke()
        line(ctx, [-15, -1, -15, 6, -9, 4], 2.5)
        break
      case 'crystal':
      case 'clock':
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, -2); ctx.lineTo(0, 12); ctx.lineTo(-8, -2); ctx.closePath()
        ctx.fillStyle = '#ff8fc0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
        if (tk === 'clock') { ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]) }
        break
      case 'swap': {
        const s = Math.sin(t * 3) > 0
        rect(ctx, -14, -8, 12, 16, s ? '#ff8fc0' : 'rgba(255,143,192,0.25)', 3)
        rect(ctx, 2, -8, 12, 16, s ? 'rgba(118,194,255,0.25)' : '#76c2ff', 3)
        break
      }
      case 'timer': {
        const f = 1 - ((t * 0.5) % 1)
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.closePath(); ctx.fillStyle = '#ff7fae'; ctx.fill()
        break
      }
      case 'gem': drawGem(ctx, 0, 0, 0, false); break
      case 'crate': rect(ctx, -12, -12, 24, 24, '#f6d3a3', 5); drawStar(ctx, 0, 0, 6, 0.3, '#ff9fcb'); break
      case 'button':
        rect(ctx, -12, 6, 24, 6, '#c9b6d6', 2)
        rect(ctx, -7, Math.sin(t * 4) > 0 ? 3 : 0, 14, Math.sin(t * 4) > 0 ? 4 : 7, '#ff7fae', 3)
        break
      case 'gateOpen':
        for (const bx of [-8, 0, 8]) rect(ctx, bx - 2.5, -12 - ((t * 10) % 8), 5, 18, '#ffffff', 2)
        line(ctx, [-12, 13, 12, 13], 2)
        break
      case 'spiky': ctx.scale(0.75, 0.75); drawSpiky(ctx, 0, 14, 1, t, 0); break
      case 'noStomp':
        line(ctx, [0, -10, 0, 8, -5, 3, 0, 8, 5, 3], 2.5)
        line(ctx, [-10, -10, 10, 10], 3, '#ff4f6d')
        break
      case 'key':
        ctx.beginPath(); ctx.arc(-6, 0, 6, 0, Math.PI * 2); ctx.fillStyle = '#ffcf3a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke()
        rect(ctx, -1, -2, 13, 4, '#ffcf3a', 2)
        break
      case 'lock':
        ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, 0); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke()
        rect(ctx, -9, -4, 18, 14, '#ffcf3a', 3)
        break
    }
  }
  ctx.restore()
}
