import { publicUrl } from '../utils/publicUrl';
import type { AudioManager } from '../game/AudioManager';
import opsManual from '../../data/operating-instructions.json';

interface OpsSection {
  heading: string;
  steps: string[];
}

interface OpsManualFile {
  id: string;
  title: string;
  subtitle: string;
  sketch: string;
  preamble: string;
  sections: OpsSection[];
  footer: string;
}

/**
 * Full-screen weathered Operating Instructions sheet.
 * Opened from the separate ops-manual desk prop.
 */
export class OpsManualOverlay {
  private el: HTMLDivElement;
  private open = false;
  private onKeyDown: (e: KeyboardEvent) => void;
  private readonly ops = opsManual as OpsManualFile;

  constructor(private readonly audio: AudioManager) {
    this.el = document.createElement('div');
    this.el.id = 'ops-overlay';
    this.el.className = 'ops-overlay hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', this.ops.title);

    const sections = this.ops.sections
      .map(
        (section) => `
      <section class="ops-section">
        <h3 class="ops-section-heading">${section.heading}</h3>
        <ol class="ops-section-steps">
          ${section.steps.map((step) => `<li>${step}</li>`).join('')}
        </ol>
      </section>`
      )
      .join('');

    this.el.innerHTML = `
      <div class="ops-overlay-backdrop" data-close="1"></div>
      <div class="ops-overlay-sheet" style="--ops-paper-texture:url('${publicUrl('images/notebook_texture.png')}')">
        <button type="button" class="ops-overlay-close" data-close="1" aria-label="Close operating instructions">×</button>
        <header class="ops-card-header">
          <h2 class="ops-card-title">${this.ops.title}</h2>
          <p class="ops-card-subtitle">${this.ops.subtitle}</p>
        </header>
        <p class="ops-card-preamble">${this.ops.preamble}</p>
        ${sections}
        <p class="ops-card-footer">${this.ops.footer}</p>
      </div>
    `;
    document.body.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[data-close]')) {
        this.hide();
      }
    });

    this.onKeyDown = (e) => {
      if (this.open && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      }
    };
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(): void {
    if (this.open) {
      return;
    }
    this.open = true;
    this.el.classList.remove('hidden');
    const sheet = this.el.querySelector('.ops-overlay-sheet') as HTMLElement;
    sheet.classList.remove('ops-overlay-sheet--open');
    void sheet.offsetWidth;
    sheet.classList.add('ops-overlay-sheet--open');
    void this.audio.unlock().then(() => {
      this.audio.play('paperUnfold', 1);
    });
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  hide(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.el.classList.add('hidden');
    this.el.querySelector('.ops-overlay-sheet')?.classList.remove('ops-overlay-sheet--open');
    window.removeEventListener('keydown', this.onKeyDown, true);
  }
}
