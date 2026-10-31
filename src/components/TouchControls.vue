<script setup lang="ts">
import { reactive } from 'vue'
import type { Action, Input } from '../game/input'
import { buzz } from '../game/haptics'
import { t } from '../game/i18n'
import { ui } from '../game/store'

const props = defineProps<{ input: Input }>()

/*
 * Layout follows what mobile action games settled on (Genshin, Brawl Stars, Dead Cells):
 * a floating stick that spawns under the left thumb, and a thumb arc on the right —
 * the main action (Jump) biggest in the corner, secondary actions orbiting it.
 */

// Floating stick: appears where the left thumb lands, anywhere in the left zone.
const stick = reactive({ id: -1, ox: 0, oy: 0, kx: 0, ky: 0 })
const stickHeld = new Set<Action>()
const DEAD = 0.3

function setStick(dirs: Action[]): void {
  for (const a of [...stickHeld]) if (!dirs.includes(a)) { stickHeld.delete(a); props.input.release(a) }
  for (const a of dirs) if (!stickHeld.has(a)) { stickHeld.add(a); props.input.press(a) }
}

function stickRadius(): number {
  return (document.querySelector('.stick-base') as HTMLElement | null)?.offsetWidth ?? 130
}

function zoneDown(e: PointerEvent): void {
  if (stick.id !== -1) return
  const zone = e.currentTarget as HTMLElement
  zone.setPointerCapture(e.pointerId)
  const r = zone.getBoundingClientRect()
  const half = stickRadius() / 2
  stick.id = e.pointerId
  stick.ox = Math.max(half + 4, Math.min(r.width - half - 4, e.clientX - r.left))
  stick.oy = Math.max(half + 4, Math.min(r.height - half - 4, e.clientY - r.top))
  zoneMove(e)
}

function zoneMove(e: PointerEvent): void {
  if (e.pointerId !== stick.id) return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const half = stickRadius() / 2
  const nx = (e.clientX - r.left - stick.ox) / half
  const ny = (e.clientY - r.top - stick.oy) / half
  const len = Math.hypot(nx, ny)
  const s = len > 1 ? 1 / len : 1
  stick.kx = nx * s
  stick.ky = ny * s
  const dirs: Action[] = []
  if (stick.kx < -DEAD) dirs.push('left')
  if (stick.kx > DEAD) dirs.push('right')
  if (stick.ky < -0.55) dirs.push('up')
  if (stick.ky > 0.55) dirs.push('down')
  setStick(dirs)
}

function zoneUp(e: PointerEvent): void {
  if (e.pointerId !== stick.id) return
  stick.id = -1
  stick.kx = 0
  stick.ky = 0
  setStick([])
}

const pressedBtn = reactive(new Set<Action>())
const buttons = new Map<number, Action>()

function btnDown(e: PointerEvent, a: Action): void {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  buttons.set(e.pointerId, a)
  pressedBtn.add(a)
  ui.inputMode = 'touch'
  props.input.press(a)
  buzz('tap')
}

function btnUp(e: PointerEvent): void {
  const a = buttons.get(e.pointerId)
  if (!a) return
  buttons.delete(e.pointerId)
  pressedBtn.delete(a)
  props.input.release(a)
}
</script>

