<script setup lang="ts">
import { reactive } from 'vue'
import type { Action, Input } from '../game/input'
import { buzz } from '../game/haptics'
import { t } from '../game/i18n'

const props = defineProps<{ input: Input }>()

// Stick: one finger on the left pad picks left/right (and up/down to aim the dash).
const stick = reactive({ id: -1, kx: 0, ky: 0 })
const stickHeld = new Set<Action>()
const DEAD = 0.32

function setStick(dirs: Action[]): void {
  for (const a of [...stickHeld]) if (!dirs.includes(a)) { stickHeld.delete(a); props.input.release(a) }
  for (const a of dirs) if (!stickHeld.has(a)) { stickHeld.add(a); props.input.press(a) }
}

function moveStick(e: PointerEvent): void {
  if (e.pointerId !== stick.id) return
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const nx = ((e.clientX - r.left) / r.width) * 2 - 1
  const ny = ((e.clientY - r.top) / r.height) * 2 - 1
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

function stickDown(e: PointerEvent): void {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  stick.id = e.pointerId
  moveStick(e)
}

function stickUp(e: PointerEvent): void {
  if (e.pointerId !== stick.id) return
  stick.id = -1
  stick.kx = 0
  stick.ky = 0
  setStick([])
}

const buttons = new Map<number, Action>()

function btnDown(e: PointerEvent, a: Action): void {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  buttons.set(e.pointerId, a)
  props.input.press(a)
  buzz('tap')
}

function btnUp(e: PointerEvent): void {
  const a = buttons.get(e.pointerId)
  if (!a) return
  buttons.delete(e.pointerId)
  props.input.release(a)
}
</script>

<template>
  <div class="touch">
    <div
      class="stick"
      aria-label="Move"
      @pointerdown="stickDown"
      @pointermove="moveStick"
      @pointerup="stickUp"
      @pointercancel="stickUp"
    >
      <span class="arrow l">◀</span><span class="arrow r">▶</span><span class="arrow u">▲</span><span class="arrow d">▼</span>
      <div class="knob" :style="{ transform: `translate(${stick.kx * 34}px, ${stick.ky * 34}px)` }" />
    </div>
    <div class="acts">
      <button class="btn yarn" @pointerdown="btnDown($event, 'yarn')" @pointerup="btnUp" @pointercancel="btnUp">{{ t('btnYarn') }}</button>
      <button class="btn dash" @pointerdown="btnDown($event, 'dash')" @pointerup="btnUp" @pointercancel="btnUp">{{ t('btnDash') }}</button>
      <button class="btn jump" @pointerdown="btnDown($event, 'jump')" @pointerup="btnUp" @pointercancel="btnUp">{{ t('btnJump') }}</button>
    </div>
  </div>
</template>

<style scoped>
.touch {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 max(18px, env(safe-area-inset-right, 0px)) max(14px, env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px));
  pointer-events: none;
}
.stick {
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  background: rgba(255, 250, 244, 0.35);
  border: 3px solid rgba(61, 43, 69, 0.55);
  pointer-events: auto;
  touch-action: none;
}
.arrow { position: absolute; font-size: 13px; color: rgba(61, 43, 69, 0.6); font-weight: 900; }
.l { left: 10px; top: 50%; transform: translateY(-50%); }
.r { right: 10px; top: 50%; transform: translateY(-50%); }
.u { top: 8px; left: 50%; transform: translateX(-50%); }
.d { bottom: 8px; left: 50%; transform: translateX(-50%); }
.knob {
  position: absolute;
  left: calc(50% - 30px);
  top: calc(50% - 30px);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--paper);
  border: 3px solid var(--ink);
  box-shadow: var(--shadow);
  pointer-events: none;
}
.acts {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  gap: 10px 12px;
  align-items: end;
  pointer-events: auto;
}
.btn {
  border-radius: 50%;
  border: 3px solid var(--ink);
  color: var(--ink);
  font-weight: 900;
  font-size: 12px;
  touch-action: none;
  box-shadow: var(--shadow);
  width: 66px;
  height: 66px;
  padding: 0;
}
.btn:active { transform: translateY(3px); box-shadow: none; }
.yarn { grid-column: 1; grid-row: 1; background: rgba(118, 194, 255, 0.85); }
.dash { grid-column: 1; grid-row: 2; background: rgba(255, 216, 74, 0.88); }
.jump { grid-column: 2; grid-row: 1 / span 2; width: 86px; height: 86px; font-size: 14px; background: rgba(255, 127, 174, 0.9); color: #fff; text-shadow: 0 1px 0 var(--ink); }
</style>
