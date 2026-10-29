import type { CatName } from './store'
import type { TextKey } from './i18n'

export interface Palette {
  skyTop: string
  skyBottom: string
  hillFar: string
  hillNear: string
  grass: string
  grassLight: string
  soil: string
  soilDot: string
  soilEdge: string
  sun: string
}

export interface SignDef {
  x: number
  y: number
  text: TextKey
}

export interface LevelDef {
  name: TextKey
  subtitle: TextKey
  palette: Palette
  cat: CatName | null
  cave: boolean
  W: number
  H: number
  grid: string[][]
  signs: SignDef[]
}

/*
 * Tile legend
 *  #  ground          C  cracked block (dash breaks it)   J  jelly (bounce)
 *  -  cloud (one-way) c  fluffy cloud (melts)             ^  thorns
 *  P  pink block      B  blue block (crystal S swaps them)
 *  m  platform ↔      v  platform ↕                       r  dash gem
 *  *  candy  o  yarn hook  S  crystal  k  key  F  bell checkpoint  G  goal  X  cat cage  @  start
 *  Enemies: e grumble, h spiky (dash only), b bee, f frog, g seed-spitting flower
 */
class Builder {
  grid: string[][]
  signs: SignDef[] = []

  constructor(public W: number, public H = 14) {
    this.grid = Array.from({ length: H }, () => Array<string>(W).fill(' '))
  }

  fill(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.put(i, j, c)
    return this
  }

  put(x: number, y: number, c: string): this {
    if (y >= 0 && y < this.H && x >= 0 && x < this.W) this.grid[y][x] = c
    return this
  }

  row(x: number, y: number, s: string): this {
    for (let i = 0; i < s.length; i++) if (s[i] !== ' ') this.put(x + i, y, s[i])
    return this
  }

  ground(a: number, b: number): this {
    return this.fill(a, 12, b - a + 1, 2, '#')
  }

  sign(x: number, y: number, text: TextKey): this {
    this.signs.push({ x, y, text })
    return this
  }
}

function candyMeadow(): Builder {
  const L = new Builder(140)
  L.ground(0, 20).put(3, 11, '@')
  L.sign(6, 11, 'tipJump')
  L.row(9, 9, '* * *')
  L.fill(13, 10, 2, 2, '#').row(13, 8, '**')
  L.put(18, 11, 'e')
  L.row(21, 8, '**')
  L.ground(25, 44)
  L.put(28, 11, 'f')
  L.put(32, 11, 'J')
  L.fill(35, 6, 2, 6, '#').row(35, 5, '**')
  L.put(40, 11, 'e')
  L.sign(42, 11, 'tipDash')
  L.ground(45, 90)
  L.fill(47, 1, 1, 8, '#').fill(47, 9, 1, 3, 'C')
  L.put(52, 8, 'b')
  L.fill(54, 11, 4, 1, '^').row(54, 8, '* *')
  L.put(60, 11, 'e').put(62, 11, 'e')
  L.sign(63, 11, 'tipWall')
  L.fill(65, 2, 1, 7, '#')
  L.fill(68, 3, 12, 9, '#')
  L.row(66, 2, '**')
  L.row(71, 2, '* * *').put(74, 2, 'b')
  L.put(85, 11, 'f')
  L.put(88, 11, 'F')
  L.row(93, 10, 'cc').row(98, 9, 'cc').row(103, 10, 'cc')
  L.put(96, 6, 'b').row(98, 7, '**')
  L.ground(107, 139)
  L.put(112, 11, 'g')
  L.row(115, 9, '---').row(119, 7, '---').row(119, 6, '***')
  L.put(122, 11, 'e').put(126, 11, 'e')
  L.fill(130, 0, 1, 6, '#').fill(130, 6, 1, 6, 'C')
  L.put(135, 11, 'G')
  return L
}

function cloudGarden(): Builder {
  const L = new Builder(160)
  L.ground(0, 14).put(2, 11, '@')
  L.sign(6, 11, 'tipYarn')
  L.put(18, 6, 'o').put(24, 5, 'o').put(30, 6, 'o')
  L.row(18, 9, '*').row(21, 7, '*').row(24, 8, '*').row(27, 7, '*').row(30, 9, '*')
  L.ground(35, 52)
  L.put(37, 11, 'F')
  L.sign(40, 11, 'tipCrystal')
  L.put(43, 9, 'S')
  L.fill(47, 1, 1, 11, 'P')
  L.put(50, 8, 'b')
  L.row(54, 10, 'BB').put(57, 7, 'S').row(58, 9, 'PP').row(58, 8, '**')
  L.ground(65, 80)
  L.fill(70, 1, 1, 11, 'B')
  L.put(75, 11, 'g').put(68, 11, 'e')
  L.sign(78, 11, 'tipGem')
  L.put(84, 8, 'r').put(88, 8, 'r').put(92, 8, 'r').row(95, 9, '---')
  L.row(86, 6, '*').row(90, 6, '*').row(96, 7, '*')
  L.ground(101, 159)
  L.put(103, 11, 'F')
  L.put(108, 9, 'v')
  L.fill(111, 5, 6, 1, '#').put(114, 4, 'k').put(116, 4, 'e')
  L.fill(120, 11, 14, 1, '^')
  L.put(123, 5, 'o').put(129, 5, 'o').row(126, 8, '*').row(132, 8, '*')
  L.put(140, 11, 'f')
  L.row(145, 9, '* *')
  L.put(150, 11, 'X')
  return L
}

