import type { CatName } from './store'
import type { TextKey } from './i18n'

export type HintId = 'jump' | 'hover' | 'dash' | 'wall' | 'yarn' | 'crystal' | 'timed' | 'gem' | 'crate' | 'spiky'

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
  hint: HintId
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
 *  T  clock crystal (swap reverts after a few seconds)
 *  K  toy crate (push it)  _  button  |  gate (open while its nearest button is pressed)
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

  sign(x: number, y: number, hint: HintId): this {
    this.signs.push({ x, y, hint })
    return this
  }

  /** Hidden room carved into solid ground: cracked blocks at the entry, a kitten at the far end. */
  secret(entryX: number, y: number, dir: 1 | -1, depth = 3, vertical = false): this {
    if (vertical) {
      // entry from below: cracked ceiling at (entryX, y), room above it
      this.put(entryX, y, 'C')
      this.fill(entryX - 1, y - 2, 3, 2, ' ')
      this.put(entryX - 1 + (dir > 0 ? 2 : 0), y - 1, 'n')
      return this
    }
    this.put(entryX, y, 'C').put(entryX, y - 1, 'C')
    for (let i = 1; i <= depth; i++) this.put(entryX + dir * i, y, ' ').put(entryX + dir * i, y - 1, ' ')
    return this.put(entryX + dir * depth, y, 'n')
  }
}

function candyMeadow(): Builder {
  const L = new Builder(140)
  L.ground(0, 20).put(3, 11, '@')
  L.sign(6, 11, 'jump')
  L.row(9, 9, '* * *')
  L.fill(13, 10, 2, 2, '#').row(13, 8, '**')
  L.put(18, 11, 'e')
  L.row(21, 8, '**')
  L.ground(25, 44)
  L.put(26, 11, 'F').put(28, 11, 'f')
  L.put(32, 11, 'J')
  L.fill(35, 6, 2, 6, '#').row(35, 5, '**')
  L.row(37, 3, '---').put(38, 2, 'n')
  L.put(40, 11, 'e')
  L.sign(42, 11, 'dash')
  L.ground(45, 90)
  L.fill(47, 1, 1, 8, '#').fill(47, 9, 1, 3, 'C')
  L.put(50, 11, 'F').put(52, 8, 'b')
  L.fill(54, 11, 4, 1, '^').row(54, 8, '* *')
  L.put(60, 11, 'e').put(62, 11, 'e')
  L.sign(63, 11, 'wall')
  L.fill(65, 2, 1, 7, '#')
  L.fill(68, 3, 12, 9, '#').secret(68, 11, 1, 3)
  L.row(66, 2, '**')
  L.row(71, 2, '* * *').put(74, 2, 'b')
  L.put(85, 11, 'f')
  L.put(88, 11, 'F').sign(90, 11, 'hover')
  L.row(93, 10, 'cc').row(98, 9, 'cc').row(103, 10, 'cc')
  L.put(96, 6, 'b').row(98, 7, '**')
  L.ground(107, 139)
  L.put(108, 11, 'F')
  L.put(112, 11, 'g')
  L.row(115, 9, '---').row(119, 7, '---').row(119, 6, '***')
  L.row(116, 3, '--').put(116, 2, 'n')
  L.put(122, 11, 'e').put(126, 11, 'e')
  L.fill(130, 0, 1, 6, '#').fill(130, 6, 1, 6, 'C')
  L.put(135, 11, 'G')
  return L
}

