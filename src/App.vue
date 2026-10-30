<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref } from 'vue'
import { Game } from './game/engine'
import { audio } from './game/audio'
import { saveUiScale, ui } from './game/store'
import { haptics, buzz } from './game/haptics'
import { i18n, setLocale, t, type Locale, type TextKey } from './game/i18n'
import GameHud from './components/GameHud.vue'
import TouchControls from './components/TouchControls.vue'

const canvas = ref<HTMLCanvasElement | null>(null)
const game = markRaw(new Game())
if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game
const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || location.search.includes('touch')
const portrait = ref(false)
const hapticsOn = ref(haptics.enabled)

const playing = computed(() => ['play', 'paused', 'clear', 'over'].includes(ui.screen))
const levelName = computed(() => t(`l${ui.levelIndex + 1}` as TextKey))
const levelSub = computed(() => t(`l${ui.levelIndex + 1}s` as TextKey))
const clearTitle = computed(() => {
  if (ui.justRescued === 'billion') return t('savedBillion')
  if (ui.justRescued === 'million') return t('savedMillion')
  return t('worldClear')
})

function start(level: number): void {
  buzz('tap')
  game.newGame(level)
}

function toTitle(): void {
  ui.screen = 'title'
  audio.stopSong()
}

function pickLocale(l: Locale): void {
  setLocale(l)
  buzz('tap')
}

function toggleHaptics(): void {
  haptics.enabled = !haptics.enabled
  hapticsOn.value = haptics.enabled
  buzz('tap')
}

const SIZES: [string, number][] = [['S', 0.85], ['M', 1], ['L', 1.15]]

function pickSize(v: number): void {
  saveUiScale(v)
  buzz('tap')
}

function checkOrientation(): void {
  portrait.value = isTouch && window.innerHeight > window.innerWidth
}

function onVisibility(): void {
  if (document.hidden && ui.screen === 'play') game.togglePause()
}

const block = (e: Event): void => e.preventDefault()

onMounted(() => {
  setLocale(i18n.locale)
  if (canvas.value) game.mount(canvas.value)
  document.fonts?.load('900 14px Nunito').catch(() => undefined)
  document.fonts?.load('700 15px Mali', 'กขค').catch(() => undefined)
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  document.addEventListener('visibilitychange', onVisibility)
  document.addEventListener('gesturestart', block)
  document.addEventListener('dblclick', block)
})

onBeforeUnmount(() => {
  game.unmount()
  window.removeEventListener('resize', checkOrientation)
  document.removeEventListener('visibilitychange', onVisibility)
  document.removeEventListener('gesturestart', block)
  document.removeEventListener('dblclick', block)
})
</script>

