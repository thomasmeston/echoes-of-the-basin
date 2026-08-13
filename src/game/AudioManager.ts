import { publicUrl } from '../utils/publicUrl';

const SFX_VOLUME_KEY = 'echoes_sfx_volume';
const AMBIENCE_VOLUME_KEY = 'echoes_ambience_volume';
/** Master mute (SFX + ambience). Legacy key name kept for existing saves. */
const AUDIO_MUTED_KEY = 'echoes_sfx_muted';

/** Soft bed under every tuned frequency while the radio is powered. */
const RADIO_STATIC_GAIN = 0.16;

/**
 * SFX one-shots + looping jungle ambience (no music bed).
 */
export class AudioManager {
  private sounds = new Map<string, HTMLAudioElement>();
  private jungle: HTMLAudioElement | null = null;
  /** Persistent low static while the radio is on. */
  private radioStatic: HTMLAudioElement | null = null;
  private radioStaticWanted = false;
  /** Bumps when static should stop so late play() promises cannot restart it. */
  private radioStaticGen = 0;
  /** One-shot ambient static clones (same asset as the bed). */
  private staticShots: HTMLAudioElement[] = [];
  /** Reused for intro keystrokes (avoids spawning hundreds of Audio nodes). */
  private typewriterVoice: HTMLAudioElement | null = null;
  private typewriterLastPlay = 0;
  private sfxVolume = 0.75;
  private ambienceVolume = 0.35;
  private muted = false;
  private unlocked = false;
  private ambienceStarted = false;

  constructor() {
    this.sfxVolume = this.readVolume(SFX_VOLUME_KEY, 0.75);
    this.ambienceVolume = this.readVolume(AMBIENCE_VOLUME_KEY, 0.35);
    this.muted = localStorage.getItem(AUDIO_MUTED_KEY) === '1';
  }

  init(): void {
    this.load('static', 'static.wav');
    this.load('staticBlip', 'static_blip.wav');
    this.load('radioBeep', 'radio_beep.wav');
    this.load('paperUnfold', 'paper_unfold.wav');
    this.load('notepadPull', 'notepad_pull.wav');
    /** Book open — same Mixkit paging sample as notepad pull. */
    this.load('bookOpen', 'notepad_pull.wav');
    this.load('handwriting', 'handwriting.wav');
    this.load('typewriter', 'typewriter.wav');

    this.jungle = new Audio(publicUrl('audio/459925__rtb45__costa-rica-rainforest.wav'));
    this.jungle.preload = 'auto';
    this.jungle.loop = true;

    this.radioStatic = new Audio(publicUrl('audio/static.wav'));
    this.radioStatic.preload = 'auto';
    this.radioStatic.loop = true;
  }

  /** Call from a user gesture so browsers allow subsequent playback. */
  async unlock(): Promise<void> {
    if (this.unlocked) {
      return;
    }
    this.unlocked = true;
    const probe = this.sounds.get('radioBeep');
    if (probe) {
      const prev = probe.volume;
      probe.volume = 0;
      try {
        await probe.play();
        probe.pause();
        probe.currentTime = 0;
      } catch {
        /* later gesture plays may still work */
      }
      probe.volume = prev;
    }
    this.startAmbience();
    this.applyRadioStatic();
  }

  load(name: string, file: string): void {
    const audio = new Audio(publicUrl(`audio/${file}`));
    audio.preload = 'auto';
    this.sounds.set(name, audio);
  }

  play(name: string, volume = 1, loop = false): void {
    if (this.muted || this.sfxVolume <= 0) {
      return;
    }
    const base = this.sounds.get(name);
    if (!base) {
      return;
    }
    const audio = new Audio(base.currentSrc || base.src);
    audio.volume = Math.min(1, Math.max(0, volume * this.sfxVolume));
    audio.loop = loop;
    if (name === 'static') {
      this.staticShots.push(audio);
      audio.addEventListener(
        'ended',
        () => {
          this.staticShots = this.staticShots.filter((a) => a !== audio);
        },
        { once: true }
      );
    }
    void audio.play().catch(() => undefined);
  }

  /**
   * Mechanical typewriter key hit for the intro.
   * Throttled so the sample can ring instead of sounding sped-up.
   */
  playTypewriter(volume = 0.85): void {
    if (this.muted || this.sfxVolume <= 0) {
      return;
    }
    const now = performance.now();
    if (now - this.typewriterLastPlay < 90) {
      return;
    }
    this.typewriterLastPlay = now;

    const base = this.sounds.get('typewriter');
    if (!base) {
      return;
    }
    if (!this.typewriterVoice) {
      this.typewriterVoice = new Audio(base.currentSrc || base.src);
      this.typewriterVoice.preload = 'auto';
    }
    const voice = this.typewriterVoice;
    voice.volume = Math.min(1, Math.max(0, volume * this.sfxVolume));
    try {
      voice.currentTime = 0;
    } catch {
      /* ignore seek races while loading */
    }
    void voice.play().catch(() => undefined);
  }

  startAmbience(): void {
    if (!this.jungle) {
      return;
    }
    this.ambienceStarted = true;
    this.applyAmbienceVolume();
  }

  private applyAmbienceVolume(): void {
    if (!this.jungle) {
      return;
    }
    const vol = this.muted ? 0 : Math.min(1, Math.max(0, this.ambienceVolume));
    this.jungle.volume = vol;
    if (vol <= 0) {
      this.jungle.pause();
    } else if (this.ambienceStarted && this.jungle.paused) {
      void this.jungle.play().catch(() => undefined);
    }
  }

  getVolume(): number {
    return this.sfxVolume;
  }

  setVolume(value: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, value));
    localStorage.setItem(SFX_VOLUME_KEY, String(this.sfxVolume));
    this.applyRadioStatic();
  }

  /** Soft looping static while the desk radio is powered on. */
  setRadioStatic(on: boolean): void {
    this.radioStaticWanted = on;
    if (!on) {
      this.stopStaticShots();
    }
    this.applyRadioStatic();
  }

  private stopStaticShots(): void {
    for (const audio of this.staticShots) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    this.staticShots = [];
  }

  private applyRadioStatic(): void {
    if (!this.radioStatic) {
      return;
    }
    const vol =
      this.muted || !this.radioStaticWanted || this.sfxVolume <= 0
        ? 0
        : Math.min(1, Math.max(0, RADIO_STATIC_GAIN * this.sfxVolume));
    this.radioStatic.volume = vol;
    if (vol <= 0) {
      this.radioStaticGen += 1;
      this.radioStatic.pause();
      try {
        this.radioStatic.currentTime = 0;
      } catch {
        /* ignore */
      }
      return;
    }
    if (this.unlocked && this.radioStatic.paused) {
      const gen = ++this.radioStaticGen;
      void this.radioStatic.play().then(() => {
        if (gen !== this.radioStaticGen || !this.radioStaticWanted) {
          this.radioStatic?.pause();
        }
      }).catch(() => undefined);
    }
  }

  getAmbienceVolume(): number {
    return this.ambienceVolume;
  }

  setAmbienceVolume(value: number): void {
    this.ambienceVolume = Math.min(1, Math.max(0, value));
    localStorage.setItem(AMBIENCE_VOLUME_KEY, String(this.ambienceVolume));
    this.applyAmbienceVolume();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(AUDIO_MUTED_KEY, muted ? '1' : '0');
    if (muted) {
      this.stopStaticShots();
    }
    this.applyAmbienceVolume();
    this.applyRadioStatic();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private readVolume(key: string, fallback: number): number {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback;
  }
}