function cloudGarden(): Builder {
  const L = new Builder(200)
  L.ground(0, 60).put(2, 11, '@')
  L.sign(5, 11, 'yarn')
  // practice swings over solid ground
  L.put(13, 6, 'o').put(19, 6, 'o').put(25, 6, 'o')
  L.row(13, 9, '*').row(16, 8, '*').row(19, 9, '*').row(22, 8, '*').row(25, 9, '*')
  L.row(20, 2, '---').put(21, 1, 'n')
  L.put(30, 11, 'F').put(40, 11, 'e').put(50, 11, 'e')
  // the real thing: a pit
  L.put(64, 5, 'o').put(70, 5, 'o').put(76, 5, 'o').row(67, 8, '*').row(73, 8, '*')
  L.ground(79, 95).put(81, 11, 'F').put(88, 11, 'e')
  // bees guard the swings
  L.put(99, 5, 'o').put(105, 4, 'o').put(111, 5, 'o').put(117, 5, 'o')
  L.put(102, 8, 'b').put(114, 8, 'b').row(108, 8, '* *')
  L.ground(121, 140).put(123, 11, 'F').put(132, 11, 'f')
  // melting clouds between swings, a hidden island below
  L.row(144, 9, 'cc').put(149, 4, 'o').row(153, 8, 'cc').put(158, 4, 'o')
  L.fill(150, 12, 2, 1, '#').put(150, 11, 'n')
  L.row(145, 7, '*').row(154, 6, '*')
  L.ground(166, 199).put(168, 11, 'F')
  // finale: swing up the tower
  L.put(172, 8, 'o').put(176, 5, 'o').put(179, 2, 'o')
  L.fill(182, 3, 14, 9, '#').secret(182, 11, 1, 3)
  L.row(185, 2, '* * *')
  L.put(192, 2, 'G')
  return L
}

function toyWorkshop(): Builder {
  const L = new Builder(140)
  L.ground(0, 140).put(2, 11, '@')
  L.sign(5, 11, 'crate')
  // 1 — crate onto the button
  L.put(9, 11, 'K').put(14, 11, '_')
  L.fill(18, 0, 1, 2, '#').fill(18, 2, 1, 10, '|')
  L.row(10, 8, '* *')
  // 2 — push the crate off a ledge, onto the button below
  L.fill(23, 10, 6, 2, '#').put(25, 9, 'K')
  L.row(24, 5, '--').put(24, 4, 'n')
  L.put(29, 11, '_')
  L.fill(35, 0, 1, 2, '#').fill(35, 2, 1, 10, '|')
  L.put(37, 11, 'F').put(41, 11, 'e')
  // 3 — a taste of the clock crystal
  L.sign(44, 11, 'timed')
  L.put(48, 9, 'T')
  L.fill(52, 0, 1, 12, 'P')
  L.fill(53, 12, 10, 2, ' ').row(53, 12, 'BBBBBBBBBB')
  L.put(57, 8, 'b').row(55, 10, '* * *')
  L.put(66, 11, 'F')
  // 4 — the crystal is too high: bring the crate under it (it starts on the wrong side)
  L.put(72, 4, 'S').put(76, 11, 'K')
  L.fill(79, 0, 1, 12, 'P')
  L.row(80, 10, 'BB').row(83, 8, 'BB').row(86, 6, 'BB')
  L.fill(88, 6, 6, 6, '#').secret(88, 11, 1, 3).row(89, 5, '* *')
  L.put(92, 5, 'e')
  // 5 — key on a high cloud: crate as a step
  L.put(96, 11, 'F').put(99, 11, 'K')
  L.row(106, 6, '----').put(107, 4, 'k')

  // 6 — second crate: a kitten on the way, then the last gate
  L.put(114, 11, 'K').row(116, 6, '--').put(116, 5, 'n').put(119, 11, '_')
  L.fill(124, 0, 1, 2, '#').fill(124, 2, 1, 10, '|')
  L.row(127, 9, '* *')
  L.put(132, 11, 'X')
  return L
}

function sugarCaves(): Builder {
  const L = new Builder(160)
  L.fill(0, 0, 160, 2, '#')
  L.ground(0, 45).put(2, 11, '@')
  L.sign(5, 11, 'spiky')
  L.put(11, 11, 'h')
  L.fill(16, 2, 10, 7, '#').put(22, 11, 'h').row(18, 10, '* * *')
  L.secret(20, 8, 1, 0, true)
  L.put(28, 11, 'F')
  L.put(34, 11, 'g').put(38, 11, 'e')
  L.put(41, 11, 'J')
  L.fill(43, 5, 8, 1, '#').row(47, 4, '* *').put(45, 4, 'F')
  L.sign(48, 4, 'gem')
  L.put(53, 5, 'r').put(57, 4, 'r').row(55, 3, '*')
  L.ground(61, 100)
  L.put(66, 11, 'h').put(70, 8, 'b').put(74, 11, 'h')
  L.fill(78, 2, 8, 6, '#').put(85, 11, 'g').row(80, 10, '* *')
  L.secret(81, 7, -1, 0, true)
  L.put(88, 11, 'F')
  L.put(104, 8, 'r').put(108, 8, 'r').put(112, 8, 'r').put(116, 8, 'r').put(120, 8, 'r')
  L.put(108, 5, 'r').row(107, 4, '---').put(108, 3, 'n')
  L.row(106, 6, '*').row(110, 6, '*').row(114, 6, '*').row(118, 6, '*')
  L.ground(123, 159)
  L.put(124, 11, 'F')
  L.fill(131, 2, 1, 10, 'C')
  L.fill(133, 12, 7, 2, ' ').put(136, 9, 'r').row(135, 7, '* *')
  L.put(143, 11, 'f').put(147, 11, 'h')
  L.put(152, 11, 'G')
  return L
}

