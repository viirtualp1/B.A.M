export type Sfx =
  | 'jump' | 'fish' | 'stomp' | 'dash' | 'hurt' | 'switch' | 'bounce'
  | 'yarn' | 'miss' | 'key' | 'crack' | 'bell' | 'rescue' | 'clear' | 'locked' | 'land'

// Each level gets its own little tune: semitone offsets from the root, null = rest.
const SONGS: { root: number; tempo: number; melody: (number | null)[]; bass: number[] }[] = [
  {
    root: 523.25, tempo: 0.17,
    melody: [0, 4, 7, 4, 9, 7, 4, null, 2, 4, 5, 4, 2, null, 0, null, 0, 4, 7, 12, 11, 7, 9, null, 7, 5, 4, 2, 0, null, null, null],
    bass: [0, 0, 5, 5, 7, 7, 0, 0],
  },
  {
    root: 587.33, tempo: 0.19,
    melody: [7, null, 4, 7, 9, null, 7, 4, 5, null, 2, 5, 7, null, null, null, 4, null, 0, 4, 5, 4, 2, 0, 2, null, 7, null, 0, null, null, null],
    bass: [0, 0, -3, -3, -7, -7, -5, -5],
  },
  {
    root: 493.88, tempo: 0.16,
    melody: [0, 2, 4, 7, 4, 2, 0, null, 0, 2, 4, 9, 7, null, null, null, 5, 7, 9, 12, 9, 7, 5, 4, 2, 4, 5, 7, 0, null, null, null],
    bass: [0, 0, 5, 5, -3, -3, 7, 7],
  },
]

class Audio {
  private ac: AudioContext | null = null
  private master: GainNode | null = null
  muted = false
  private song = 0
  private step = 0
  private next = 0
  musicOn = false

  unlock(): void {
    if (this.ac) {
      if (this.ac.state === 'suspended') void this.ac.resume()
      return
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ac = new Ctor()
      this.master = this.ac.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ac.destination)
    } catch {
      this.ac = null
    }
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (this.master) this.master.gain.value = m ? 0 : 0.9
  }

  private tone(f1: number, f2: number, dur: number, type: OscillatorType = 'triangle', vol = 0.1, delay = 0): void {
    if (!this.ac || !this.master) return
    const t = this.ac.currentTime + delay
    const o = this.ac.createOscillator()
    const g = this.ac.createGain()
    o.type = type
    o.frequency.setValueAtTime(f1, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.03)
  }

  private noise(dur: number, vol = 0.08, freq = 1200): void {
    if (!this.ac || !this.master) return
    const len = Math.floor(this.ac.sampleRate * dur)
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = this.ac.createBufferSource()
    src.buffer = buf
    const f = this.ac.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    const g = this.ac.createGain()
    g.gain.value = vol
    src.connect(f).connect(g).connect(this.master)
    src.start()
  }

  play(s: Sfx): void {
    if (!this.ac) return
    switch (s) {
      case 'jump': this.tone(420, 760, 0.13, 'triangle', 0.12); break
      case 'land': this.noise(0.06, 0.05, 500); break
      case 'fish': this.tone(988, 988, 0.06, 'square', 0.05); this.tone(1319, 1319, 0.14, 'square', 0.05, 0.06); break
      case 'stomp': this.tone(320, 110, 0.14, 'square', 0.08); this.noise(0.08, 0.06, 800); break
      case 'dash': this.noise(0.16, 0.12, 2200); this.tone(300, 900, 0.1, 'sawtooth', 0.03); break
      case 'hurt': this.tone(500, 140, 0.3, 'sawtooth', 0.07); break
      case 'switch': this.tone(660, 1320, 0.09, 'sine', 0.12); this.tone(990, 1980, 0.12, 'sine', 0.08, 0.07); break
      case 'bounce': this.tone(180, 820, 0.22, 'sine', 0.16); break
      case 'yarn': this.tone(600, 1100, 0.07, 'triangle', 0.1); this.noise(0.05, 0.04, 3000); break
      case 'miss': this.tone(300, 220, 0.08, 'triangle', 0.06); break
      case 'crack': this.noise(0.2, 0.18, 700); this.tone(200, 80, 0.15, 'square', 0.05); break
      case 'locked': this.tone(220, 200, 0.1, 'square', 0.05); this.tone(180, 160, 0.12, 'square', 0.05, 0.1); break
      case 'key': [0, 4, 7, 12].forEach((n, i) => this.tone(880 * 2 ** (n / 12), 880 * 2 ** (n / 12), 0.12, 'triangle', 0.09, i * 0.06)); break
      case 'bell': this.tone(1568, 1568, 0.5, 'sine', 0.1); this.tone(2093, 2093, 0.4, 'sine', 0.05, 0.05); break
      case 'clear': [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => this.tone(523 * 2 ** (n / 12), 523 * 2 ** (n / 12), 0.18, 'triangle', 0.1, i * 0.1)); break
      case 'rescue':
        [0, 4, 7, 11, 12, 16, 19, 24].forEach((n, i) => this.tone(523 * 2 ** (n / 12), 523 * 2 ** (n / 12), 0.2, 'triangle', 0.09, i * 0.09))
        this.tone(700, 1400, 0.25, 'sine', 0.05, 0.85); this.tone(1400, 900, 0.3, 'sine', 0.05, 1.05)
        break
    }
  }

  startSong(i: number): void {
    this.song = i % SONGS.length
    this.step = 0
    this.musicOn = true
    if (this.ac) this.next = this.ac.currentTime + 0.1
  }

  stopSong(): void {
    this.musicOn = false
  }

  tick(): void {
    if (!this.ac || !this.musicOn || this.muted) return
    const song = SONGS[this.song]
    if (this.next < this.ac.currentTime) this.next = this.ac.currentTime + 0.05
    while (this.next < this.ac.currentTime + 0.25) {
      const n = song.melody[this.step % song.melody.length]
      const delay = this.next - this.ac.currentTime
      if (n !== null) this.tone(song.root * 2 ** (n / 12), song.root * 2 ** (n / 12), song.tempo * 1.4, 'triangle', 0.035, delay)
      if (this.step % 4 === 0) {
        const b = song.bass[(this.step / 4) % song.bass.length]
        const f = (song.root / 4) * 2 ** (b / 12)
        this.tone(f, f, song.tempo * 3, 'sine', 0.07, delay)
      }
      this.step++
      this.next += song.tempo
    }
  }
}

export const audio = new Audio()
