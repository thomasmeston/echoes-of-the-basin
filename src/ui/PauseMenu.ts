import type { AudioManager } from '../game/AudioManager';

export interface PauseMenuOptions {
  audio: AudioManager;
  onResume: () => void;
  onNewGame: () => void;
  onSave: () => void;
  onToggleDev?: () => void;
}

export class PauseMenu {
  private el: HTMLDivElement;
  private ambienceSlider!: HTMLInputElement;
  private ambienceLabel!: HTMLSpanElement;
  private sfxSlider!: HTMLInputElement;
  private sfxLabel!: HTMLSpanElement;
  private muteBtn!: HTMLButtonElement;
  private open = false;

  constructor(private readonly options: PauseMenuOptions) {
    this.el = document.createElement('div');
    this.el.className = 'pause-menu';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="pause-menu__card">
        <div class="pause-menu__header">
          <h3 class="pause-menu__title">Paused</h3>
          <button type="button" class="pause-menu__close" aria-label="Resume">×</button>
        </div>
        <div class="pause-menu__section">
          <button type="button" class="pause-menu__mute" id="pause-mute" aria-pressed="false">
            Mute audio
          </button>
        </div>
        <div class="pause-menu__section">
          <label class="pause-menu__label" for="pause-ambience-volume">Jungle ambience</label>
          <div class="pause-menu__volume-row">
            <input type="range" id="pause-ambience-volume" class="pause-menu__slider"
              min="0" max="100" step="1" value="35" />
            <span class="pause-menu__volume-value" id="pause-ambience-value">35%</span>
          </div>
        </div>
        <div class="pause-menu__section">
          <label class="pause-menu__label" for="pause-sfx-volume">SFX volume</label>
          <div class="pause-menu__volume-row">
            <input type="range" id="pause-sfx-volume" class="pause-menu__slider"
              min="0" max="100" step="1" value="75" />
            <span class="pause-menu__volume-value" id="pause-sfx-value">75%</span>
          </div>
        </div>
        <div class="pause-menu__actions">
          <button type="button" class="pause-menu__btn pause-menu__resume">Resume</button>
          <button type="button" class="pause-menu__btn pause-menu__save">Save now</button>
          <button type="button" class="pause-menu__btn pause-menu__dev">Toggle Dev Mode</button>
          <button type="button" class="pause-menu__btn pause-menu__new">Title menu</button>
        </div>
        <p class="pause-menu__hint">Esc resume · \` dev mode · Progress autosaves</p>
      </div>
    `;
    document.body.appendChild(this.el);

    this.ambienceSlider = this.el.querySelector('#pause-ambience-volume')!;
    this.ambienceLabel = this.el.querySelector('#pause-ambience-value')!;
    this.sfxSlider = this.el.querySelector('#pause-sfx-volume')!;
    this.sfxLabel = this.el.querySelector('#pause-sfx-value')!;
    this.muteBtn = this.el.querySelector('#pause-mute')!;

    this.el.querySelector('.pause-menu__close')!.addEventListener('click', () => this.hide());
    this.el.querySelector('.pause-menu__resume')!.addEventListener('click', () => this.hide());
    this.el.querySelector('.pause-menu__save')!.addEventListener('click', () => {
      this.options.onSave();
      this.flashHint('Saved.');
    });
    this.el.querySelector('.pause-menu__dev')!.addEventListener('click', () => {
      this.hide();
      this.options.onToggleDev?.();
    });
    this.el.querySelector('.pause-menu__new')!.addEventListener('click', () => {
      if (window.confirm('Return to the title menu? Progress in this slot will be saved.')) {
        this.hide();
        this.options.onNewGame();
      }
    });
    this.muteBtn.addEventListener('click', () => {
      this.options.audio.toggleMuted();
      this.syncMuteButton();
      this.flashHint(this.options.audio.isMuted() ? 'Audio muted.' : 'Audio on.');
    });
    this.ambienceSlider.addEventListener('input', () => {
      const pct = Number(this.ambienceSlider.value);
      this.options.audio.setAmbienceVolume(pct / 100);
      this.ambienceLabel.textContent = `${pct}%`;
    });
    this.sfxSlider.addEventListener('input', () => {
      const pct = Number(this.sfxSlider.value);
      this.options.audio.setVolume(pct / 100);
      this.sfxLabel.textContent = `${pct}%`;
      if (pct > 0) {
        this.options.audio.play('paperUnfold', 0.7);
      }
    });
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) {
        this.hide();
      }
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(): void {
    void this.options.audio.unlock();
    this.syncControls();
    this.open = true;
    this.el.hidden = false;
    this.el.classList.add('pause-menu--open');
  }

  hide(): void {
    this.open = false;
    this.el.hidden = true;
    this.el.classList.remove('pause-menu--open');
    this.options.onResume();
  }

  toggle(): void {
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  }

  private syncControls(): void {
    const ambiencePct = Math.round(this.options.audio.getAmbienceVolume() * 100);
    const sfxPct = Math.round(this.options.audio.getVolume() * 100);
    this.ambienceSlider.value = String(ambiencePct);
    this.sfxSlider.value = String(sfxPct);
    this.ambienceLabel.textContent = `${ambiencePct}%`;
    this.sfxLabel.textContent = `${sfxPct}%`;
    this.syncMuteButton();
  }

  private syncMuteButton(): void {
    const muted = this.options.audio.isMuted();
    this.muteBtn.textContent = muted ? 'Unmute audio' : 'Mute audio';
    this.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    this.muteBtn.classList.toggle('pause-menu__mute--active', muted);
  }

  private flashHint(text: string): void {
    const hint = this.el.querySelector('.pause-menu__hint')!;
    const previous = hint.textContent;
    hint.textContent = text;
    window.setTimeout(() => {
      hint.textContent = previous;
    }, 1500);
  }
}