function clockTower(): Builder {
  const L = new Builder(165)
  L.ground(0, 11).put(2, 11, '@')
  L.sign(4, 11, 'timed')
  // 1 — timed stepping stones (or swing on the hook)
  L.put(8, 9, 'T')
  L.fill(11, 0, 1, 12, 'P')
  L.row(13, 10, 'BB').row(17, 9, 'BB').row(21, 10, 'BB').put(18, 5, 'o')
  L.row(19, 6, 'BB').put(19, 5, 'n')
  L.row(14, 8, '*').row(22, 8, '*')
  L.ground(25, 43)
  L.put(27, 11, 'F').put(33, 11, 'e')
  // 2 — push the crate across a bridge that only exists while the clock runs
  L.put(40, 9, 'T').put(42, 11, 'K')
  L.fill(44, 12, 3, 2, ' ').row(44, 12, 'BBB')
  L.ground(47, 80)
  L.put(49, 11, '_')
  L.fill(52, 0, 1, 2, '#').fill(52, 2, 1, 10, '|')
  L.put(54, 11, 'F')
  // 3 — chimney climb past a bee, secrets on and in the tower
  L.fill(56, 4, 1, 6, '#').put(56, 3, 'n')
  L.fill(59, 2, 8, 10, '#').secret(66, 11, -1, 3).row(60, 1, '* * *')
  L.put(63, 0, 'b')
  L.put(70, 11, 'h').put(75, 11, 'g')
  L.put(78, 11, 'F')
  // 4 — swing through: pink blocks need the clock, blue ones need it to run out
  L.put(79, 9, 'T')
  L.put(84, 5, 'o').fill(87, 5, 1, 5, 'P').put(90, 5, 'o').fill(93, 5, 1, 5, 'B').put(96, 5, 'o')
  L.row(85, 9, '*').row(91, 9, '*').row(97, 9, '*')
  L.ground(101, 106)
  L.put(103, 11, 'F').sign(105, 11, 'crystal')
  // 5 — crystal rhythm: every jump through a crystal flips which blocks are solid
  L.row(107, 10, 'PP').put(109, 8, 'S').row(110, 9, 'BB').put(112, 7, 'S').row(113, 10, 'PP').put(115, 8, 'S').row(116, 9, 'BB').put(118, 7, 'S')
  L.ground(120, 164)
  L.put(122, 11, 'F')
  // 6 — crate under a clock crystal, then race the pink wall
  L.put(131, 4, 'T').put(136, 11, 'K')
  L.fill(140, 0, 1, 12, 'P')
  L.row(144, 9, '* * *').put(148, 11, 'f')
  L.put(156, 11, 'G')
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
  L.row(39, 1, '--').put(39, 0, 'n')
  L.put(40, 3, 'b')
  L.fill(44, 6, 3, 1, '#')
  L.ground(47, 72)
  L.put(48, 11, 'F')
  L.put(50, 9, 'S')
  L.fill(54, 2, 1, 10, 'P')
  L.row(56, 10, 'BB').put(58, 8, 'B').put(59, 6, 'B')
  L.fill(60, 4, 2, 8, '#').put(61, 3, 'g')
  L.put(64, 11, 'F').put(68, 11, 'h')
  L.put(76, 10, 'm').put(84, 5, 'o').put(90, 7, 'r').put(95, 5, 'o')
  L.fill(88, 12, 2, 1, '#').put(88, 11, 'n')
  L.row(80, 8, '*').row(87, 6, '*').row(93, 8, '*')
  L.ground(101, 169)
  L.put(103, 11, 'F')
  L.fill(105, 7, 8, 1, '#').fill(105, 8, 1, 4, 'C').fill(112, 8, 1, 4, '#')
  L.put(109, 11, 'k').put(108, 11, 'h')
  L.put(114, 11, 'F')
  L.put(116, 11, 'f').put(120, 11, 'g').put(124, 11, 'e')
  L.put(127, 11, 'J')
  L.row(130, 6, '----').row(135, 4, '-----').row(136, 3, '* *')
  L.fill(141, 3, 29, 9, '#').secret(141, 11, 1, 3)
  L.put(150, 1, 'b').row(146, 2, '* * *')
  L.put(162, 2, 'X')
  return L
}

