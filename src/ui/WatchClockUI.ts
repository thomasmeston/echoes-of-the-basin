import { publicUrl } from '../utils/publicUrl';

/** Analog watch clock for the left HUD (above the desk calendar). */
export class WatchClockUI {
  readonly el: HTMLDivElement;
  private hourHand: HTMLElement;
  private minuteHand: HTMLElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-clock';
    this.el.dataset.devObject = 'hud-clock';
    this.el.setAttribute('aria-label', 'Watch clock');

    const face = document.createElement('div');
    face.className = 'hud-clock-face';
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = publicUrl('images/desk/wall-clock-face.png');

    this.hourHand = document.createElement('div');
    this.hourHand.className = 'hud-clock-hand hud-clock-hand--hour';
    this.minuteHand = document.createElement('div');
    this.minuteHand.className = 'hud-clock-hand hud-clock-hand--minute';
    const pin = document.createElement('div');
    pin.className = 'hud-clock-pin';

    face.append(img, this.hourHand, this.minuteHand, pin);
    this.el.appendChild(face);
    parent.appendChild(this.el);
    this.setTime(18, 0);
  }

  /** `minute` may be fractional for a smooth sweep. */
  setTime(hour: number, minute: number): void {
    const h = ((hour % 12) + 12) % 12;
    const m = Number.isFinite(minute) ? Math.min(60, Math.max(0, minute)) : 0;
    const minuteDeg = m * 6;
    const hourDeg = h * 30 + m * 0.5;
    this.hourHand.style.transform = `translate(-50%, -100%) rotate(${hourDeg}deg)`;
    this.minuteHand.style.transform = `translate(-50%, -100%) rotate(${minuteDeg}deg)`;
  }
}
