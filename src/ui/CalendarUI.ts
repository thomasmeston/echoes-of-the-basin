import { CAMPAIGN } from '../data/loader';

export class CalendarUI {
  private container: HTMLDivElement;
  private currentDate: Date;
  private displayDay = 1;

  constructor(startDate: Date, parent: HTMLElement = document.body) {
    this.currentDate = new Date(startDate);
    this.container = document.createElement('div');
    this.container.className = 'calendar-container';
    this.container.dataset.devObject = 'hud-calendar';
    parent.appendChild(this.container);
    this.render();
  }

  get el(): HTMLElement {
    return this.container;
  }

  setDay(day: number): void {
    this.displayDay = day;
    this.currentDate = new Date(CAMPAIGN.startDate);
    this.currentDate.setDate(this.currentDate.getDate() + (day - 1));
    this.render();
  }

  advanceDay(): void {
    this.setDay(this.displayDay + 1);
  }

  reset(startDate: Date): void {
    this.currentDate = new Date(startDate);
    this.displayDay = 1;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const pin = document.createElement('div');
    pin.className = 'calendar-pin';
    pin.setAttribute('aria-hidden', 'true');

    const mast = document.createElement('div');
    mast.className = 'calendar-mast';
    mast.textContent = 'Outpost Tucunaré · Desk Calendar';

    const header = document.createElement('div');
    header.className = 'calendar-header';
    header.textContent = this.currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (const d of days) {
      const h = document.createElement('div');
      h.className = 'calendar-day-header';
      h.textContent = d;
      grid.appendChild(h);
    }

    const first = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const last = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    for (let i = 0; i < first.getDay(); i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day inactive';
      grid.appendChild(empty);
    }
    for (let day = 1; day <= last.getDate(); day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      cell.textContent = String(day);
      if (day === this.currentDate.getDate()) {
        cell.classList.add('current');
      }
      if (day < this.currentDate.getDate()) {
        cell.classList.add('completed');
      }
      grid.appendChild(cell);
    }

    this.container.append(pin, mast, header, grid);
  }
}
