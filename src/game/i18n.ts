import { reactive } from 'vue'

export type Locale = 'en' | 'th'

const en = {
  lead: 'Rosie is on a mission to rescue two tuxedo kitties!',
  play: 'Play',
  continue: 'Continue · World {n}',
  newGame: 'New game',
  run: 'run',
  jump: 'jump',
  dash: 'dash',
  yarn: 'yarn hook',
  pause: 'pause',
  world: 'World {n} of {m}',
  paused: 'Paused',
  resume: 'Resume',
  restartWorld: 'Restart world',
  menu: 'Menu',
  ohNo: 'Oh no!',
  outOfHearts: 'Out of hearts. The kitties believe in you!',
  tryAgain: 'Try again',
  worldClear: 'World clear!',
  savedBillion: 'Billion is saved!',
  savedMillion: 'Million is saved!',
  sweets: 'Sweets: {a} of {b}',
  hooray: 'Hooray!',
  endText: 'Billion and Million are home, purring happily.',
  totalSweets: 'Total sweets',
  playAgain: 'Play again',
  rotate: 'Turn your phone sideways',
  btnJump: 'Jump',
  btnDash: 'Dash',
  btnYarn: 'Yarn',
  billion: 'Billion',
  million: 'Million',
  meow: 'meow!',
  locked: 'Locked! Find the golden key.',
  sound: 'Sound',
  vibration: 'Vibration',
  controlsSize: 'Button size',
  gamepad: 'Controller connected',
  l1: 'Candy Meadow', l1s: 'Jump, dash, climb',
  l2: 'Cloud Garden', l2s: 'Yarn, crystals — and Billion',
  l3: 'Sugar Caves', l3s: 'Spiky trouble ahead',
  l4: 'Sunset Roofs', l4s: 'The last climb — to Million',
  tipJump: 'Hold jump to jump higher',
  tipDash: 'Dash smashes cracked blocks. Aim it in any direction!',
  tipWall: 'Jump off walls to climb up',
  tipYarn: 'Yarn: hook a gold ring and swing',
  tipCrystal: 'Crystals swap pink and blue blocks — even in midair',
  tipGem: 'Green gems refill your dash',
  tipSpiky: "Spikies can't be stomped. Dash into them!",
}

type Dict = typeof en

const th: Dict = {
  lead: 'โรซี่ออกภารกิจช่วยน้องแมวทักซิโด้สองตัว!',
  play: 'เล่น',
  continue: 'เล่นต่อ · โลก {n}',
  newGame: 'เริ่มใหม่',
  run: 'วิ่ง',
  jump: 'กระโดด',
  dash: 'พุ่ง',
  yarn: 'ไหมพรมเกี่ยว',
  pause: 'หยุด',
  world: 'โลก {n} จาก {m}',
  paused: 'หยุดชั่วคราว',
  resume: 'เล่นต่อ',
  restartWorld: 'เริ่มโลกนี้ใหม่',
  menu: 'เมนู',
  ohNo: 'โอ๊ะ!',
  outOfHearts: 'หัวใจหมดแล้ว แต่น้องแมวเชื่อในตัวเธอนะ!',
  tryAgain: 'ลองอีกครั้ง',
  worldClear: 'ผ่านด่านแล้ว!',
  savedBillion: 'ช่วยบิลเลียนได้แล้ว!',
  savedMillion: 'ช่วยมิลเลียนได้แล้ว!',
  sweets: 'ขนม: {a} จาก {b}',
  hooray: 'เย้!',
  endText: 'บิลเลียนกับมิลเลียนกลับถึงบ้าน ครางครืด ๆ อย่างมีความสุข',
  totalSweets: 'ขนมทั้งหมด',
  playAgain: 'เล่นอีกครั้ง',
  rotate: 'หมุนโทรศัพท์เป็นแนวนอนนะ',
  btnJump: 'กระโดด',
  btnDash: 'พุ่ง',
  btnYarn: 'ไหมพรม',
  billion: 'บิลเลียน',
  million: 'มิลเลียน',
  meow: 'เมี้ยว!',
  locked: 'กรงล็อกอยู่! หากุญแจทองให้เจอ',
  sound: 'เสียง',
  vibration: 'สั่น',
  controlsSize: 'ขนาดปุ่ม',
  gamepad: 'เชื่อมต่อจอยแล้ว',
  l1: 'ทุ่งลูกกวาด', l1s: 'กระโดด พุ่ง ปีนกำแพง',
  l2: 'สวนเมฆ', l2s: 'ไหมพรม คริสตัล และบิลเลียน',
  l3: 'ถ้ำน้ำตาล', l3s: 'ระวังเจ้าหนาม!',
  l4: 'หลังคายามเย็น', l4s: 'ปีนครั้งสุดท้าย ไปหามิลเลียน',
  tipJump: 'กดกระโดดค้างไว้ จะกระโดดได้สูงขึ้น',
  tipDash: 'พุ่งชนบล็อกร้าวให้แตก พุ่งได้ทุกทิศเลย!',
  tipWall: 'กระโดดถีบกำแพงเพื่อปีนขึ้นไป',
  tipYarn: 'ไหมพรม: เกี่ยวห่วงทองแล้วแกว่งตัว',
  tipCrystal: 'คริสตัลสลับบล็อกชมพูกับฟ้า แตะกลางอากาศก็ได้',
  tipGem: 'อัญมณีเขียวเติมพลังพุ่ง',
  tipSpiky: 'เจ้าหนามเหยียบไม่ได้ ต้องพุ่งชน!',
}

export type TextKey = keyof Dict

const DICTS: Record<Locale, Dict> = { en, th }
const KEY = 'billion-million-locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'th') return saved
  } catch {
    // ignore
  }
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('th') ? 'th' : 'en'
}

export const i18n = reactive({ locale: initialLocale() as Locale })

export function setLocale(l: Locale): void {
  i18n.locale = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') document.documentElement.lang = l
}

export function t(key: TextKey, vars: Record<string, string | number> = {}): string {
  return DICTS[i18n.locale][key].replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? ''))
}