<template>
  <div class="touch">
    <div class="zone" @pointerdown="zoneDown" @pointermove="zoneMove" @pointerup="zoneUp" @pointercancel="zoneUp">
      <div
        class="stick-base"
        :class="{ active: stick.id !== -1 }"
        :style="stick.id !== -1 ? { left: `${stick.ox}px`, top: `${stick.oy}px`, bottom: 'auto' } : undefined"
      >
        <div class="knob" :style="{ transform: `translate(calc(-50% + ${stick.kx * 80}%), calc(-50% + ${stick.ky * 80}%))` }" />
      </div>
    </div>

    <div class="arc">
      <button
        class="btn jump"
        :class="{ down: pressedBtn.has('jump') }"
        :aria-label="t('btnJump')"
        @pointerdown="btnDown($event, 'jump')" @pointerup="btnUp" @pointercancel="btnUp"
      >
        <svg viewBox="0 0 24 24"><path d="M12 4 4 13h5v7h6v-7h5z" /></svg>
      </button>
      <button
        class="btn dash"
        :class="{ down: pressedBtn.has('dash'), cooling: !ui.dashReady }"
        :aria-label="t('btnDash')"
        @pointerdown="btnDown($event, 'dash')" @pointerup="btnUp" @pointercancel="btnUp"
      >
        <svg viewBox="0 0 24 24"><path d="M3 7h8l-2-3h3l4 8-4 8H9l2-3H3l2-5z" /><path d="M14 4h3l4 8-4 8h-3l4-8z" /></svg>
      </button>
      <button
        class="btn yarn"
        :class="{ down: pressedBtn.has('yarn') }"
        :aria-label="t('btnYarn')"
        @pointerdown="btnDown($event, 'yarn')" @pointerup="btnUp" @pointercancel="btnUp"
      >
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="13" r="7" />
          <path d="M5.5 9.5c3 1 7 1 11-1M4.5 14c4 1.5 9 1 12.5-1.5M8 6.5c-1 4 0 9 3 12.5M13 6c1.5 3.5 1.5 8.5-1 12.5" fill="none" />
          <path d="M17 8c2-2 4-3 5-3" fill="none" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.touch {
  /* Sizes track screen height so they feel the same on every phone; --ui-scale is the player's S/M/L choice. */
  --s: var(--ui-scale, 1);
  --jump: clamp(70px, calc(21vh * var(--s)), 104px);
  --sub: calc(var(--jump) * 0.74);
  --stick: clamp(110px, calc(33vh * var(--s)), 160px);
  --edge-x: max(22px, calc(env(safe-area-inset-right, 0px) + 8px));
  --edge-y: max(16px, env(safe-area-inset-bottom, 0px));
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.zone {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 45%;
  height: 72%;
  pointer-events: auto;
  touch-action: none;
}
.stick-base {
  position: absolute;
  left: calc(max(22px, env(safe-area-inset-left, 0px) + 8px) + var(--stick) / 2);
  bottom: calc(var(--edge-y) + var(--stick) / 2);
  width: var(--stick);
  height: var(--stick);
  transform: translate(-50%, 50%);
  border-radius: 50%;
  background: rgba(255, 250, 244, 0.22);
  border: 2.5px solid rgba(61, 43, 69, 0.35);
  opacity: 0.55;
  transition: opacity 0.15s;
}
.stick-base.active { transform: translate(-50%, -50%); opacity: 1; background: rgba(255, 250, 244, 0.3); }
.knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44%;
  height: 44%;
  border-radius: 50%;
  background: rgba(255, 250, 244, 0.92);
  border: 3px solid var(--ink);
  box-shadow: 0 4px 0 rgba(61, 43, 69, 0.25);
}

/* Thumb arc anchored on the Jump button's centre. */
.arc {
  position: absolute;
  right: calc(var(--edge-x) + var(--jump) / 2);
  bottom: calc(var(--edge-y) + var(--jump) / 2);
  width: 0;
  height: 0;
  pointer-events: auto;
}
.btn {
  position: absolute;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 3px solid var(--ink);
  padding: 0;
  touch-action: none;
  box-shadow: 0 4px 0 rgba(61, 43, 69, 0.3);
  transform: translate(-50%, -50%);
  transition: transform 0.06s, box-shadow 0.06s, opacity 0.1s;
  opacity: 0.82;
}
.btn::after {
  /* invisible padding so near-misses still count */
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
}
.btn.down { transform: translate(-50%, -50%) scale(0.9); box-shadow: 0 1px 0 rgba(61, 43, 69, 0.3); opacity: 1; }
.btn svg { width: 46%; height: 46%; fill: #fff; stroke: var(--ink); stroke-width: 1.6; stroke-linejoin: round; }
.jump { width: var(--jump); height: var(--jump); left: 0; top: 0; background: #ff7fae; }
.dash {
  width: var(--sub);
  height: var(--sub);
  /* left of Jump, a touch lower than horizontal so the thumb rolls onto it */
  left: calc((var(--jump) / 2 + var(--sub) / 2 + 10px) * -0.985);
  top: calc((var(--jump) / 2 + var(--sub) / 2 + 10px) * 0.17);
  background: #ffcf3a;
}
.dash svg { fill: #fff; }
.dash.cooling { filter: grayscale(0.9); opacity: 0.55; }
.yarn {
  width: var(--sub);
  height: var(--sub);
  /* up-left of Jump, at ~125° */
  left: calc((var(--jump) / 2 + var(--sub) / 2 + 10px) * -0.57);
  top: calc((var(--jump) / 2 + var(--sub) / 2 + 10px) * -0.82);
  background: #76c2ff;
}
.yarn svg { fill: #ffd1e4; }
.yarn svg path { stroke: #ff7fae; stroke-width: 1.4; }
</style>
