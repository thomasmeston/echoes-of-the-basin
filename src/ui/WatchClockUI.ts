import { isNightSceneFromWatchMinutes } from '../scene/WindowView';
import { publicUrl } from '../utils/publicUrl';

/** Analog watch clock for the left HUD (above the desk calendar). */
const SUN_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="4.2" fill="#c4a45a"/>
  <g stroke="#c4a45a" stroke-width="1.6" stroke-linecap="round">
    <line x1="12" y1="2.2" x2="12" y2="5.2"/>
    <line x1="12" y1="18.8" x2="12" y2="21.8"/>
    <line x1="2.2" y1="12" x2="5.2" y2="12"/>
    <line x1="18.8" y1="12" x2="21.8" y2="12"/>
    <line x1="5.1" y1="5.1" x2="7.2" y2="7.2"/>
    <line x1="16.8" y1="16.8" x2="18.9" y2="18.9"/>
    <line x1="18.9" y1="5.1" x2="16.8" y2="7.2"/>
    <line x1="7.2" y1="16.8" x2="5.1" y2="18.9"/>
  </g>
</svg>`;

const MOON_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path fill="#c9d0dc" d="M15.4 3.4a8.6 8.6 0 1 0 5.2 14.8A8.8 8.8 0 0 1 9.6 12.4 8.8 8.8 0 0 1 15.4 3.4Z"/>
</svg>`;

export class WatchClockUI {
  readonly el: HTMLDivElement;
  private hourHand: HTMLElement;
  private minuteHand: HTMLElement;
  private periodEl: HTMLElement;
  private isNight = false;

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

    this.periodEl = document.createElement('div');
    this.periodEl.className = 'hud-clock-period';
    this.periodEl.setAttribute('aria-hidden', 'true');

    this.hourHand = document.createElement('div');
    this.hourHand.className = 'hud-clock-hand hud-clock-hand--hour';
    this.minuteHand = document.createElement('div');
    this.minuteHand.className = 'hud-clock-hand hud-clock-hand--minute';
    const pin = document.createElement('div');
    pin.className = 'hud-clock-pin';

    face.append(img, this.periodEl, this.hourHand, this.minuteHand, pin);
    this.el.appendChild(face);
    parent.appendChild(this.el);
    this.setFromWatchMinutes(18 * 60);
  }

  /** Drive hands + sun/moon from the same minutes as the window plates. */
  setFromWatchMinutes(minutes: number): void {
    const total = ((minutes % 1440) + 1440) % 1440;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    this.setTime(hour, minute, isNightSceneFromWatchMinutes(total));
  }

  /** `minute` may be fractional for a smooth sweep. */
  setTime(hour: number, minute: number, night?: boolean): void {
    const h24 = ((Math.floor(hour) % 24) + 24) % 24;
    const h = h24 % 12;
    const m = Number.isFinite(minute) ? Math.min(60, Math.max(0, minute)) : 0;
    const minuteDeg = m * 6;
    const hourDeg = h * 30 + m * 0.5;
    this.hourHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
    this.minuteHand.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
    const nightScene = night ?? isNightSceneFromWatchMinutes(h24 * 60 + m);
    this.setPeriod(nightScene);
  }

  private setPeriod(night: boolean): void {
    if (night === this.isNight && this.periodEl.innerHTML) {
      return;
    }
    this.isNight = night;
    this.periodEl.innerHTML = night ? MOON_SVG : SUN_SVG;
    this.periodEl.classList.toggle('hud-clock-period--pm', night);
    this.el.setAttribute('aria-label', night ? 'Watch clock, night' : 'Watch clock, day');
  }
}
