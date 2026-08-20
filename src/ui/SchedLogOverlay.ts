import { NOTEBOOK_TEXTURE_URL } from '../utils/publicUrl';
import type { AudioManager } from '../game/AudioManager';
import schedLog from '../../data/sched-log.json';

interface SchedBlock {
  time: string;
  mhz: number;
  assignment: string;
  handNote?: string;
}

interface SchedLogFile {
  id: string;
  title: string;
  subtitle: string;
  sketch: string;
  preamble: string;
  timezoneNote: string;
  blocks: SchedBlock[];
  footer: string;
}

/** Weathered 24-hour listen schedule notebook opened from the sched-log desk prop. */
export class SchedLogOverlay {
  private el: HTMLDivElement;
  private bookEl!: HTMLElement;
  private open = false;
  private onKeyDown: (e: KeyboardEvent) => void;
  private readonly log = schedLog as SchedLogFile;
  private drag: {
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null = null;

  constructor(private readonly audio: AudioManager) {
    this.el = document.createElement('div');
    this.el.id = 'sched-overlay';
    this.el.className = 'sched-overlay hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', this.log.title);

    const paper = NOTEBOOK_TEXTURE_URL;
    const rows = this.renderRows(this.log.blocks, 0);

    this.el.innerHTML = `
      <div class="sched-overlay-book" tabindex="-1">
        <button type="button" class="sched-overlay-close" data-close="1" aria-label="Close Sched Log">×</button>
        <div class="sched-book-cover">
          <div class="sched-book-spine" aria-hidden="true"></div>
          <div class="sched-page" style="--sched-paper-texture:url('${paper}')">
            <header class="sched-book-header sched-book-drag">
              <h2 class="sched-book-title">${this.log.title}</h2>
              <p class="sched-book-subtitle">${this.log.subtitle}</p>
            </header>
            <p class="sched-book-preamble">${this.log.preamble}</p>
            <p class="sched-book-tz">${this.log.timezoneNote}</p>
            <table class="sched-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>MHz</th>
                  <th>Net / Assignment</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p class="sched-book-footer">${this.log.footer}</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);
    this.bookEl = this.el.querySelector('.sched-overlay-book') as HTMLElement;

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

  private bindDrag(): void {
    const onPointerDown = (e: PointerEvent) => {
      if (!this.open || e.button !== 0) {
        return;
      }
      const t = e.target as HTMLElement;
      // Keep table scrollable / selectable; drag from header, cover, or page chrome.
      if (t.closest('[data-close]') || t.closest('.sched-table')) {
        return;
      }

      const rect = this.bookEl.getBoundingClientRect();
      this.drag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: rect.left,
        originTop: rect.top,
      };
      this.bookEl.classList.add('sched-overlay-book--dragging');
      this.bookEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.pointerId) {
        return;
      }
      const dx = e.clientX - this.drag.startX;
      const dy = e.clientY - this.drag.startY;
      const left = this.drag.originLeft + dx;
      const top = this.drag.originTop + dy;
      this.bookEl.style.left = `${left}px`;
      this.bookEl.style.top = `${top}px`;
      this.bookEl.style.transform = 'none';
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.pointerId) {
        return;
      }
      this.drag = null;
      this.bookEl.classList.remove('sched-overlay-book--dragging');
      try {
        this.bookEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };

    this.bookEl.addEventListener('pointerdown', onPointerDown);
    this.bookEl.addEventListener('pointermove', onPointerMove);
    this.bookEl.addEventListener('pointerup', onPointerUp);
    this.bookEl.addEventListener('pointercancel', onPointerUp);
  }

  private centerBook(): void {
    const w = this.bookEl.offsetWidth;
    const h = this.bookEl.offsetHeight;
    const left = Math.max(12, (window.innerWidth - w) / 2);
    const top = Math.max(12, (window.innerHeight - h) / 2);
    this.bookEl.style.left = `${left}px`;
    this.bookEl.style.top = `${top}px`;
    this.bookEl.style.transform = 'none';
  }

  private renderRows(blocks: SchedBlock[], indexOffset: number): string {
    return blocks
      .map((block, i) => {
        const idx = indexOffset + i;
        const ink = idx % 2 === 0 ? 'sched-hand--blue' : 'sched-hand--red';
        const note = block.handNote
          ? `<span class="sched-hand ${ink}" style="--hand-i:${idx}">${block.handNote}</span>`
          : '';
        return `
      <tr class="sched-row">
        <td class="sched-time">${block.time}</td>
        <td class="sched-mhz">${block.mhz.toFixed(1)}</td>
        <td class="sched-assign">
          <span class="sched-assign-typed">${block.assignment}</span>
          ${note}
        </td>
      </tr>`;
      })
      .join('');
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
    this.bookEl.classList.remove('sched-overlay-book--open');
    void this.bookEl.offsetWidth;
    this.centerBook();
    this.bookEl.classList.add('sched-overlay-book--open');
    void this.audio.unlock().then(() => {
      this.audio.play('bookOpen', 1);
    });
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  hide(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.drag = null;
    this.bookEl.classList.remove('sched-overlay-book--dragging');
    this.el.classList.add('hidden');
    this.bookEl.classList.remove('sched-overlay-book--open');
    window.removeEventListener('keydown', this.onKeyDown, true);
  }
}
