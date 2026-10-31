<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { COSTUMES, exportCode, importCode, kittenCount, persist, saveState, type CostumeId } from '../game/save'
import { ui } from '../game/store'
import { buzz } from '../game/haptics'
import { t, type TextKey } from '../game/i18n'
import type { LevelDef } from '../game/levels'

const props = defineProps<{ levels: LevelDef[] }>()
const emit = defineEmits<{ play: [world: number, resume: boolean]; title: [] }>()

const panel = ref<'none' | 'wardrobe' | 'code'>('none')
const code = ref('')
const pasted = ref('')
const codeMsg = ref('')
const copied = ref(false)
const strip = ref<HTMLElement | null>(null)

const d = computed(() => saveState.data!)
const kittens = computed(() => kittenCount(saveState.data))
const totalKittens = computed(() => ui.kittensPerWorld.reduce((a, b) => a + b, 0))
const resume = computed(() => d.value.resume)

function name(i: number): string {
  return t(`l${i + 1}` as TextKey)
}

function pick(i: number): void {
  if (i > d.value.unlocked) { buzz('tap'); return }
  buzz('tap')
  emit('play', i, false)
}

function openCode(): void {
  code.value = exportCode(d.value)
  pasted.value = ''
  codeMsg.value = ''
  copied.value = false
  panel.value = 'code'
}

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
  } catch {
    const el = document.getElementById('save-code') as HTMLTextAreaElement | null
    el?.select()
  }
}

function loadCode(): void {
  const data = importCode(pasted.value, props.levels.length)
  if (!data) { codeMsg.value = t('badCode'); buzz('heavy'); return }
  saveState.data = data
  persist()
  codeMsg.value = t('codeLoaded')
  code.value = exportCode(data)
  buzz('success')
}

function wear(id: CostumeId, need: number): void {
  if (kittens.value < need) return
  d.value.costume = id
  persist()
  buzz('tap')
}

onMounted(async () => {
  await nextTick()
  const card = strip.value?.querySelector<HTMLElement>(`[data-world="${ui.hubFocus}"]`)
  card?.scrollIntoView({ inline: 'center', block: 'nearest' })
})
</script>

