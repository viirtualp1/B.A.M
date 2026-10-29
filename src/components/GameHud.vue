<script setup lang="ts">
import { MAX_HEARTS } from '../game/constants'
import { ui } from '../game/store'
import { t } from '../game/i18n'

defineEmits<{ pause: []; mute: [] }>()
</script>

<template>
  <header class="hud">
    <div class="group">
      <div class="chip hearts" :aria-label="`Hearts: ${ui.hearts}`">
        <svg v-for="i in MAX_HEARTS" :key="i" viewBox="0 0 24 22" class="heart" :class="{ empty: i > ui.hearts }">
          <path d="M12 21C5 15.5 1 12 1 7.2 1 3.8 3.6 1.2 6.8 1.2c2 0 3.9 1 5.2 2.7 1.3-1.7 3.2-2.7 5.2-2.7C20.4 1.2 23 3.8 23 7.2 23 12 19 15.5 12 21z" />
        </svg>
      </div>
      <div class="chip">
        <svg viewBox="0 0 34 18" class="candy">
          <path d="M9 9 2 3v12zM25 9l7-6v12z" fill="#ffd1e4" />
          <circle cx="17" cy="9" r="7.5" fill="#ffd1e4" />
          <path d="M17 9m-1 0a1 1 0 1 1 2 0a3 3 0 1 1-5 0a5 5 0 1 1 9 0" fill="none" stroke="#ff7fae" stroke-width="2" />
        </svg>
        <span class="num">{{ ui.levelCandy }}/{{ ui.levelCandyTotal }}</span>
      </div>
      <div v-if="ui.levelNeedsKey" class="chip key" :class="{ got: ui.hasKey }">
        <svg viewBox="0 0 30 16"><circle cx="7" cy="8" r="5.5" /><rect x="11" y="6" width="16" height="4" rx="1.5" /><rect x="22" y="9" width="3.5" height="5" rx="1" /></svg>
      </div>
    </div>
    <div class="level">{{ t(`l${ui.levelIndex + 1}` as 'l1') }}</div>
    <div class="group">
      <div class="chip cats">
        <span :class="{ on: ui.rescued.includes('billion') }">{{ t('billion') }}</span>
        <span :class="{ on: ui.rescued.includes('million') }">{{ t('million') }}</span>
      </div>
      <button class="chip icon" :aria-label="t('sound')" @click="$emit('mute')">{{ ui.muted ? '✕' : '♪' }}</button>
      <button class="chip icon" :aria-label="t('pause')" @click="$emit('pause')">❚❚</button>
    </div>
  </header>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0 0 auto 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: max(10px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) 0 max(16px, env(safe-area-inset-left, 0px));
  pointer-events: none;
}
.group { display: flex; gap: 8px; align-items: center; }
.chip {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 12px;
  border-radius: 19px;
  background: var(--paper);
  border: 3px solid var(--ink);
  box-shadow: var(--shadow);
  font-weight: 900;
  font-size: 16px;
  color: var(--ink);
}
.num { font-variant-numeric: tabular-nums; }
.heart { width: 22px; height: 20px; fill: var(--pink); stroke: var(--ink); stroke-width: 2; transition: transform 0.2s; }
.heart.empty { fill: #e6dde3; transform: scale(0.85); }
.candy { width: 30px; height: 17px; }
.candy path:first-child, .candy circle { stroke: var(--ink); stroke-width: 1.5; }
.key svg { width: 30px; height: 16px; fill: #e6dde3; stroke: var(--ink); stroke-width: 1.6; }
.key.got svg { fill: var(--gold); }
.key.got { animation: wiggle 0.6s; }
.cats span { font-size: 13px; opacity: 0.35; padding: 2px 6px; border-radius: 10px; }
.cats span.on { opacity: 1; background: var(--pink-soft); }
.icon { cursor: pointer; font-size: 15px; justify-content: center; min-width: 44px; }
.icon:focus-visible { outline: 3px solid var(--blue); outline-offset: 2px; }
.level {
  font-weight: 900;
  font-size: 15px;
  color: var(--paper);
  text-shadow: 0 2px 0 var(--ink), 0 -2px 0 var(--ink), 2px 0 0 var(--ink), -2px 0 0 var(--ink);
  padding-top: 8px;
  white-space: nowrap;
}
@media (max-height: 460px) {
  .chip { height: 32px; font-size: 14px; padding: 0 9px; border-width: 2.5px; }
  .heart { width: 18px; height: 16px; }
}
@media (max-width: 900px) {
  .level { display: none; }
}
@media (max-width: 640px) {
  .cats { display: none; }
}
@keyframes wiggle { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-8deg) scale(1.15); } 75% { transform: rotate(8deg) scale(1.15); } }
</style>
