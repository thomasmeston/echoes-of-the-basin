import { publicUrl } from '../utils/publicUrl';
import {
  BAND_COUNT,
  DIAL_NOTCH_MAX,
  METER_SETTINGS,
} from '../utils/constants';
import {
  defaultTransform,
  isClusterRelative,
  type DeskLayoutMap,
  type DeskObjectId,
  type DeskObjectTransform,
} from '../types/deskLayout';

export type DeskLayerId =
  | 'bg-room'
  | 'desk-surface'
  | 'papers'
  | 'map-folded'
  | 'lamp'
  | 'radio-body'
  | 'radio-dial'
  | 'meter-needle-l'
  | 'meter-needle-r'
  | 'mic-lollipop';

const LAYER_FILES: Record<DeskLayerId, string> = {
  'bg-room': 'bg-room.png',
  'desk-surface': 'desk-surface.png',
  papers: 'papers.png',
  // map art is baked into desk-surface.png; map-folded is a hit target only
  'map-folded': 'map-folded.png',
  lamp: 'lamp.png',
  'radio-body': 'radio-body.png',
  'radio-dial': 'radio-dial.png',
  'meter-needle-l': 'meter-needle-l.png',
  'meter-needle-r': 'meter-needle-r.png',
  'mic-lollipop': 'mic-lollipop.png',
};

const LAYER_FALLBACKS: Partial<Record<DeskLayerId, string>> = {
  'bg-room': 'bg-room.svg',
  'desk-surface': 'desk-surface.svg',
  papers: 'papers.svg',
  lamp: 'lamp.svg',
  'radio-dial': 'radio-dial.svg',
  'meter-needle-l': 'meter-needle.svg',
  'meter-needle-r': 'meter-needle.svg',
  'mic-lollipop': 'mic-lollipop.svg',
};

/** Design size for the desk+props rig (matches the tuned Chrome play window). */
export const DESK_RIG_WIDTH = 2506;
export const DESK_RIG_HEIGHT = 1227;

export class DeskStage {
  readonly root: HTMLDivElement;
  readonly radioCluster: HTMLDivElement;
  /** Desk furniture + props; scales as a unit. Background stays outside. */
  readonly deskRig: HTMLDivElement;
  private layers = new Map<DeskLayerId, HTMLElement>();
  private dialEl!: HTMLElement;
  private needleL!: HTMLElement;
  private needleR!: HTMLElement;
  private bandFaceEl!: HTMLElement;
  private meterFaceEl!: HTMLElement;
  private frequencyCount = 24;
  /** Continuous dial angle (degrees) — accumulates so wraps spin the short way. */
  private dialRotationDeg = 0;
  private dialIndex = 0;
  private bandRotationDeg = 0;
  private bandIndex = 0;
  private meterRotationDeg = 0;
  private meterIndex = 0;
  private frameZoom = 1;
  private readonly onResize: () => void;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'desk-stage';
    this.root.setAttribute('aria-hidden', 'false');

    this.deskRig = document.createElement('div');
    this.deskRig.className = 'desk-rig';
    this.deskRig.style.width = `${DESK_RIG_WIDTH}px`;
    this.deskRig.style.height = `${DESK_RIG_HEIGHT}px`;

    this.radioCluster = document.createElement('div');
    this.radioCluster.className = 'desk-radio-cluster';

    // Background fills the viewport and crops; everything else lives in the rig.
    this.buildLayer('bg-room', this.root, 'desk-layer desk-layer--bg');
    this.root.appendChild(this.deskRig);

    this.buildLayer('desk-surface', this.deskRig, 'desk-layer desk-layer--desk');
    this.buildLayer('papers', this.deskRig, 'desk-layer desk-layer--papers');
    this.buildMapHotspot();
    this.buildLayer('lamp', this.deskRig, 'desk-layer desk-layer--lamp desk-idle-flicker');

    this.deskRig.appendChild(this.radioCluster);
    this.buildLayer('radio-body', this.radioCluster, 'desk-layer desk-layer--radio-body');
    this.buildDialNotchRing();
    this.dialEl = this.buildLayer(
      'radio-dial',
      this.radioCluster,
      'desk-layer desk-layer--dial'
    );
    this.buildDialLabel('tune-label', 'Tune', 'desk-dial-label');
    const band = this.buildRadioKnob('band-dial', 'Band', BAND_COUNT, (i) => String(i + 1));
    this.bandFaceEl = band.face;
    const meter = this.buildRadioKnob(
      'meter-dial',
      'Meter',
      METER_SETTINGS.length,
      (i) => METER_SETTINGS[i] ?? ''
    );
    this.meterFaceEl = meter.face;
    this.needleL = this.buildLayer(
      'meter-needle-l',
      this.radioCluster,
      'desk-layer desk-layer--needle desk-layer--needle-l'
    );
    this.needleR = this.buildLayer(
      'meter-needle-r',
      this.radioCluster,
      'desk-layer desk-layer--needle desk-layer--needle-r'
    );
    this.buildLayer('mic-lollipop', this.deskRig, 'desk-layer desk-layer--mic');