<template>
  <section class="hub">
    <header class="top">
      <button class="chip" @click="emit('title')">‹ {{ t('menu') }}</button>
      <div class="chip stat">{{ t('kittens') }} {{ kittens }}/{{ totalKittens }}</div>
      <div class="spacer" />
      <button class="chip" @click="panel = 'wardrobe'">{{ t('wardrobe') }}</button>
      <button class="chip" @click="openCode">{{ t('saveCode') }}</button>
    </header>

    <div class="bottom">
      <button v-if="resume" class="cta resume" @click="emit('play', resume.world, true)">▶ {{ t('continueAt', { n: resume.world + 1 }) }}</button>
      <div ref="strip" class="worlds" role="list">
        <button
          v-for="(lv, i) in levels"
          :key="i"
          role="listitem"
          class="world"
          :class="{ locked: i > d.unlocked, done: d.cleared[i], focus: i === ui.hubFocus }"
          :data-world="i"
          :style="{ '--sky': lv.palette.skyTop, '--grass': lv.palette.grass }"
          @click="pick(i)"
        >
          <span class="num">{{ i + 1 }}</span>
          <span class="wname">{{ i > d.unlocked ? t('locked') : name(i) }}</span>
          <span class="dots" :aria-label="t('kittens')">
            <i v-for="(f, k) in d.kittens[i].slice(0, ui.kittensPerWorld[i] ?? 0)" :key="k" :class="{ on: f }" />
          </span>
          <span v-if="lv.cat" class="cat" :class="{ on: d.cleared[i] }">{{ t(lv.cat) }}</span>
          <span v-if="d.cleared[i]" class="star">★</span>
        </button>
      </div>
    </div>

    <div v-if="panel !== 'none'" class="modal" @click.self="panel = 'none'">
      <div class="card">
        <template v-if="panel === 'wardrobe'">
          <h3>{{ t('wardrobe') }}</h3>
          <div class="costumes">
            <button
              v-for="c in COSTUMES"
              :key="c.id"
              class="costume"
              :class="{ on: d.costume === c.id, locked: kittens < c.need }"
              @click="wear(c.id, c.need)"
            >
              <span class="swatch" :style="{ background: c.dress, borderColor: c.bow }" />
              <span class="cname">{{ t(`c_${c.id}` as TextKey) }}</span>
              <span class="req">{{ kittens < c.need ? t('needKittens', { n: c.need }) : d.costume === c.id ? t('wearing') : t('wear') }}</span>
            </button>
          </div>
        </template>
        <template v-else>
          <h3>{{ t('saveCode') }}</h3>
          <p>{{ t('codeHelp') }}</p>
          <textarea id="save-code" :value="code" readonly rows="3" />
          <button class="cta small" @click="copy">{{ copied ? t('copied') : t('copy') }}</button>
          <label for="paste-code">{{ t('pasteCode') }}</label>
          <textarea id="paste-code" v-model="pasted" rows="2" placeholder="BAM1-…" />
          <button class="ghost small" :disabled="!pasted.trim()" @click="loadCode">{{ t('loadCode') }}</button>
          <p v-if="codeMsg" class="msg" role="status">{{ codeMsg }}</p>
        </template>
        <button class="ghost small" @click="panel = 'none'">{{ t('back') }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hub { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
.hub > * { pointer-events: auto; }
.top {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: max(10px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) 0 max(16px, env(safe-area-inset-left, 0px));
}
.spacer { flex: 1; }
.chip {
  height: 40px;
  padding: 0 14px;
  border-radius: 20px;
  border: 3px solid var(--ink);
  background: var(--paper);
  box-shadow: var(--shadow);
  font-weight: 900;
  font-size: 15px;
  color: var(--ink);
  display: flex;
  align-items: center;
  cursor: pointer;
}
.stat { cursor: default; font-variant-numeric: tabular-nums; }
.bottom {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 0 0 max(12px, env(safe-area-inset-bottom, 0px));
}
.resume { font-size: 17px; padding: 10px 24px; }
.worlds {
  display: flex;
  gap: 12px;
  max-width: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 6px max(16px, env(safe-area-inset-left, 0px)) 14px max(16px, env(safe-area-inset-right, 0px));
  scrollbar-width: none;
}
.world {
  position: relative;
  flex: 0 0 auto;
  width: clamp(120px, 17vw, 150px);
  height: clamp(112px, 30vh, 132px);
  scroll-snap-align: center;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 20px;
  border: 4px solid var(--ink);
  background: linear-gradient(180deg, var(--sky) 0%, var(--sky) 55%, var(--grass) 55%);
  box-shadow: 0 6px 0 var(--ink);
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}
.world:active { transform: translateY(4px); box-shadow: 0 2px 0 var(--ink); }
.world.focus { outline: 4px solid var(--paper); outline-offset: 3px; }
.world.locked { filter: grayscale(0.85) brightness(0.85); cursor: not-allowed; }
.num {
  position: absolute;
  top: 8px;
  left: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--paper);
  border: 3px solid var(--ink);
  font-weight: 900;
}
.star { position: absolute; top: 6px; right: 10px; font-size: 22px; color: var(--gold); -webkit-text-stroke: 1.5px var(--ink); }
.wname { font-weight: 900; font-size: 13px; line-height: 1.1; max-width: 100%; background: rgba(255, 250, 244, 0.9); border-radius: 8px; padding: 2px 6px; }
.dots { display: flex; gap: 4px; }
.dots i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--ink); background: rgba(255, 255, 255, 0.5); }
.dots i.on { background: #ffb46b; }
.cat { position: absolute; top: 44px; right: 8px; font-size: 11px; font-weight: 900; padding: 1px 6px; border-radius: 8px; background: rgba(255, 255, 255, 0.6); opacity: 0.6; }
.cat.on { background: var(--pink-soft); opacity: 1; }
.modal { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(45, 33, 64, 0.5); padding: 16px; }
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(460px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: var(--paper);
  border: 4px solid var(--ink);
  border-radius: 26px;
  box-shadow: 0 10px 0 rgba(61, 43, 69, 0.3);
}
.card h3 { margin: 0; font-size: 26px; font-weight: 900; }
.card p, .card label { margin: 0; font-weight: 700; font-size: 14px; }
textarea {
  width: 100%;
  font: 600 12px/1.4 ui-monospace, Menlo, monospace;
  padding: 8px 10px;
  border-radius: 12px;
  border: 2.5px solid var(--ink);
  background: #fff;
  color: var(--ink);
  resize: none;
  word-break: break-all;
  user-select: text;
  -webkit-user-select: text;
}
.small { font-size: 16px !important; padding: 9px 20px !important; }
.msg { color: #c2185b; }
.costumes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.costume {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 16px;
  border: 3px solid var(--ink);
  background: #fff;
  cursor: pointer;
  color: var(--ink);
}
.costume.on { background: var(--pink-soft); }
.costume.locked { opacity: 0.45; cursor: not-allowed; }
.swatch { width: 34px; height: 34px; border-radius: 50%; border: 5px solid; }
.cname { font-weight: 900; font-size: 13px; }
.req { font-size: 11px; font-weight: 700; text-align: center; }
</style>