<template>
  <main class="stage" :style="{ '--ui-scale': ui.uiScale }">
    <canvas ref="canvas" class="view" />

    <GameHud v-if="playing" @pause="game.togglePause()" @mute="game.toggleMute()" />

    <Transition name="banner">
      <div v-if="ui.banner && ui.screen === 'play'" class="banner">
        <span class="eyebrow">{{ t('world', { n: ui.levelIndex + 1, m: ui.levelCount }) }}</span>
        <strong>{{ levelName }}</strong>
        <span class="sub">{{ levelSub }}</span>
      </div>
    </Transition>

    <section v-if="ui.screen === 'title'" class="screen title">
      <div class="langs" role="group" aria-label="Language">
        <button :class="{ on: i18n.locale === 'en' }" @click="pickLocale('en')">EN</button>
        <button :class="{ on: i18n.locale === 'th' }" @click="pickLocale('th')">ไทย</button>
      </div>
      <h1><span class="b">Billion</span> <span class="amp">&amp;</span> <span class="m">Million</span></h1>
      <p class="lead">{{ t('lead') }}</p>
      <div class="menu">
        <button v-if="ui.savedLevel > 0" class="cta" @click="start(ui.savedLevel)">{{ t('continue', { n: ui.savedLevel + 1 }) }}</button>
        <button :class="ui.savedLevel > 0 ? 'ghost' : 'cta'" @click="start(0)">{{ ui.savedLevel > 0 ? t('newGame') : t('play') }}</button>
      </div>
      <dl v-if="ui.gamepad" class="keys">
        <div><dt>✕</dt><dd>{{ t('jump') }}</dd></div>
        <div><dt>□ / R1</dt><dd>{{ t('dash') }}</dd></div>
        <div><dt>○ / L1</dt><dd>{{ t('yarn') }}</dd></div>
        <div><dt>Options</dt><dd>{{ t('pause') }}</dd></div>
      </dl>
      <dl v-else-if="!isTouch" class="keys">
        <div><dt>← →</dt><dd>{{ t('run') }}</dd></div>
        <div><dt>Space</dt><dd>{{ t('jump') }}</dd></div>
        <div><dt>Shift / X</dt><dd>{{ t('dash') }}</dd></div>
        <div><dt>C</dt><dd>{{ t('yarn') }}</dd></div>
        <div><dt>Esc</dt><dd>{{ t('pause') }}</dd></div>
      </dl>
    </section>

    <section v-if="ui.screen === 'paused'" class="screen dim">
      <div class="card">
        <h2>{{ t('paused') }}</h2>
        <button class="cta" @click="game.togglePause()">{{ t('resume') }}</button>
        <button class="ghost" @click="game.restartLevel()">{{ t('restartWorld') }}</button>
        <div class="toggles">
          <button class="pill" :class="{ on: !ui.muted }" @click="game.toggleMute()">{{ t('sound') }}</button>
          <button v-if="isTouch" class="pill" :class="{ on: hapticsOn }" @click="toggleHaptics">{{ t('vibration') }}</button>
          <button class="pill" :class="{ on: i18n.locale === 'en' }" @click="pickLocale('en')">EN</button>
          <button class="pill" :class="{ on: i18n.locale === 'th' }" @click="pickLocale('th')">ไทย</button>
        </div>
        <div v-if="isTouch && !ui.gamepad" class="setting">
          <span>{{ t('controlsSize') }}</span>
          <div class="toggles">
            <button v-for="[label, v] in SIZES" :key="label" class="pill" :class="{ on: ui.uiScale === v }" @click="pickSize(v)">{{ label }}</button>
          </div>
        </div>
        <button class="ghost" @click="toTitle">{{ t('menu') }}</button>
      </div>
    </section>

    <section v-if="ui.screen === 'over'" class="screen dim">
      <div class="card">
        <h2>{{ t('ohNo') }}</h2>
        <p>{{ t('outOfHearts') }}</p>
        <button class="cta" @click="game.restartLevel()">{{ t('tryAgain') }}</button>
      </div>
    </section>

    <Transition name="fade">
      <section v-if="ui.screen === 'clear'" class="screen clear">
        <div class="ribbon">
          <strong>{{ clearTitle }}</strong>
          <span>{{ t('sweets', { a: ui.levelCandy, b: ui.levelCandyTotal }) }}</span>
        </div>
      </section>
    </Transition>

    <section v-if="ui.screen === 'end'" class="screen title end">
      <h1>{{ t('hooray') }}</h1>
      <p class="lead">{{ t('endText') }}</p>
      <p class="stat">{{ t('totalSweets') }}: <b>{{ ui.candy }}</b></p>
      <div class="menu">
        <button class="cta" @click="start(0)">{{ t('playAgain') }}</button>
      </div>
    </section>

    <TouchControls v-if="isTouch && !ui.gamepad && ui.screen === 'play'" :input="game.input" />

    <section v-if="portrait" class="screen rotate">
      <div class="phone" aria-hidden="true" />
      <p>{{ t('rotate') }}</p>
    </section>
  </main>
</template>

<style scoped>
.stage {
  position: relative;
  height: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.view { display: block; }

.banner {
  position: absolute;
  top: 34%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 32px 18px;
  background: var(--paper);
  border: 4px solid var(--ink);
  border-radius: 26px;
  box-shadow: 0 8px 0 rgba(61, 43, 69, 0.25);
  text-align: center;
  pointer-events: none;
  white-space: nowrap;
}
.banner .eyebrow { font-size: 13px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pink); }
.banner strong { font-size: 34px; font-weight: 900; line-height: 1.1; }
.banner .sub { font-size: 15px; font-weight: 700; opacity: 0.75; white-space: normal; max-width: 420px; }

.screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 24px max(16px, env(safe-area-inset-right, 0px)) 24px max(16px, env(safe-area-inset-left, 0px));
  text-align: center;
}
.title { justify-content: flex-start; padding-top: calc(7vh + env(safe-area-inset-top, 0px)); }
h1 {
  margin: 0;
  font-size: clamp(44px, 8vw, 92px);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--paper);
  -webkit-text-stroke: 6px var(--ink);
  paint-order: stroke fill;
  text-shadow: 0 8px 0 rgba(61, 43, 69, 0.35);
  animation: float 3s ease-in-out infinite;
  text-wrap: balance;
}
h1 .b { color: #ffd1e4; }
h1 .m { color: #cfe9ff; }
h1 .amp { color: var(--gold); }
.lead {
  margin: 0;
  font-size: clamp(16px, 2.2vw, 21px);
  font-weight: 800;
  color: var(--ink);
  background: rgba(255, 250, 244, 0.85);
  padding: 8px 18px;
  border-radius: 999px;
  border: 3px solid var(--ink);
}
.menu { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.cta, .ghost {
  font-size: 20px;
  font-weight: 900;
  padding: 14px 30px;
  border-radius: 999px;
  border: 4px solid var(--ink);
  cursor: pointer;
  color: var(--ink);
  box-shadow: 0 6px 0 var(--ink);
  transition: transform 0.1s, box-shadow 0.1s;
}
.cta { background: var(--pink); color: #fff; text-shadow: 0 2px 0 rgba(61, 43, 69, 0.4); }
.ghost { background: var(--paper); }
.cta:hover, .ghost:hover { transform: translateY(-2px); box-shadow: 0 8px 0 var(--ink); }
.cta:active, .ghost:active { transform: translateY(5px); box-shadow: 0 1px 0 var(--ink); }
.cta:focus-visible, .ghost:focus-visible { outline: 4px solid var(--blue); outline-offset: 3px; }
.keys {
  margin: 4px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.keys div {
  display: flex;
  gap: 6px;
  align-items: center;
  background: rgba(255, 250, 244, 0.85);
  border-radius: 12px;
  padding: 6px 10px;
  font-size: 14px;
  font-weight: 700;
}
.keys dt {
  font-weight: 900;
  background: var(--ink);
  color: var(--paper);
  border-radius: 7px;
  padding: 2px 8px;
}
.keys dd { margin: 0; }

.dim { background: rgba(45, 33, 64, 0.45); }
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  min-width: min(320px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 24px 28px 28px;
  background: var(--paper);
  border: 4px solid var(--ink);
  border-radius: 28px;
  box-shadow: 0 10px 0 rgba(61, 43, 69, 0.3);
}
.card h2 { margin: 0 0 4px; font-size: 34px; font-weight: 900; }
.card p { margin: 0 0 6px; font-weight: 700; max-width: 300px; }

.clear { pointer-events: none; justify-content: flex-start; padding-top: 16vh; }
.ribbon {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 40px;
  background: var(--pink);
  color: #fff;
  border: 4px solid var(--ink);
  border-radius: 24px;
  box-shadow: 0 8px 0 rgba(61, 43, 69, 0.3);
  animation: bounce-in 0.6s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.ribbon strong { font-size: clamp(30px, 5vw, 48px); font-weight: 900; -webkit-text-stroke: 2px var(--ink); paint-order: stroke fill; }
.ribbon span { font-weight: 800; font-size: 17px; }
.end .stat { margin: 0; font-weight: 800; font-size: 20px; background: rgba(255, 250, 244, 0.85); padding: 6px 16px; border-radius: 14px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.banner-enter-active { transition: opacity 0.3s, transform 0.5s cubic-bezier(0.3, 1.6, 0.5, 1); }
.banner-leave-active { transition: opacity 0.4s, transform 0.4s; }
.banner-enter-from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
.banner-leave-to { opacity: 0; transform: translate(-50%, -80%); }

@keyframes float { 0%, 100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-8px) rotate(1deg); } }
@keyframes bounce-in { from { transform: scale(0.4); } to { transform: scale(1); } }
.langs {
  position: absolute;
  top: max(14px, env(safe-area-inset-top, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--paper);
  border: 3px solid var(--ink);
  border-radius: 999px;
  box-shadow: var(--shadow);
}
.langs button, .pill {
  border: 0;
  background: transparent;
  font-weight: 900;
  font-size: 15px;
  color: var(--ink);
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
}
.langs button.on { background: var(--pink); color: #fff; }
.setting { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-weight: 800; }
.toggles { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.pill { border: 2.5px solid var(--ink); opacity: 0.5; }
.pill.on { opacity: 1; background: var(--pink-soft); }
.rotate { background: #2d2140; color: var(--paper); font-weight: 900; font-size: 20px; z-index: 5; }
.phone {
  width: 54px;
  height: 92px;
  border: 5px solid var(--paper);
  border-radius: 14px;
  animation: turn 2s ease-in-out infinite;
}
@keyframes turn { 0%, 30% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
@media (max-height: 460px) {
  .title { padding-top: max(14px, env(safe-area-inset-top, 0px)); gap: 12px; }
  h1 { font-size: 52px; -webkit-text-stroke-width: 5px; }
  .cta, .ghost { font-size: 17px; padding: 10px 24px; }
  .banner strong { font-size: 26px; }
  .card { padding: 16px 20px 20px; gap: 8px; }
  .card h2 { font-size: 26px; }
}
</style>
