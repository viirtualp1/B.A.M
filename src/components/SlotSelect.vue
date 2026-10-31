<script setup lang="ts">
import { ref } from 'vue'
import { SLOT_COUNT, deleteSlot, freshSave, kittenCount, persist, readSlot, saveState, type SaveData } from '../game/save'
import { buzz } from '../game/haptics'
import { t } from '../game/i18n'
import { ui } from '../game/store'

const props = defineProps<{ worlds: number }>()
const emit = defineEmits<{ opened: []; back: [] }>()

const slots = ref<(SaveData | null)[]>([])
const confirming = ref(-1)

function refresh(): void {
  slots.value = Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(i, props.worlds))
}
refresh()

function open(i: number): void {
  buzz('tap')
  saveState.slot = i
  saveState.data = slots.value[i] ?? freshSave(props.worlds)
  persist()
  emit('opened')
}

function remove(i: number): void {
  deleteSlot(i)
  confirming.value = -1
  buzz('medium')
  refresh()
}

function time(d: SaveData): string {
  const min = Math.floor(d.playTime / 60)
  return t('playTime', { h: Math.floor(min / 60), m: min % 60 })
}
</script>

<template>
  <section class="slots">
    <h2>{{ t('chooseSave') }}</h2>
    <div class="list">
      <article v-for="(d, i) in slots" :key="i" class="slot" :class="{ empty: !d }">
        <button class="main" @click="open(i)">
          <span class="name">{{ t('slot', { n: i + 1 }) }}</span>
          <template v-if="d">
            <span class="stats">
              <span>★ {{ t('worldsDone', { a: d.cleared.filter(Boolean).length, b: worlds }) }}</span>
              <span>{{ t('kittens') }}: {{ kittenCount(d) }}/{{ ui.kittensPerWorld.reduce((a, b) => a + b, 0) }}</span>
              <span>{{ time(d) }}</span>
            </span>
          </template>
          <span v-else class="stats">{{ t('emptySlot') }}</span>
        </button>
        <div v-if="d" class="del">
          <template v-if="confirming === i">
            <span>{{ t('confirmDelete') }}</span>
            <button class="danger" @click="remove(i)">{{ t('yesDelete') }}</button>
            <button class="plain" @click="confirming = -1">{{ t('cancel') }}</button>
          </template>
          <button v-else class="plain" @click="confirming = i">{{ t('del') }}</button>
        </div>
      </article>
    </div>
    <button class="ghost back" @click="emit('back')">{{ t('back') }}</button>
  </section>
</template>

<style scoped>
.slots {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  background: rgba(45, 33, 64, 0.35);
  overflow-y: auto;
}
h2 { margin: 0; color: var(--paper); font-size: 30px; font-weight: 900; -webkit-text-stroke: 5px var(--ink); paint-order: stroke fill; }
.list { display: grid; grid-template-columns: repeat(3, minmax(0, 220px)); gap: 12px; }
@media (max-width: 640px) { .list { grid-template-columns: minmax(0, 320px); } }
.slot { display: flex; flex-direction: column; gap: 6px; }
.main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  text-align: left;
  padding: 14px 16px;
  min-height: 112px;
  background: var(--paper);
  border: 4px solid var(--ink);
  border-radius: 22px;
  box-shadow: 0 6px 0 var(--ink);
  cursor: pointer;
  color: var(--ink);
}
.main:active { transform: translateY(4px); box-shadow: 0 2px 0 var(--ink); }
.main:focus-visible { outline: 4px solid var(--blue); outline-offset: 3px; }
.empty .main { background: #fff0f7; border-style: dashed; }
.name { font-size: 20px; font-weight: 900; }
.stats { display: flex; flex-direction: column; gap: 2px; font-weight: 800; font-size: 14px; opacity: 0.85; font-variant-numeric: tabular-nums; }
.del { display: flex; gap: 6px; align-items: center; justify-content: flex-end; flex-wrap: wrap; font-weight: 800; font-size: 13px; color: var(--paper); text-shadow: 0 1px 0 var(--ink); }
.plain, .danger { border: 2.5px solid var(--ink); border-radius: 999px; padding: 4px 12px; font-weight: 900; font-size: 13px; cursor: pointer; background: var(--paper); color: var(--ink); }
.danger { background: #ff6b8a; color: #fff; }
.back { font-size: 17px; padding: 10px 26px; }
</style>