    this.onResize = () => this.fitRigToViewport();
    window.addEventListener('resize', this.onResize);
    this.fitRigToViewport();

    parent.appendChild(this.root);
  }

  setFrequencyCount(count: number): void {
    this.frequencyCount = Math.max(1, count);
  }

  setDialIndex(index: number): void {
    const n = this.frequencyCount;
    const clamped = ((index % n) + n) % n;
    const step = 360 / n;
    let delta = clamped - this.dialIndex;
    const half = n / 2;
    if (delta > half) {
      delta -= n;
    } else if (delta < -half) {
      delta += n;
    }
    this.dialRotationDeg += delta * step;
    this.dialIndex = clamped;

    const scale = this.dialEl.style.getPropertyValue('--dev-scale') || '1';
    this.dialEl.style.transform =
      `translate(-50%, -50%) rotateX(var(--dev-rotate-x, 0deg)) rotateY(var(--dev-rotate-y, 0deg)) ` +
      `rotate(${this.dialRotationDeg}deg) scale(${scale})`;
  }

  twitchMeters(): void {
    this.needleL.classList.remove('needle-twitch');
    this.needleR.classList.remove('needle-twitch');
    // Force reflow so animation retriggers
    void this.needleL.offsetWidth;
    void this.needleR.offsetWidth;
    this.needleL.classList.add('needle-twitch');
    this.needleR.classList.add('needle-twitch');
  }

  getDialHitTarget(): HTMLElement {
    return this.dialEl;
  }

  getBandHitTarget(): HTMLElement {
    return this.bandFaceEl;
  }

  getMeterHitTarget(): HTMLElement {
    return this.meterFaceEl;
  }

  setBandIndex(index: number): void {
    const n = BAND_COUNT;
    const clamped = ((index % n) + n) % n;
    const step = 360 / n;
    let delta = clamped - this.bandIndex;
    const half = n / 2;
    if (delta > half) delta -= n;
    else if (delta < -half) delta += n;
    this.bandRotationDeg += delta * step;
    this.bandIndex = clamped;
    this.applyKnobFaceRotation(this.bandFaceEl, this.bandRotationDeg);
  }

  setMeterIndex(index: number): void {
    const n = METER_SETTINGS.length;
    const clamped = ((index % n) + n) % n;
    const step = 360 / n;
    let delta = clamped - this.meterIndex;
    const half = n / 2;
    if (delta > half) delta -= n;
    else if (delta < -half) delta += n;
    this.meterRotationDeg += delta * step;
    this.meterIndex = clamped;
    this.applyKnobFaceRotation(this.meterFaceEl, this.meterRotationDeg);
  }

  getObjectElement(id: DeskObjectId): HTMLElement | null {
    if (id === 'radio-cluster') {
      return this.radioCluster;
    }
    const layer = this.layers.get(id as DeskLayerId);
    if (layer) {
      return layer;
    }
    return this.root.querySelector(`[data-dev-object="${id}"]`);
  }

  setDevPickMode(enabled: boolean): void {
    this.root.classList.toggle('desk-stage--dev-pick', enabled);
  }

  highlightDevSelection(id: DeskObjectId | null): void {
    this.root.querySelectorAll('.desk-dev-selected').forEach((el) => {
      el.classList.remove('desk-dev-selected');
    });
    if (!id) {
      return;
    }
    this.getObjectElement(id)?.classList.add('desk-dev-selected');
  }

  clearDevSelection(): void {
    this.highlightDevSelection(null);
  }

  captureTransform(id: DeskObjectId): DeskObjectTransform {
    const el = this.getObjectElement(id);
    if (!el) {
      return defaultTransform();
    }
    const cs = getComputedStyle(el);
    const ref =
      id === 'bg-room'
        ? this.root
        : isClusterRelative(id)
          ? this.radioCluster
          : this.deskRig;
    const frame = ref.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const leftPct = ((box.left - frame.left) / frame.width) * 100;
    const bottomPct = ((frame.bottom - box.bottom) / frame.height) * 100;
    const centered =
      id === 'radio-cluster' ||
      id === 'radio-overlay' ||
      id === 'freq-display' ||
      id === 'dial-notches' ||
      id === 'tune-label' ||
      id === 'band-dial' ||
      id === 'meter-dial';
    const x = centered
      ? ((box.left + box.width / 2 - frame.left) / frame.width) * 100
      : leftPct;

    const readDeg = (prop: string) => {
      const raw = el.style.getPropertyValue(prop).replace('deg', '');
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    };

    // Report unscaled CSS box sizes (rig scale would otherwise inflate px reads).
    const rigScale = this.getRigScale();
    const w = Math.round(box.width / rigScale);
    const h = Math.round(box.height / rigScale);

    return {
      x: Number(x.toFixed(2)),
      y: Number(bottomPct.toFixed(2)),
      w,
      h,
      rotateX: readDeg('--dev-rotate-x'),
      rotateY: readDeg('--dev-rotate-y'),
      rotateZ: readDeg('--dev-rotate-z'),
      scale: Number(el.style.getPropertyValue('--dev-scale')) || 1,
      zIndex: Number.parseInt(cs.zIndex, 10) || 1,
    };
  }

  applyObjectTransform(id: DeskObjectId, t: DeskObjectTransform): void {
    const el = this.getObjectElement(id);
    if (!el) {
      return;
    }
    el.classList.add('desk-layout-override');
    el.style.setProperty('--dev-rotate-x', `${t.rotateX}deg`);
    el.style.setProperty('--dev-rotate-y', `${t.rotateY}deg`);
    el.style.setProperty('--dev-rotate-z', `${t.rotateZ}deg`);
    el.style.setProperty('--dev-scale', String(t.scale));
    el.style.zIndex = String(t.zIndex);

    const rotScale =
      `rotateX(var(--dev-rotate-x)) rotateY(var(--dev-rotate-y)) ` +
      `rotateZ(var(--dev-rotate-z)) scale(var(--dev-scale))`;

    if (id === 'radio-cluster') {
      el.style.left = `${t.x}%`;
      el.style.right = 'auto';
      el.style.bottom = `${t.y}%`;
      el.style.top = 'auto';
      el.style.width = `${t.w}px`;
      el.style.height = 'auto';
      el.style.perspective = '900px';
      el.style.transform = `translateX(-50%) ${rotScale}`;
      return;
    }

    if (id === 'bg-room') {
      // Background stays viewport-cover; ignore absolute px placement from legacy saves.
      el.style.inset = '0';
      el.style.width = '';
      el.style.height = '';
      el.style.left = '';
      el.style.bottom = '';
      el.style.transform = '';
      return;
    }

    el.style.inset = 'auto';
    el.style.left = `${t.x}%`;
    el.style.right = 'auto';
    el.style.bottom = `${t.y}%`;
    el.style.top = 'auto';
    el.style.width = `${t.w}px`;
    if (t.h > 0) {
      el.style.height = `${t.h}px`;
    }

    if (id === 'radio-dial' || id === 'dial-notches') {
      const match = /rotate\(([-0-9.]+)deg\)/.exec(el.style.transform);
      const gameplayRot = id === 'radio-dial' && match ? match[1] : '0';
      el.style.transform =
        `translate(-50%, -50%) rotateX(var(--dev-rotate-x)) rotateY(var(--dev-rotate-y)) ` +
        `rotate(${gameplayRot}deg) scale(var(--dev-scale))`;
      return;
    }

    if (id === 'band-dial' || id === 'meter-dial') {
      el.style.transform = `translate(-50%, -50%) ${rotScale}`;
      return;
    }

    if (id === 'radio-overlay' || id === 'freq-display' || id === 'tune-label') {
      el.style.transform = `translateX(-50%) ${rotScale}`;
      return;
    }

    el.style.transform = rotScale;
  }

  applyLayout(layout: DeskLayoutMap): void {
    for (const [id, t] of Object.entries(layout) as [DeskObjectId, DeskObjectTransform][]) {
      if (t) {
        this.applyObjectTransform(id, t);
      }
    }
  }

  setFrameZoom(zoom: number): void {
    this.frameZoom = Math.min(2, Math.max(0.55, zoom));
    this.deskRig.style.setProperty('--desk-frame-zoom', String(this.frameZoom));
    this.fitRigToViewport();
  }

  getFrameZoom(): number {
    return this.frameZoom;
  }

  setBgZoom(zoom: number): void {
    const z = Math.min(2.5, Math.max(0.55, zoom));
    const bg = this.layers.get('bg-room');
    if (!bg) {
      return;
    }
    bg.style.setProperty('--desk-bg-zoom', String(z));
    bg.classList.toggle('desk-bg-zoomed', Math.abs(z - 1) > 0.001);
  }

  getBgZoom(): number {
    const bg = this.layers.get('bg-room');
    const raw = bg?.style.getPropertyValue('--desk-bg-zoom') ?? '';
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  resetLayout(): void {
    const els = new Set<HTMLElement>([
      this.radioCluster,
      ...this.layers.values(),
      ...Array.from(this.root.querySelectorAll<HTMLElement>('[data-dev-object]')),
    ]);
    for (const el of els) {
      el.classList.remove('desk-layout-override', 'desk-bg-zoomed');
      el.style.cssText = '';
    }
    this.deskRig.style.width = `${DESK_RIG_WIDTH}px`;
    this.deskRig.style.height = `${DESK_RIG_HEIGHT}px`;
    this.setFrameZoom(1);
    this.setBgZoom(1);
  }

  getRigScale(): number {
    const raw = this.deskRig.style.getPropertyValue('--desk-rig-scale');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  /** Uniformly scale the desk+props rig to fit the viewport; background is unchanged. */
  fitRigToViewport(): void {
    const sx = window.innerWidth / DESK_RIG_WIDTH;
    const sy = window.innerHeight / DESK_RIG_HEIGHT;
    const fit = Math.min(sx, sy);
    const scale = fit * this.frameZoom;
    this.deskRig.style.setProperty('--desk-rig-scale', String(scale));
  }

  private applyKnobFaceRotation(face: HTMLElement, deg: number): void {
    face.style.transform = `rotate(${deg}deg)`;
  }

  private buildDialNotchRing(): HTMLElement {
    const ring = document.createElement('div');
    ring.className = 'dial-notch-ring';
    ring.dataset.devObject = 'dial-notches';
    ring.setAttribute('aria-hidden', 'true');

    for (let i = 0; i <= DIAL_NOTCH_MAX; i++) {
      const tick = document.createElement('span');
      const major = i % 10 === 0 || i === DIAL_NOTCH_MAX;
      const angle = (i / DIAL_NOTCH_MAX) * 360;
      tick.className = major ? 'dial-notch dial-notch--major' : 'dial-notch';
      tick.style.transform = `rotate(${angle}deg)`;
      if (major) {
        const num = document.createElement('span');
        num.className = 'dial-notch-num';
        num.textContent = String(i);
        num.style.transform = `translateX(-50%) rotate(${-angle}deg)`;
        tick.appendChild(num);
      }
      ring.appendChild(tick);
    }

    this.radioCluster.appendChild(ring);
    return ring;
  }

  private buildDialLabel(id: string, text: string, className: string): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    el.dataset.devObject = id;
    el.textContent = text;
    this.radioCluster.appendChild(el);
    return el;
  }

  private buildRadioKnob(
    id: 'band-dial' | 'meter-dial',
    label: string,
    steps: number,
    markText: (index: number) => string
  ): { root: HTMLElement; face: HTMLElement } {
    const root = document.createElement('div');
    root.className = `radio-knob radio-knob--${id}`;
    root.dataset.devObject = id;

    const scale = document.createElement('div');
    scale.className = 'radio-knob-scale';
    scale.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < steps; i++) {
      const mark = document.createElement('span');
      const angle = (i / steps) * 360;
      mark.className = 'radio-knob-mark';
      mark.style.transform = `rotate(${angle}deg)`;
      const text = document.createElement('span');
      text.className = 'radio-knob-mark-text';
      text.textContent = markText(i);
      text.style.transform = `translateX(-50%) rotate(${-angle}deg)`;
      mark.appendChild(text);
      scale.appendChild(mark);
    }

    const face = document.createElement('div');
    face.className = 'radio-knob-face desk-dial-hit';
    face.title = `Click or drag to set ${label}`;
    face.setAttribute('role', 'slider');
    face.setAttribute('aria-label', label);

    const pointer = document.createElement('div');
    pointer.className = 'radio-knob-pointer';
    face.appendChild(pointer);

    const caption = document.createElement('div');
    caption.className = 'radio-knob-label';
    caption.textContent = label;

    root.append(scale, face, caption);
    this.radioCluster.appendChild(root);
    return { root, face };
  }

  /** Invisible clickable region aligned to the map painted on desk-surface. */
  private buildMapHotspot(): void {
    const el = document.createElement('div');
    el.className = 'desk-layer desk-layer--map desk-map-hit';
    el.dataset.layer = 'map-folded';
    el.setAttribute('aria-label', 'Open Amazon basin map');
    this.deskRig.appendChild(el);
    this.layers.set('map-folded', el);
  }

  private buildLayer(
    id: DeskLayerId,
    parent: HTMLElement,
    className: string
  ): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    el.dataset.layer = id;

    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = publicUrl(`images/desk/${LAYER_FILES[id]}`);
    img.onerror = () => {
      const fallback = LAYER_FALLBACKS[id];
      if (fallback && !img.dataset.triedFallback) {
        img.dataset.triedFallback = '1';
        img.src = publicUrl(`images/desk/${fallback}`);
        return;
      }
      el.classList.add('desk-layer--fallback');
    };
    el.appendChild(img);

    parent.appendChild(el);
    this.layers.set(id, el);
    return el;
  }
}
