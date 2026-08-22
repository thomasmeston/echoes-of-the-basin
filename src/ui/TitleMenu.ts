import { publicUrl } from '../utils/publicUrl';
import type { SaveSlotInfo } from '../game/SaveLoad';

export interface TitleMenuOptions {
  onNewGame: (slot: number) => void;
  onContinue: (slot: number) => void;
  onDeleteSlot?: (slot: number) => void;
}

export class TitleMenu {
  private el: HTMLDivElement;
  private slotsEl!: HTMLDivElement;
  private open = false;

  constructor(private readonly options: TitleMenuOptions) {
    this.el = document.createElement('div');
    this.el.className = 'title-menu';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="title-menu__bg" aria-hidden="true"></div>
      <div class="title-menu__veil" aria-hidden="true"></div>
      <div class="title-menu__panel">
        <h1 class="title-menu__title">
          <span class="title-menu__title-echo">Echoes</span>
          <span class="title-menu__title-of">of the</span>
          <span class="title-menu__title-basin">Basin</span>
        </h1>
        <div class="title-menu__slots" role="list"></div>
      </div>
    `;
    const bg = this.el.querySelector('.title-menu__bg') as HTMLDivElement;
    bg.style.backgroundImage = `url("${publicUrl('images/desk/bg-room.png')}")`;
    this.slotsEl = this.el.querySelector('.title-menu__slots')!;
    document.body.appendChild(this.el);
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(slots: SaveSlotInfo[]): void {
    this.renderSlots(slots);
    this.open = true;
    this.el.hidden = false;
    this.el.classList.add('title-menu--open');
  }

  hide(): void {
    this.open = false;
    this.el.hidden = true;
    this.el.classList.remove('title-menu--open');
  }

  refresh(slots: SaveSlotInfo[]): void {
    this.renderSlots(slots);
  }

  private renderSlots(slots: SaveSlotInfo[]): void {
    this.slotsEl.innerHTML = '';
    for (const info of slots) {
      const row = document.createElement('div');
      row.className = `title-menu__slot${info.empty ? ' title-menu__slot--empty' : ''}`;
      row.setAttribute('role', 'listitem');

      const meta = document.createElement('div');
      meta.className = 'title-menu__slot-meta';
      meta.innerHTML = `
        <span class="title-menu__slot-index">Slot ${info.slot + 1}</span>
        <span class="title-menu__slot-label">${info.label}</span>
      `;

      const actions = document.createElement('div');
      actions.className = 'title-menu__slot-actions';

      if (info.empty) {
        const start = document.createElement('button');
        start.type = 'button';
        start.className = 'title-menu__btn title-menu__btn--primary';
        start.textContent = 'New watch';
        start.addEventListener('click', () => this.options.onNewGame(info.slot));
        actions.appendChild(start);
      } else {
        const cont = document.createElement('button');
        cont.type = 'button';
        cont.className = 'title-menu__btn title-menu__btn--primary';
        cont.textContent = 'Continue';
        cont.addEventListener('click', () => this.options.onContinue(info.slot));

        const restart = document.createElement('button');
        restart.type = 'button';
        restart.className = 'title-menu__btn';
        restart.textContent = 'New watch';
        restart.addEventListener('click', () => {
          if (
            window.confirm(
              `Start a new watch in Slot ${info.slot + 1}? Current progress in this slot will be cleared.`
            )
          ) {
            this.options.onNewGame(info.slot);
          }
        });
        actions.append(cont, restart);
      }

      row.append(meta, actions);
      this.slotsEl.appendChild(row);
    }
  }
}
