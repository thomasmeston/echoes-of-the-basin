import { notebookTextureUrl } from '../utils/publicUrl';
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
  private sheetEl!: HTMLElement;
  private open = false;
  private drag: {
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null = null;
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
      <div class="ops-overlay-sheet" style="--ops-paper-texture:url('${notebookTextureUrl()}')">
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
    this.sheetEl = this.el.querySelector('.ops-overlay-sheet') as HTMLElement;

    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[data-close]')) {
        this.hide();
      }
    });
    this.bindDrag();

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
    this.sheetEl.classList.remove('ops-overlay-sheet--open');
    void this.sheetEl.offsetWidth;
    this.sheetEl.classList.add('ops-overlay-sheet--open');
    this.pinSheet();
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
    this.drag = null;
    this.sheetEl.classList.remove('ops-overlay-sheet--dragging');
    this.el.classList.add('hidden');
    this.sheetEl.classList.remove('ops-overlay-sheet--open');
    this.sheetEl.style.position = '';
    this.sheetEl.style.left = '';
    this.sheetEl.style.top = '';
    this.sheetEl.style.margin = '';
    this.sheetEl.style.transform = '';
    window.removeEventListener('keydown', this.onKeyDown, true);
  }

  private pinSheet(): void {
    const w = this.sheetEl.offsetWidth;
    const h = this.sheetEl.offsetHeight;
    const left = Math.max(12, (window.innerWidth - w) / 2);
    const top = Math.max(12, (window.innerHeight - h) / 2);
    this.sheetEl.style.position = 'fixed';
    this.sheetEl.style.left = `${left}px`;
    this.sheetEl.style.top = `${top}px`;
    this.sheetEl.style.margin = '0';
    this.sheetEl.style.transform = 'none';
  }

  private bindDrag(): void {
    const onPointerDown = (e: PointerEvent) => {
      if (!this.open || e.button !== 0) {
        return;
      }
      const t = e.target as HTMLElement;
      if (t.closest('[data-close]')) {
        return;
      }
      const rect = this.sheetEl.getBoundingClientRect();
      this.drag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: rect.left,
        originTop: rect.top,
      };
      this.sheetEl.classList.add('ops-overlay-sheet--dragging');
      this.sheetEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.pointerId) {
        return;
      }
      this.sheetEl.style.left = `${this.drag.originLeft + (e.clientX - this.drag.startX)}px`;
      this.sheetEl.style.top = `${this.drag.originTop + (e.clientY - this.drag.startY)}px`;
      this.sheetEl.style.transform = 'none';
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.pointerId) {
        return;
      }
      this.drag = null;
      this.sheetEl.classList.remove('ops-overlay-sheet--dragging');
      try {
        this.sheetEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };

    this.sheetEl.addEventListener('pointerdown', onPointerDown);
    this.sheetEl.addEventListener('pointermove', onPointerMove);
    this.sheetEl.addEventListener('pointerup', onPointerUp);
    this.sheetEl.addEventListener('pointercancel', onPointerUp);
  }
}