function sugarCaves(): Builder {
  const L = new Builder(160)
  L.fill(0, 0, 160, 2, '#')
  L.ground(0, 45).put(2, 11, '@')
  L.sign(5, 11, 'tipSpiky')
  L.put(11, 11, 'h')
  L.fill(16, 2, 10, 7, '#').put(22, 11, 'h').row(18, 10, '* * *')
  L.put(34, 11, 'g').put(38, 11, 'e')
  L.put(41, 11, 'J')
  L.fill(43, 5, 8, 1, '#').row(46, 4, '* *').put(45, 4, 'F')
  L.row(52, 6, 'PP').put(54, 4, 'S').row(55, 5, 'BB').put(57, 3, 'S').row(58, 6, 'PP')
  L.ground(61, 100)
  L.put(66, 11, 'h').put(70, 8, 'b').put(74, 11, 'h')
  L.fill(78, 2, 8, 6, '#').put(85, 11, 'g').row(80, 10, '* *')
  L.put(88, 11, 'F')
  L.put(104, 8, 'r').put(108, 8, 'r').put(112, 8, 'r').put(116, 8, 'r').put(120, 8, 'r')
  L.row(106, 6, '*').row(110, 6, '*').row(114, 6, '*').row(118, 6, '*')
  L.ground(123, 159)
  L.fill(129, 5, 1, 7, '#').fill(130, 5, 5, 1, '#').row(130, 4, '*****')
  L.put(140, 11, 'f').put(145, 11, 'h')
  L.put(152, 11, 'G')
  return L
}

function sunsetRoofs(): Builder {
  const L = new Builder(170)
  L.ground(0, 30).put(2, 11, '@')
  L.put(12, 8, 'b').put(15, 11, 'h')
  L.fill(18, 4, 1, 6, '#')
  L.fill(21, 2, 10, 10, '#').row(19, 2, '**')
  L.put(24, 1, 'F').row(27, 1, '* *')
  L.fill(36, 5, 2, 1, '#').row(36, 4, '**')
  L.put(40, 3, 'b')
  L.fill(44, 6, 3, 1, '#')
  L.ground(47, 72)
  L.put(50, 9, 'S')
  L.fill(54, 2, 1, 10, 'P')
  L.row(56, 10, 'BB').put(58, 8, 'B').put(59, 6, 'B')
  L.fill(60, 4, 2, 8, '#').put(61, 3, 'g')
  L.put(64, 11, 'F').put(68, 11, 'h')
  L.put(76, 10, 'm').put(84, 5, 'o').put(90, 7, 'r').put(95, 5, 'o')
  L.row(80, 8, '*').row(87, 6, '*').row(93, 8, '*')
  L.ground(101, 169)
  L.put(103, 11, 'F')
  L.fill(105, 7, 8, 1, '#').fill(105, 8, 1, 4, 'C').fill(112, 8, 1, 4, '#')
  L.put(109, 11, 'k').put(108, 11, 'h')
  L.put(116, 11, 'f').put(120, 11, 'g').put(124, 11, 'e')
  L.put(127, 11, 'J')
  L.row(130, 6, '----').row(135, 4, '-----').row(136, 3, '* *')
  L.fill(141, 3, 29, 9, '#')
  L.put(150, 1, 'b').row(146, 2, '* * *')
  L.put(162, 2, 'X')
  return L
}

function make(b: Builder, meta: Omit<LevelDef, 'W' | 'H' | 'grid' | 'signs'>): LevelDef {
  return { ...meta, W: b.W, H: b.H, grid: b.grid, signs: b.signs }
}

export function buildLevels(): LevelDef[] {
  return [
    make(candyMeadow(), {
      name: 'l1', subtitle: 'l1s', cat: null, cave: false,
      palette: {
        skyTop: '#8fd6ff', skyBottom: '#fff3d9', hillFar: '#c6ecb3', hillNear: '#a3de8d',
        grass: '#6fd35a', grassLight: '#a8ef7f', soil: '#c98b5e', soilDot: '#dba27a', soilEdge: '#a96f48', sun: '#fff6b8',
      },
    }),
    make(cloudGarden(), {
      name: 'l2', subtitle: 'l2s', cat: 'billion', cave: false,
      palette: {
        skyTop: '#b9a8ff', skyBottom: '#ffe4f2', hillFar: '#e5d8ff', hillNear: '#d2c2fb',
        grass: '#68d9bd', grassLight: '#a6f0dc', soil: '#9c84d4', soilDot: '#b39ee3', soilEdge: '#7f68b9', sun: '#fff0fa',
      },
    }),
    make(sugarCaves(), {
      name: 'l3', subtitle: 'l3s', cat: null, cave: true,
      palette: {
        skyTop: '#4b3a78', skyBottom: '#8a5fa8', hillFar: '#5e4a8f', hillNear: '#6f559c',
        grass: '#ff9ccf', grassLight: '#ffd0e8', soil: '#7b62b5', soilDot: '#937bc9', soilEdge: '#5f4994', sun: '#ffd6f0',
      },
    }),
    make(sunsetRoofs(), {
      name: 'l4', subtitle: 'l4s', cat: 'million', cave: false,
      palette: {
        skyTop: '#ff9e9e', skyBottom: '#ffdcae', hillFar: '#f7bc98', hillNear: '#ee9f87',
        grass: '#ffc94d', grassLight: '#ffe38f', soil: '#8b6cc0', soilDot: '#a287d2', soilEdge: '#6d52a1', sun: '#fff1c4',
      },
    }),
  ]
}