function stormCrown(): Builder {
  const L = new Builder(46)
  L.ground(0, 45).fill(0, 0, 1, 12, '#').fill(45, 0, 1, 12, '#')
  L.put(3, 11, '@')
  L.row(5, 10, '---').row(20, 10, '------').row(38, 10, '---')
  L.put(22, 7, 'T')
  L.row(17, 8, 'BB').row(14, 6, 'BB').row(17, 4, 'BB')
  L.row(27, 8, 'BB').row(30, 6, 'BB').row(27, 4, 'BB')
  L.put(22, 1, 'Z')
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
      name: 'l2', subtitle: 'l2s', cat: null, cave: false,
      palette: {
        skyTop: '#b9a8ff', skyBottom: '#ffe4f2', hillFar: '#e5d8ff', hillNear: '#d2c2fb',
        grass: '#68d9bd', grassLight: '#a6f0dc', soil: '#9c84d4', soilDot: '#b39ee3', soilEdge: '#7f68b9', sun: '#fff0fa',
      },
    }),
    make(toyWorkshop(), {
      name: 'l3', subtitle: 'l3s', cat: 'billion', cave: false,
      palette: {
        skyTop: '#ffd2a8', skyBottom: '#fff4e3', hillFar: '#ffe3c7', hillNear: '#f9cfa8',
        grass: '#ff9fc4', grassLight: '#ffd0e3', soil: '#c79a6b', soilDot: '#d8b083', soilEdge: '#a77c52', sun: '#fffbe0',
      },
    }),
    make(sugarCaves(), {
      name: 'l4', subtitle: 'l4s', cat: null, cave: true,
      palette: {
        skyTop: '#4b3a78', skyBottom: '#8a5fa8', hillFar: '#5e4a8f', hillNear: '#6f559c',
        grass: '#ff9ccf', grassLight: '#ffd0e8', soil: '#7b62b5', soilDot: '#937bc9', soilEdge: '#5f4994', sun: '#ffd6f0',
      },
    }),
    make(clockTower(), {
      name: 'l5', subtitle: 'l5s', cat: null, cave: false,
      palette: {
        skyTop: '#7fc8d8', skyBottom: '#e8f7ef', hillFar: '#bfe5dc', hillNear: '#9fd6c9',
        grass: '#b9a3ff', grassLight: '#dccfff', soil: '#5f7fa8', soilDot: '#7895bb', soilEdge: '#48668c', sun: '#f4fff0',
      },
    }),
    make(sunsetRoofs(), {
      name: 'l6', subtitle: 'l6s', cat: 'million', cave: false,
      palette: {
        skyTop: '#ff9e9e', skyBottom: '#ffdcae', hillFar: '#f7bc98', hillNear: '#ee9f87',
        grass: '#ffc94d', grassLight: '#ffe38f', soil: '#8b6cc0', soilDot: '#a287d2', soilEdge: '#6d52a1', sun: '#fff1c4',
      },
    }),
    make(stormCrown(), {
      name: 'l7', subtitle: 'l7s', cat: null, cave: false,
      palette: {
        skyTop: '#5a4f8f', skyBottom: '#c9a7d9', hillFar: '#7a6aa8', hillNear: '#8d7bb8',
        grass: '#c7b8ff', grassLight: '#e6deff', soil: '#5b4b86', soilDot: '#6e5d9a', soilEdge: '#45386a', sun: '#ffe9a8',
      },
    }),
  ]
}
