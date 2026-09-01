import { notebookTextureUrl } from '../utils/publicUrl';
import { DECODER_NIGHTS, getDecoderPage } from '../data/loader';
import { decodeCipher } from '../game/decoder';
import type { AudioManager } from '../game/AudioManager';

export interface DecodeBookOptions {
  getDay: () => number;
  getActiveCipher: () => string | null;
  getActiveDecoderDay?: () => number;
  onDecoded: (plain: string) => void;
  onWrong?: () => void;
}

/** 15-night number-to-letter pad — paper overlay like the sched log. */
export class DecodeBookOverlay {
  private el: HTMLDivElement;
  private bookEl!: HTMLElement;
  private gridHost!: HTMLElement;
  private input!: HTMLInputElement;
  private resultEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private subEl!: HTMLElement;
  private legendEl!: HTMLElement;
  private pageLabel!: HTMLElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private open = false;
  private currentPage = 1;
  private drag: {
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null = null;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(
    private readonly audio: AudioManager,
    private readonly options: DecodeBookOptions
  ) {
    this.el = document.createElement('div');
    this.el.id = 'decode-overlay';
    this.el.className = 'sched-overlay decode-overlay hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Decode book');

    const paper = notebookTextureUrl();
    this.el.innerHTML = `
      <div class="sched-overlay-book decode-book" tabindex="-1">
        <button type="button" class="sched-overlay-close" data-close="1" aria-label="Close decode book">×</button>
        <div class="sched-book-cover">
          <div class="sched-book-spine" aria-hidden="true"></div>
          <div class="sched-page" style="--sched-paper-texture:url('${paper}')">
            <header class="sched-book-header sched-book-drag">
              <h2 class="sched-book-title decode-book-title">Decode book</h2>
              <p class="sched-book-subtitle decode-book-sub"></p>
            </header>
            <p class="sched-book-preamble decode-book-legend"></p>
            <div class="decode-grid"></div>
            <label class="decode-try-label">Try a number string
              <input type="text" class="decode-try-input" autocomplete="off" placeholder="19 5 1 18 3 8 0 20 8 5 0 14 5 7 18 15" />
            </label>
            <p class="decode-try-result"></p>
            <button type="button" class="choice-button decode-try-btn">Decode</button>
            <nav class="decode-pager" aria-label="Decoder pages">
              <button type="button" class="decode-pager-btn" data-dir="-1">← Prev</button>
              <span class="decode-pager-label"></span>
              <button type="button" class="decode-pager-btn" data-dir="1">Next →</button>
            </nav>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);
    this.bookEl = this.el.querySelector('.sched-overlay-book') as HTMLElement;
    this.gridHost = this.el.querySelector('.decode-grid') as HTMLElement;
    this.input = this.el.querySelector('.decode-try-input') as HTMLInputElement;
    this.resultEl = this.el.querySelector('.decode-try-result') as HTMLElement;
    this.titleEl = this.el.querySelector('.decode-book-title') as HTMLElement;
    this.subEl = this.el.querySelector('.decode-book-sub') as HTMLElement;
    this.legendEl = this.el.querySelector('.decode-book-legend') as HTMLElement;
    this.pageLabel = this.el.querySelector('.decode-pager-label') as HTMLElement;
    this.prevBtn = this.el.querySelector('[data-dir="-1"]') as HTMLButtonElement;
    this.nextBtn = this.el.querySelector('[data-dir="1"]') as HTMLButtonElement;

    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (t === this.el || t?.closest?.('[data-close]')) {
        this.hide();
      }
    });
    this.el.querySelector('.decode-try-btn')?.addEventListener('click', () => this.tryDecode());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.tryDecode();
      }
    });
    this.prevBtn.addEventListener('click', () => this.turnPage(-1));
    this.nextBtn.addEventListener('click', () => this.turnPage(1));
    this.bindDrag();

    this.onKeyDown = (e) => {
      if (!this.open) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        return;
      }
      const typing = e.target === this.input;
      if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        this.turnPage(e.key === 'ArrowLeft' ? -1 : 1);
      }
    };
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Open the pad book. Optional page (1–15) overrides the night in play. */
  show(page?: number): void {
    const wanted =
      page ??
      this.options.getActiveDecoderDay?.() ??
      this.options.getDay();
    this.currentPage = clampPage(wanted);
    if (!this.open) {
      this.open = true;
      this.el.classList.remove('hidden');
      this.bookEl.classList.remove('sched-overlay-book--open');
      void this.bookEl.offsetWidth;
      this.centerBook();
      this.bookEl.classList.add('sched-overlay-book--open');
      document.addEventListener('keydown', this.onKeyDown, true);
      void this.audio.unlock().then(() => {
        this.audio.play('bookOpen', 1);
      });
    } else {
      this.centerBook();
    }
    this.refresh();
    const pending = this.options.getActiveCipher();
    if (pending && !this.input.value) {
      this.input.value = pending;
    }
    this.input.focus();
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
    document.removeEventListener('keydown', this.onKeyDown, true);
  }

  private bindDrag(): void {
    const onPointerDown = (e: PointerEvent) => {
      if (!this.open || e.button !== 0) {
        return;
      }
      const t = e.target as HTMLElement;
      if (
        t.closest('[data-close]') ||
        t.closest('input, textarea, button') ||
        t.closest('.decode-pager')
      ) {
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
      this.bookEl.style.left = `${this.drag.originLeft + dx}px`;
      this.bookEl.style.top = `${this.drag.originTop + dy}px`;
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

  private turnPage(delta: number): void {
    this.currentPage = clampPage(this.currentPage + delta);
    this.refresh();
    void this.audio.unlock().then(() => {
      this.audio.play('bookOpen', 0.45);
    });
  }

  refresh(): void {
    const page = getDecoderPage(this.currentPage);
    this.titleEl.textContent = page.title;
    this.subEl.textContent = `Outpost Tucunaré — Night ${page.day}`;
    this.legendEl.textContent = page.legend;
    this.pageLabel.textContent = `Night ${page.day} of ${DECODER_NIGHTS}`;
    this.prevBtn.disabled = this.currentPage <= 1;
    this.nextBtn.disabled = this.currentPage >= DECODER_NIGHTS;
    const cells: string[] = [];
    for (let n = 1; n <= 26; n++) {
      cells.push(
        `<span class="decode-cell"><b>${n}</b> ${page.map[String(n)] ?? '?'}</span>`
      );
    }
    this.gridHost.innerHTML = cells.join('');
    this.resultEl.textContent = '';
  }

  private tryDecode(): void {
    const page = getDecoderPage(this.currentPage);
    const raw = this.input.value.trim();
    if (!raw) {
      return;
    }
    const plain = decodeCipher(raw, page.map);
    this.resultEl.textContent = plain || '(nothing)';
    const expected = this.options.getActiveCipher();
    if (!expected) {
      return;
    }
    if (normalizeCipher(raw) !== normalizeCipher(expected)) {
      return;
    }
    const needed = this.options.getActiveDecoderDay?.() ?? this.options.getDay();
    if (this.currentPage !== needed) {
      this.resultEl.textContent = `${plain || '(nothing)'} — wrong night's pad.`;
      return;
    }
    this.hide();
    this.options.onDecoded(plain);
  }
}

function clampPage(n: number): number {
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.min(DECODER_NIGHTS, Math.max(1, Math.round(n)));
}

function normalizeCipher(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}
