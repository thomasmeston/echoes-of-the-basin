import { publicUrl } from '../utils/publicUrl';

/** Bump when replacing exterior-day/night PNGs so the browser drops stale plates. */
const PLATE_V = '9';

export const ROOM_IMAGE_SIZE = { w: 1536, h: 1024 };

/** Painted rect on the 1536×1024 plates — keep in sync with composite_window_exteriors.py */
export const WINDOW_PLATE_BBOX = { x: 1122, y: 197, w: 193, h: 252 };

export const WINDOW_APERTURE_STORAGE_KEY = 'echoes_window_aperture_v1';

export interface WindowApertureBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowApertureMeasure extends WindowApertureBBox {
  screen: { left: number; top: number; width: number; height: number };
  viewport: { w: number; h: number };
  bgZoom: number;
}

export function loadWindowAperture(): WindowApertureBBox {
  try {
    const raw = localStorage.getItem(WINDOW_APERTURE_STORAGE_KEY);
    if (!raw) {
      return { ...WINDOW_PLATE_BBOX };
    }
    const parsed = JSON.parse(raw) as Partial<WindowApertureBBox>;
    const x = Number(parsed.x);
    const y = Number(parsed.y);
    const w = Number(parsed.w);
    const h = Number(parsed.h);
    if ([x, y, w, h].every(Number.isFinite) && w > 4 && h > 4) {
      return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    }
  } catch {
    /* baked default */
  }
  return { ...WINDOW_PLATE_BBOX };
}

/** Full day 07:00–17:00, night 19:00–05:00, linear blend at dawn/dusk. */
export function daylightFromWatchMinutes(minutes: number): number {
  const m = ((minutes % 1440) + 1440) % 1440;
  const dawn0 = 5 * 60;
  const dawn1 = 7 * 60;
  const dusk0 = 17 * 60;
  const dusk1 = 19 * 60;
  if (m >= dawn1 && m < dusk0) {
    return 1;
  }
  if (m >= dusk1 || m < dawn0) {
    return 0;
  }
  if (m >= dusk0 && m < dusk1) {
    return 1 - (m - dusk0) / (dusk1 - dusk0);
  }
  return (m - dawn0) / (dawn1 - dawn0);
}

/**
 * Illustrated day/night exterior, stacked on bg-room with the same
 * object-fit:cover + bg-zoom so the aperture cannot drift.
 */
export class WindowView {
  readonly el: HTMLDivElement;
  private dayEl: HTMLImageElement;
  private nightEl: HTMLImageElement;
  private measuring = false;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'window-view';
    this.el.dataset.devObject = 'window-view';
    this.el.setAttribute('aria-hidden', 'true');

    this.dayEl = document.createElement('img');
    this.dayEl.className = 'window-view-day';
    this.dayEl.alt = '';
    this.dayEl.draggable = false;

    this.nightEl = document.createElement('img');
    this.nightEl.className = 'window-view-night';
    this.nightEl.alt = '';
    this.nightEl.draggable = false;

    this.el.append(this.dayEl, this.nightEl);
    parent.appendChild(this.el);
    const bust = `v=${PLATE_V}`;
    this.dayEl.src = publicUrl(`images/desk/window/exterior-day-raw.png?${bust}`);
    this.nightEl.src = publicUrl(`images/desk/window/exterior-night-raw.png?${bust}`);
    this.setMeasureMode(false);
    this.setDaylight(0.5);
  }

  /** 1 = full day, 0 = full night. Night plate fades on top of day. */
  setDaylight(daylight: number): void {
    const d = Math.min(1, Math.max(0, daylight));
    this.nightEl.style.opacity = String(1 - d);
  }

  /** Dev Mode: sizable box with an outline. Play: same box, no pointer events. */
  setMeasureMode(on: boolean): void {
    this.measuring = on;
    this.el.classList.toggle('window-view--measure', on);
  }

  isMeasuring(): boolean {
    return this.measuring;
  }

  /** Map this element's screen box through cover+bg-zoom into bg-room.png pixels. */
  imageBBoxFromElement(bgZoom: number): WindowApertureMeasure | null {
    const layer = this.el.parentElement;
    if (!layer) {
      return null;
    }
    const frame = layer.getBoundingClientRect();
    const box = this.el.getBoundingClientRect();
    const a = coverZoomImageFromScreen(box.left, box.top, frame, bgZoom);
    const b = coverZoomImageFromScreen(box.right, box.bottom, frame, bgZoom);
    const x = Math.round(Math.min(a.x, b.x));
    const y = Math.round(Math.min(a.y, b.y));
    const w = Math.round(Math.abs(b.x - a.x));
    const h = Math.round(Math.abs(b.y - a.y));
    return {
      x,
      y,
      w,
      h,
      screen: {
        left: Number(box.left.toFixed(1)),
        top: Number(box.top.toFixed(1)),
        width: Number(box.width.toFixed(1)),
        height: Number(box.height.toFixed(1)),
      },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      bgZoom,
    };
  }
}

export function coverZoomImageFromScreen(
  sx: number,
  sy: number,
  layer: DOMRect,
  zoom: number,
  imgW = ROOM_IMAGE_SIZE.w,
  imgH = ROOM_IMAGE_SIZE.h
): { x: number; y: number } {
  const elW = layer.width;
  const elH = layer.height;
  const scale = Math.max(elW / imgW, elH / imgH);
  const xOff = (imgW * scale - elW) / 2;
  const yOff = (imgH * scale - elH) / 2;
  const cx = elW / 2;
  const cy = elH / 2;
  const lx = sx - layer.left;
  const ly = sy - layer.top;
  const ex = cx + (lx - cx) / zoom;
  const ey = cy + (ly - cy) / zoom;
  return {
    x: (ex + xOff) / scale,
    y: (ey + yOff) / scale,
  };
}

export function coverZoomScreenFromImage(
  ix: number,
  iy: number,
  layer: DOMRect,
  zoom: number,
  imgW = ROOM_IMAGE_SIZE.w,
  imgH = ROOM_IMAGE_SIZE.h
): { x: number; y: number } {
  const elW = layer.width;
  const elH = layer.height;
  const scale = Math.max(elW / imgW, elH / imgH);
  const xOff = (imgW * scale - elW) / 2;
  const yOff = (imgH * scale - elH) / 2;
  const cx = elW / 2;
  const cy = elH / 2;
  const ex = ix * scale - xOff;
  const ey = iy * scale - yOff;
  return {
    x: layer.left + cx + zoom * (ex - cx),
    y: layer.top + cy + zoom * (ey - cy),
  };
}
