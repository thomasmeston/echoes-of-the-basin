import introData from '../../data/intro.json';
import type { AudioManager } from '../game/AudioManager';

/**
 * Full-screen typewriter intro before the first night begins.
 */
export class IntroOverlay {
  private el: HTMLDivElement;
  private textEl!: HTMLParagraphElement;
  private skipBtn!: HTMLButtonElement;
  private running = false;
  private skipRequested = false;

  constructor(private readonly audio: AudioManager) {
    this.el = document.createElement('div');
    this.el.className = 'intro-overlay';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="intro-overlay__card">
        <p class="intro-overlay__text" aria-live="polite"></p>
        <button type="button" class="intro-overlay__skip">Skip</button>
      </div>
    `;
    this.textEl = this.el.querySelector('.intro-overlay__text')!;
    this.skipBtn = this.el.querySelector('.intro-overlay__skip')!;
    this.skipBtn.addEventListener('click', () => {
      this.skipRequested = true;
    });
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) {
        this.skipRequested = true;
      }
    });
    document.body.appendChild(this.el);
  }

  async play(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    this.skipRequested = false;
    this.textEl.textContent = '';
    this.el.hidden = false;
    this.el.classList.add('intro-overlay--open');
    await this.audio.unlock();
    // Prime the dedicated typewriter voice inside the same user-gesture chain.
    this.audio.playTypewriter(0.01);
    await this.wait(40);

    const paragraphs = introData.paragraphs as string[];
    for (let p = 0; p < paragraphs.length; p++) {
      if (p > 0) {
        this.textEl.textContent += '\n\n';
      }
      await this.typeLine(paragraphs[p]!);
      if (this.skipRequested) {
        break;
      }
      await this.wait(420);
    }

    if (this.skipRequested) {
      this.textEl.textContent = paragraphs.join('\n\n');
    }

    await this.wait(900);
    this.el.classList.remove('intro-overlay--open');
    this.el.hidden = true;
    this.running = false;
  }

  private async typeLine(line: string): Promise<void> {
    for (const ch of line) {
      if (this.skipRequested) {
        return;
      }
      this.textEl.textContent += ch;
      if (ch.trim()) {
        this.audio.playTypewriter(0.8 + Math.random() * 0.15);
      }
      // Pace matches a mechanical typewriter (and the ~0.7s key sample).
      const delay =
        ch === '.' || ch === '—'
          ? 260
          : ch === ',' || ch === ';'
            ? 140
            : ch === ' '
              ? 95
              : 75 + Math.random() * 50;
      await this.wait(delay);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
}
