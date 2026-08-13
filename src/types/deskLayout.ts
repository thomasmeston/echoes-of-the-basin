import type { DeskLayerId } from '../scene/DeskStage';
import defaultLayoutJson from '../data/desk-layout.json';
/** Radio overlay widgets — selectable in Dev Mode. */
export type RadioUiObjectId =
  | 'radio-overlay'
  | 'freq-display'
  | 'band-dial'
  | 'meter-dial'
  | 'power-dial'
  | 'power-light'
  | 'dial-notches'
  | 'tune-label';

/** Viewport HUD widgets — selectable in Dev Mode (fixed left/bottom %). */
export type HudObjectId = 'hud-clock' | 'hud-calendar' | 'field-notes';

/** Editable desk targets — layers, radio cluster, radio UI, HUD, and window aperture. */
export type DeskObjectId = DeskLayerId | 'radio-cluster' | RadioUiObjectId | HudObjectId | 'window-view';

export interface DeskObjectTransform {
  /** left % (radio-cluster / overlay: horizontal center %) */
  x: number;
  /** bottom % */
  y: number;
  /** width in px */
  w: number;
  /** height in px (0 = auto / CSS default aspect) */
  h: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  /** uniform scale multiplier */
  scale: number;
  zIndex: number;
}

/** Legacy saved transforms may still have `rotate` instead of rotateZ. */
export type DeskObjectTransformLoose = Partial<DeskObjectTransform> & {
  rotate?: number;
};

export type DeskLayoutMap = Partial<Record<DeskObjectId, DeskObjectTransform>>;

export interface DeskLayoutFile {
  version: 2;
  frameZoom: number;
  bgZoom: number;
  objects: DeskLayoutMap;
}

export const DESK_LAYOUT_STORAGE_KEY = 'echoes_desk_layout_v1';
export const DEFAULT_FRAME_ZOOM = 1;
export const DEFAULT_BG_ZOOM = 1;
export const FRAME_ZOOM_MIN = 0.55;
export const FRAME_ZOOM_MAX = 2;
export const BG_ZOOM_MIN = 0.55;
export const BG_ZOOM_MAX = 2.5;

export const RADIO_UI_OBJECTS: RadioUiObjectId[] = [
  'radio-overlay',
  'freq-display',
  'band-dial',
  'meter-dial',
  'power-dial',
  'power-light',
  'dial-notches',
  'tune-label',
];

export const HUD_OBJECTS: HudObjectId[] = [
  'hud-clock',
  'hud-calendar',
  'field-notes',
];

export const EDITABLE_DESK_OBJECTS: DeskObjectId[] = [
  'radio-cluster',
  ...RADIO_UI_OBJECTS,
  'radio-body',
  'radio-dial',
  'meter-needle-l',
  'meter-needle-r',
  'mic-lollipop',
  'lamp',
  'papers',
  'ops-manual',
  'sched-log',
  'map-folded',
  'desk-surface',
  'bg-room',
  'window-view',
  ...HUD_OBJECTS,
];

/** Objects whose % coords are relative to `.desk-radio-cluster`. */
export const CLUSTER_RELATIVE_OBJECTS: DeskObjectId[] = [
  'radio-body',
  'radio-dial',
  'meter-needle-l',
  'meter-needle-r',
  ...RADIO_UI_OBJECTS,
];

export function isHudObject(id: DeskObjectId): id is HudObjectId {
  return (HUD_OBJECTS as string[]).includes(id);
}

export function defaultTransform(): DeskObjectTransform {
  return {
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
    zIndex: 1,
  };
}

export function normalizeTransform(raw: DeskObjectTransformLoose | undefined): DeskObjectTransform {
  const base = defaultTransform();
  if (!raw) {
    return base;
  }
  const rotateZ = Number.isFinite(raw.rotateZ)
    ? Number(raw.rotateZ)
    : Number.isFinite(raw.rotate)
      ? Number(raw.rotate)
      : 0;
  return {
    x: Number.isFinite(raw.x) ? Number(raw.x) : base.x,
    y: Number.isFinite(raw.y) ? Number(raw.y) : base.y,
    w: Number.isFinite(raw.w) ? Number(raw.w) : base.w,
    h: Number.isFinite(raw.h) ? Number(raw.h) : base.h,
    rotateX: Number.isFinite(raw.rotateX) ? Number(raw.rotateX) : 0,
    rotateY: Number.isFinite(raw.rotateY) ? Number(raw.rotateY) : 0,
    rotateZ,
    scale: Number.isFinite(raw.scale) ? Number(raw.scale) : 1,
    zIndex: Number.isFinite(raw.zIndex) ? Number(raw.zIndex) : 1,
  };
}

export function normalizeLayoutFile(raw: unknown): DeskLayoutFile {
  const file = (raw ?? {}) as Partial<DeskLayoutFile> & { objects?: DeskLayoutMap };
  const objects: DeskLayoutMap = {};
  for (const [id, t] of Object.entries(file.objects ?? {}) as [
    DeskObjectId,
    DeskObjectTransformLoose,
  ][]) {
    if (!(EDITABLE_DESK_OBJECTS as string[]).includes(id)) {
      continue;
    }
    objects[id] = normalizeTransform(t);
  }
  return {
    version: 2,
    frameZoom: Number.isFinite(file.frameZoom) ? Number(file.frameZoom) : DEFAULT_FRAME_ZOOM,
    bgZoom: Number.isFinite(file.bgZoom) ? Number(file.bgZoom) : DEFAULT_BG_ZOOM,
    objects,
  };
}

export function isRadioUiObject(id: DeskObjectId): id is RadioUiObjectId {
  return (RADIO_UI_OBJECTS as string[]).includes(id);
}

export function isClusterRelative(id: DeskObjectId): boolean {
  return (CLUSTER_RELATIVE_OBJECTS as string[]).includes(id);
}

/** Captured manual layout baked into the repo. */
export const DEFAULT_DESK_LAYOUT: DeskLayoutFile = normalizeLayoutFile(defaultLayoutJson);
