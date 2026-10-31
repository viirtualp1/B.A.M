import { reactive } from 'vue'

export type Locale = 'en' | 'th'

const en = {
  lead: 'Rosie is on a mission to rescue two tuxedo kitties!',
  play: 'Play',
  run: 'run',
  jump: 'jump',
  dash: 'dash',
  yarn: 'yarn hook',
  pause: 'pause',
  world: 'World {n} of {m}',
  paused: 'Paused',
  resume: 'Resume',
  restartWorld: 'Restart world',
  toHome: 'Back home',
  menu: 'Title',
  worldClear: 'World clear!',
  savedBillion: 'Billion is saved!',
  savedMillion: 'Million is saved!',
  bossDown: 'The Grumble King is calm again!',
  sweets: 'Sweets: {a} of {b}',
  hooray: 'Hooray!',
  endText: 'Billion and Million are home, purring happily.',
  playAgain: 'Back home',
  rotate: 'Turn your phone sideways',
  btnJump: 'Jump',
  btnDash: 'Dash',
  btnYarn: 'Yarn',
  billion: 'Billion',
  million: 'Million',
  meow: 'meow!',
  sound: 'Sound',
  vibration: 'Vibration',
  controlsSize: 'Button size',
  // save slots
  chooseSave: 'Choose a save',
  slot: 'Save {n}',
  emptySlot: 'Empty — start a new adventure',
  newAdventure: 'New adventure',
  load: 'Load',
  del: 'Delete',
  confirmDelete: 'Delete this save for good?',
  yesDelete: 'Yes, delete',
  cancel: 'Cancel',
  back: 'Back',
  playTime: '{h}h {m}m',
  worldsDone: '{a}/{b} worlds',
  // hub
  home: "Rosie's house",
  continueAt: 'Continue · World {n}',
  locked: 'Locked',
  wardrobe: 'Wardrobe',
  saveCode: 'Save code',
  kittens: 'Kittens',
  needKittens: 'Find {n} kittens',
  wear: 'Wear',
  wearing: 'Wearing',
  c_classic: 'Classic', c_mint: 'Mint star', c_sky: 'Sky', c_ears: 'Tuxedo ears', c_royal: 'Royal', c_gold: 'Golden',
  codeHelp: 'Copy this code to move your save to another device.',
  copy: 'Copy',
  copied: 'Copied',
  pasteCode: 'Paste a save code to load it into this slot',
  loadCode: 'Load code',
  badCode: "That code doesn't look like a save. Check that you copied all of it.",
  codeLoaded: 'Save loaded',
  // install
  install: 'Install app',
  installIos: 'Tap Share, then “Add to Home Screen” — the game opens full screen like an app.',
  gotIt: 'Got it',
  l1: 'Candy Meadow', l1s: 'Jump, float, dash, climb',
  l2: 'Cloud Garden', l2s: 'Swing on yarn',
  l3: 'Toy Workshop', l3s: 'Push, press, think — and Billion',
  l4: 'Sugar Caves', l4s: 'Dash through the dark',
  l5: 'Clock Tower', l5s: 'Beat the clock',
  l6: 'Sunset Roofs', l6s: 'Everything at once — and Million',
  l7: 'Storm Crown', l7s: 'The Grumble King',
}

type Dict = typeof en

const th: Dict = {
  lead: 'โรซี่ออกภารกิจช่วยน้องแมวทักซิโด้สองตัว!',
  play: 'เล่น',
  run: 'วิ่ง',
  jump: 'กระโดด',
  dash: 'พุ่ง',
  yarn: 'ไหมพรมเกี่ยว',
  pause: 'หยุด',
  world: 'โลก {n} จาก {m}',
  paused: 'หยุดชั่วคราว',
  resume: 'เล่นต่อ',
  restartWorld: 'เริ่มโลกนี้ใหม่',
  toHome: 'กลับบ้าน',
  menu: 'หน้าแรก',
  worldClear: 'ผ่านด่านแล้ว!',
  savedBillion: 'ช่วยบิลเลียนได้แล้ว!',
  savedMillion: 'ช่วยมิลเลียนได้แล้ว!',
  bossDown: 'ราชาขี้บ่นใจเย็นลงแล้ว!',
  sweets: 'ขนม: {a} จาก {b}',
  hooray: 'เย้!',
  endText: 'บิลเลียนกับมิลเลียนกลับถึงบ้าน ครางครืด ๆ อย่างมีความสุข',
  playAgain: 'กลับบ้าน',
  rotate: 'หมุนโทรศัพท์เป็นแนวนอนนะ',
  btnJump: 'กระโดด',
  btnDash: 'พุ่ง',
  btnYarn: 'ไหมพรม',
  billion: 'บิลเลียน',
  million: 'มิลเลียน',
  meow: 'เมี้ยว!',
  sound: 'เสียง',
  vibration: 'สั่น',
  controlsSize: 'ขนาดปุ่ม',
  chooseSave: 'เลือกเซฟ',
  slot: 'เซฟ {n}',
  emptySlot: 'ว่าง — เริ่มการผจญภัยใหม่',
  newAdventure: 'ผจญภัยใหม่',
  load: 'โหลด',
  del: 'ลบ',
  confirmDelete: 'ลบเซฟนี้ถาวรเลยไหม?',
  yesDelete: 'ลบเลย',
  cancel: 'ยกเลิก',
  back: 'กลับ',
  playTime: '{h} ชม. {m} นาที',
  worldsDone: '{a}/{b} โลก',
  home: 'บ้านของโรซี่',
  continueAt: 'เล่นต่อ · โลก {n}',
  locked: 'ล็อกอยู่',
  wardrobe: 'ตู้เสื้อผ้า',
  saveCode: 'รหัสเซฟ',
  kittens: 'ลูกแมว',
  needKittens: 'หาลูกแมวให้ครบ {n} ตัว',
  wear: 'ใส่',
  wearing: 'ใส่อยู่',
  c_classic: 'คลาสสิก', c_mint: 'ดาวมิ้นต์', c_sky: 'ฟ้าใส', c_ears: 'หูแมวทักซิโด้', c_royal: 'เจ้าหญิง', c_gold: 'สีทอง',
  codeHelp: 'คัดลอกรหัสนี้เพื่อย้ายเซฟไปอีกเครื่อง',
  copy: 'คัดลอก',
  copied: 'คัดลอกแล้ว',
  pasteCode: 'วางรหัสเซฟเพื่อโหลดลงช่องนี้',
  loadCode: 'โหลดรหัส',
  badCode: 'รหัสนี้ไม่ใช่เซฟ ลองคัดลอกมาให้ครบอีกครั้งนะ',
  codeLoaded: 'โหลดเซฟแล้ว',
  install: 'ติดตั้งแอป',
  installIos: 'แตะปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม” เกมจะเปิดเต็มจอเหมือนแอป',
  gotIt: 'เข้าใจแล้ว',
  l1: 'ทุ่งลูกกวาด', l1s: 'กระโดด ลอยตัว พุ่ง ปีน',
  l2: 'สวนเมฆ', l2s: 'แกว่งไหมพรม',
  l3: 'โรงงานของเล่น', l3s: 'ดัน กด คิด และบิลเลียน',
  l4: 'ถ้ำน้ำตาล', l4s: 'พุ่งฝ่าความมืด',
  l5: 'หอนาฬิกา', l5s: 'แข่งกับเวลา',
  l6: 'หลังคายามเย็น', l6s: 'ทุกอย่างรวมกัน และมิลเลียน',
  l7: 'มงกุฎพายุ', l7s: 'ราชาขี้บ่น',
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
