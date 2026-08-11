import { publicUrl } from '../utils/publicUrl';
import type { AudioManager } from '../game/AudioManager';
import plantNotes from '../data/plant-notes.json';

interface PlantNote {
  id: string;
  commonName: string;
  latinName: string;
  sketch: string;
  description: string;
  uses: string;
}

interface PlantNotesFile {
  title: string;
  plants: PlantNote[];
}

/**
 * Spread of loose Amazon plant field notes opened from the desk papers pile.
 */
export class PapersOverlay {
  private el: HTMLDivElement;
  private open = false;
  private onKeyDown: (e: KeyboardEvent) => void;
  private readonly notes = plantNotes as PlantNotesFile;

  constructor(private readonly audio: AudioManager) {
    this.el = document.createElement('div');
    this.el.id = 'papers-overlay';
    this.el.className = 'papers-overlay hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', this.notes.title);

    const cards = this.notes.plants
      .map(
        (p, i) => `
      <article class="plant-card" style="--i:${i}" data-plant="${p.id}">
        <img class="plant-card-sketch" src="${publicUrl(`images/desk/plants/${p.sketch}.png`)}" alt="" draggable="false" />
        <div class="plant-card-body">
          <h3 class="plant-card-name">${p.commonName}</h3>
          <p class="plant-card-latin">${p.latinName}</p>
          <p class="plant-card-desc">${p.description}</p>
          <p class="plant-card-uses"><span>Uses:</span> ${p.uses}</p>
        </div>
      </article>`
      )
      .join('');

    this.el.innerHTML = `
      <div class="papers-overlay-backdrop" data-close="1"></div>
      <div class="papers-overlay-sheet">
        <button type="button" class="papers-overlay-close" data-close="1" aria-label="Close plant notes">×</button>
        <header class="papers-overlay-header">
          <h2>${this.notes.title}</h2>
          <p>Loose sketches from the desk — basin flora, uses, and field marks.</p>
        </header>
        <div class="plant-card-spread">
          ${cards}
        </div>
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
    const sheet = this.el.querySelector('.papers-overlay-sheet') as HTMLElement;
    sheet.classList.remove('papers-overlay-sheet--open');
    void sheet.offsetWidth;
    sheet.classList.add('papers-overlay-sheet--open');
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
    this.el.querySelector('.papers-overlay-sheet')?.classList.remove('papers-overlay-sheet--open');
    window.removeEventListener('keydown', this.onKeyDown, true);
  }
}
