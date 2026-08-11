import { publicUrl } from '../utils/publicUrl';
import { getMapRegionAt, MAP_REGIONS } from '../data/loader';
import type { AudioManager } from '../game/AudioManager';
import type { MapLandmarkDef, MapRegionDef } from '../types/mapRegions';
import { animateBoatAlongPath } from './MapTravel';

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.35;

export type MapDiscoverResult =
  | { ok: true }
  | { ok: false; reason: 'already' | 'batteries' | 'busy' };

export interface MapOverlayOptions {
  isDiscovered: (landmarkId: string) => boolean;
  canAfford: (cost: number) => boolean;
  onDiscover: (landmarkId: string, tokens: string[]) => MapDiscoverResult;
}

/**
 * Full-screen unfolded Amazon basin map with survey grid + riverboat travel.
 */
export class MapOverlay {
  private el: HTMLDivElement;
  private viewport!: HTMLDivElement;
  private worldEl!: HTMLDivElement;
  private img!: HTMLImageElement;
  private gridEl!: HTMLDivElement;
  private overviewEl!: HTMLDivElement;
  private focusEl!: HTMLDivElement;
  private focusStage!: HTMLDivElement;
  private focusTitle!: HTMLElement;
  private focusMeta!: HTMLElement;
  private toastEl!: HTMLElement;
  private captionEl!: HTMLElement;
  private open = false;
  private mode: 'overview' | 'focus' = 'overview';
  private magnify = false;
  private zoom = ZOOM_MIN;
  private panX = 0;
  private panY = 0;
  private dragging = false;
  private dragLastX = 0;
  private dragLastY = 0;
  private traveling = false;
  private focusRegion: MapRegionDef | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(
    private readonly audio: AudioManager,
    private readonly options: MapOverlayOptions
  ) {
    this.el = document.createElement('div');
    this.el.id = 'map-overlay';
    this.el.className = 'map-overlay hidden';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', 'Amazon basin map');
    this.el.innerHTML = `
      <div class="map-overlay-backdrop" data-close="1"></div>
      <div class="map-overlay-sheet">
        <button type="button" class="map-overlay-close" data-close="1" aria-label="Close map">×</button>
        <div class="map-overview">
          <div class="map-overlay-viewport">
            <div class="map-overlay-world">
              <img class="map-overlay-image" alt="Unfolded weathered map of the Amazon River basin with survey grid and coordinates" draggable="false" />
              <div class="map-grid" aria-label="Coordinate survey squares"></div>
            </div>
          </div>
        </div>
        <div class="map-focus hidden" aria-hidden="true">
          <button type="button" class="map-focus-back" data-focus-back="1">← Survey sheet</button>
          <h2 class="map-focus-title"></h2>
          <p class="map-focus-meta"></p>
          <div class="map-focus-stage">
            <div class="map-focus-crop" aria-hidden="true"></div>
            <svg class="map-focus-river" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
            <div class="map-focus-landmarks"></div>
            <div class="map-boat" aria-hidden="true" title="River boat"></div>
            <p class="map-focus-empty hidden">No field notes for this square yet.</p>
          </div>
        </div>
        <p class="map-overlay-toast hidden" role="status"></p>
        <p class="map-overlay-caption"></p>
      </div>
    `;
    this.overviewEl = this.el.querySelector('.map-overview')!;
    this.viewport = this.el.querySelector('.map-overlay-viewport')!;
    this.worldEl = this.el.querySelector('.map-overlay-world')!;
    this.img = this.el.querySelector('.map-overlay-image')!;
    this.gridEl = this.el.querySelector('.map-grid')!;
    this.focusEl = this.el.querySelector('.map-focus')!;
    this.focusStage = this.el.querySelector('.map-focus-stage')!;
    this.focusTitle = this.el.querySelector('.map-focus-title')!;
    this.focusMeta = this.el.querySelector('.map-focus-meta')!;
    this.toastEl = this.el.querySelector('.map-overlay-toast')!;
    this.captionEl = this.el.querySelector('.map-overlay-caption')!;
    this.img.src = publicUrl('images/desk/map-unfolded.png');
    document.body.appendChild(this.el);

    this.buildGrid();
    this.updateCaption();

    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[data-close]')) {
        this.hide();
        return;
      }
      if (t?.closest?.('[data-focus-back]')) {
        this.exitFocus();
      }
    });

    this.bindZoomControls();

    this.onKeyDown = (e) => {
      if (!this.open) {
        return;
      }
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (this.traveling) {
        return;
      }
      if (this.mode === 'focus') {
        this.exitFocus();
        return;
      }
      if (this.magnify || this.zoom > ZOOM_MIN) {
        this.setMagnify(false);
        this.resetView();
        this.updateGridInteractable();
        this.updateCaption();
        return;
      }
      this.hide();
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
    this.exitFocus(true);
    this.resetView();
    this.setMagnify(false);
    this.refreshDiscoveredMarks();
    this.updateGridInteractable();
    this.updateCaption();
    this.el.classList.remove('hidden');
    const sheet = this.el.querySelector('.map-overlay-sheet') as HTMLElement;
    sheet.classList.remove('map-overlay-sheet--open');
    void sheet.offsetWidth;
    sheet.classList.add('map-overlay-sheet--open');
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
    this.traveling = false;
    this.exitFocus(true);
    this.setMagnify(false);
    this.resetView();
    this.hideToast();
    this.el.classList.add('hidden');
    this.el.querySelector('.map-overlay-sheet')?.classList.remove('map-overlay-sheet--open');
    window.removeEventListener('keydown', this.onKeyDown, true);
  }

  toggle(): void {
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** Call after load/discover so visited landmarks stay muted. */
  refreshDiscoveredMarks(): void {
    this.gridEl.querySelectorAll<HTMLElement>('.map-grid-cell').forEach((cell) => {
      const col = Number(cell.dataset.col);
      const row = Number(cell.dataset.row);
      const region = getMapRegionAt(col, row);
      const seeded = Boolean(region);
      cell.classList.toggle('map-grid-cell--seeded', seeded);
      if (!region) {
        cell.classList.remove('map-grid-cell--partial', 'map-grid-cell--complete');
        return;
      }
      const total = region.landmarks.length;
      const found = region.landmarks.filter((l) => this.options.isDiscovered(l.id)).length;
      cell.classList.toggle('map-grid-cell--partial', found > 0 && found < total);
      cell.classList.toggle('map-grid-cell--complete', found > 0 && found >= total);
    });

    if (this.mode === 'focus') {
      this.renderFocusLandmarks();
    }
  }

  private buildGrid(): void {
    const { cols, rows, insets } = MAP_REGIONS.grid;
    this.gridEl.style.setProperty('--map-grid-cols', String(cols));
    this.gridEl.style.setProperty('--map-grid-rows', String(rows));
    this.gridEl.style.inset = `${insets.top * 100}% ${insets.right * 100}% ${insets.bottom * 100}% ${insets.left * 100}%`;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'map-grid-cell';
        cell.dataset.col = String(col);
        cell.dataset.row = String(row);
        const region = getMapRegionAt(col, row);
        cell.title = region
          ? `${region.title} (${region.label})`
          : `Square ${col + 1},${row + 1}`;
        cell.setAttribute(
          'aria-label',
          region ? `Open ${region.title}` : `Open empty survey square ${col + 1}, ${row + 1}`
        );
        if (region) {
          cell.classList.add('map-grid-cell--seeded');
        }
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.gridInteractable()) {
            this.showToast('Reset zoom to survey coordinate squares.');
            return;
          }
          this.enterFocus(col, row);
        });
        this.gridEl.appendChild(cell);
      }
    }
  }

  private gridInteractable(): boolean {
    return this.zoom <= ZOOM_MIN + 0.01 && !this.magnify && this.mode === 'overview';
  }

  private updateGridInteractable(): void {
    const on = this.gridInteractable();
    this.gridEl.classList.toggle('map-grid--disabled', !on);
    this.gridEl.querySelectorAll<HTMLButtonElement>('.map-grid-cell').forEach((cell) => {
      cell.disabled = !on;
    });
  }

  private updateCaption(): void {
    if (this.mode === 'focus') {
      this.captionEl.textContent = this.focusRegion
        ? 'Click a landmark to send the boat · costs batteries · Esc returns'
        : 'No survey notes · Esc returns to sheet';
      return;
    }
    if (!this.gridInteractable()) {
      this.captionEl.textContent =
        'Amazon Basin — reset zoom to survey squares · right-click magnifier · scroll to zoom';
      return;
    }
    this.captionEl.textContent =
      'Amazon Basin — hover a square · click to survey · right-click magnifier · scroll to zoom';
  }

  private enterFocus(col: number, row: number): void {
    this.focusRegion = getMapRegionAt(col, row);
    this.mode = 'focus';
    this.overviewEl.classList.add('hidden');
    this.focusEl.classList.remove('hidden');
    this.focusEl.setAttribute('aria-hidden', 'false');
    this.updateGridInteractable();

    const crop = this.focusStage.querySelector('.map-focus-crop') as HTMLElement;
    const { cols, rows, insets } = MAP_REGIONS.grid;
    const cellW = (1 - insets.left - insets.right) / cols;
    const cellH = (1 - insets.top - insets.bottom) / rows;
    const x = insets.left + col * cellW;
    const y = insets.top + row * cellH;
    // Scale so one cell fills the focus stage; position background accordingly.
    const scaleX = 1 / cellW;
    const scaleY = 1 / cellH;
    crop.style.backgroundImage = `url("${publicUrl('images/desk/map-unfolded.png')}")`;
    crop.style.backgroundSize = `${scaleX * 100}% ${scaleY * 100}%`;
    crop.style.backgroundPosition = `${(x / (1 - cellW)) * 100}% ${(y / (1 - cellH)) * 100}%`;

    if (this.focusRegion) {
      this.focusTitle.textContent = this.focusRegion.title;
      this.focusMeta.textContent = this.focusRegion.label;
      this.focusStage.querySelector('.map-focus-empty')?.classList.add('hidden');
      this.renderRiverPath(this.focusRegion);
      this.renderFocusLandmarks();
      this.resetBoat(this.focusRegion);
    } else {
      this.focusTitle.textContent = `Square ${col + 1}, ${row + 1}`;
      this.focusMeta.textContent = 'Unsurveyed grid';
      this.focusStage.querySelector('.map-focus-empty')?.classList.remove('hidden');
      this.clearRiverPath();
      this.focusStage.querySelector('.map-focus-landmarks')!.innerHTML = '';
      const boat = this.focusStage.querySelector('.map-boat') as HTMLElement;
      boat.classList.add('hidden');
    }
    this.updateCaption();
    void this.audio.unlock().then(() => {
      this.audio.play('paperUnfold', 0.55);
    });
  }

  private exitFocus(silent = false): void {
    this.mode = 'overview';
    this.focusRegion = null;
    this.focusEl.classList.add('hidden');
    this.focusEl.setAttribute('aria-hidden', 'true');
    this.overviewEl.classList.remove('hidden');
    this.updateGridInteractable();
    this.updateCaption();
    this.refreshDiscoveredMarks();
    if (!silent) {
      /* stay open on overview */
    }
  }

  private clearRiverPath(): void {
    const svg = this.focusStage.querySelector('.map-focus-river') as SVGSVGElement;
    svg.innerHTML = '';
  }

  private renderRiverPath(region: MapRegionDef): void {
    const svg = this.focusStage.querySelector('.map-focus-river') as SVGSVGElement;
    const d = region.riverPath
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
      .join(' ');
    svg.innerHTML = `
      <path class="map-focus-river-line" d="${d}" fill="none" vector-effect="non-scaling-stroke" />
    `;
  }

  private renderFocusLandmarks(): void {
    const wrap = this.focusStage.querySelector('.map-focus-landmarks')!;
    wrap.innerHTML = '';
    const region = this.focusRegion;
    if (!region) {
      return;
    }
    for (const landmark of region.landmarks) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `map-landmark map-landmark--${landmark.icon}`;
      btn.style.left = `${landmark.x}%`;
      btn.style.top = `${landmark.y}%`;
      btn.dataset.landmarkId = landmark.id;
      const discovered = this.options.isDiscovered(landmark.id);
      btn.classList.toggle('map-landmark--visited', discovered);
      btn.title = discovered
        ? `${landmark.name} (surveyed)`
        : `${landmark.name} — ${landmark.costBatteries} batteries`;
      const iconUrl = publicUrl(`images/map/icons/${landmark.icon}.svg`);
      btn.innerHTML = `
        <span class="map-landmark-icon" aria-hidden="true" style="background-image:url('${iconUrl}')"></span>
        <span class="map-landmark-name">${landmark.name}</span>
        <span class="map-landmark-cost">${discovered ? 'Surveyed' : `${landmark.costBatteries} bat.`}</span>
      `;
      btn.disabled = discovered || this.traveling;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        void this.travelToLandmark(landmark);
      });
      wrap.appendChild(btn);
    }
  }

  private resetBoat(region: MapRegionDef): void {
    const boat = this.focusStage.querySelector('.map-boat') as HTMLElement;
    boat.classList.remove('hidden');
    const start = region.riverPath[0] ?? [10, 50];
    boat.style.left = `${start[0]}%`;
    boat.style.top = `${start[1]}%`;
    boat.style.transform = 'translate(-50%, -50%) rotate(0deg)';
  }

  private async travelToLandmark(landmark: MapLandmarkDef): Promise<void> {
    const region = this.focusRegion;
    if (!region || this.traveling) {
      return;
    }
    if (this.options.isDiscovered(landmark.id)) {
      this.showToast('Already surveyed.');
      return;
    }
    if (!this.options.canAfford(landmark.costBatteries)) {
      this.showToast('Not enough batteries to send the boat.');
      return;
    }

    this.traveling = true;
    this.renderFocusLandmarks();
    const boat = this.focusStage.querySelector('.map-boat') as HTMLElement;
    boat.classList.remove('hidden');
    void this.audio.unlock().then(() => {
      this.audio.play('staticBlip', 0.5);
    });

    await animateBoatAlongPath({
      boat,
      path: region.riverPath,
      endIndex: landmark.pathIndex,
      durationMs: 1100 + landmark.pathIndex * 120,
    });

    const result = this.options.onDiscover(landmark.id, landmark.onDiscover);
    this.traveling = false;
    if (!result.ok) {
      if (result.reason === 'batteries') {
        this.showToast('Not enough batteries to send the boat.');
      }
      this.renderFocusLandmarks();
      this.resetBoat(region);
      return;
    }

    this.showToast(`Discovered: ${landmark.name}`);
    this.refreshDiscoveredMarks();
    void this.audio.unlock().then(() => {
      this.audio.play('radioBeep', 0.55);
    });
  }

  private showToast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.hideToast(), 2600);
  }

  private hideToast(): void {
    this.toastEl.classList.add('hidden');
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  private bindZoomControls(): void {
    this.viewport.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.mode !== 'overview') {
        return;
      }
      this.setMagnify(!this.magnify);
      this.updateGridInteractable();
      this.updateCaption();
    });

    this.viewport.addEventListener(
      'wheel',
      (e) => {
        if (this.mode !== 'overview') {
          return;
        }
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        this.zoomAt(e.clientX, e.clientY, dir * ZOOM_STEP);
        this.updateGridInteractable();
        this.updateCaption();
      },
      { passive: false }
    );

    this.viewport.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'overview') {
        return;
      }
      if (e.button === 2) {
        return;
      }
      if (e.button !== 0) {
        return;
      }
      if ((e.target as HTMLElement | null)?.closest?.('.map-grid-cell')) {
        return;
      }

      if (this.magnify) {
        e.preventDefault();
        this.zoomAt(e.clientX, e.clientY, ZOOM_STEP);
        this.updateGridInteractable();
        this.updateCaption();
        return;
      }

      if (this.zoom > ZOOM_MIN + 0.01) {
        this.dragging = true;
        this.dragLastX = e.clientX;
        this.dragLastY = e.clientY;
        this.viewport.classList.add('map-overlay-viewport--panning');
        this.viewport.setPointerCapture(e.pointerId);
      }
    });

    this.viewport.addEventListener('pointermove', (e) => {
      if (!this.dragging) {
        return;
      }
      const dx = e.clientX - this.dragLastX;
      const dy = e.clientY - this.dragLastY;
      this.dragLastX = e.clientX;
      this.dragLastY = e.clientY;
      this.panX += dx;
      this.panY += dy;
      this.applyTransform();
    });

    const endDrag = (e: PointerEvent) => {
      if (!this.dragging) {
        return;
      }
      this.dragging = false;
      this.viewport.classList.remove('map-overlay-viewport--panning');
      try {
        this.viewport.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    this.viewport.addEventListener('pointerup', endDrag);
    this.viewport.addEventListener('pointercancel', endDrag);
  }

  private setMagnify(on: boolean): void {
    this.magnify = on;
    this.el.classList.toggle('map-overlay--magnify', on);
    this.viewport.classList.toggle('map-overlay-viewport--magnify', on);
  }

  private zoomAt(clientX: number, clientY: number, delta: number): void {
    const rect = this.viewport.getBoundingClientRect();
    const vx = clientX - rect.left;
    const vy = clientY - rect.top;
    const prev = this.zoom;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + delta));
    if (Math.abs(next - prev) < 0.001) {
      return;
    }

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const ox = (vx - cx - this.panX) / prev;
    const oy = (vy - cy - this.panY) / prev;
    this.zoom = next;
    this.panX = vx - cx - ox * next;
    this.panY = vy - cy - oy * next;
    this.clampPan(rect.width, rect.height);
    this.applyTransform();
  }

  private clampPan(vw: number, vh: number): void {
    if (this.zoom <= ZOOM_MIN) {
      this.panX = 0;
      this.panY = 0;
      return;
    }
    const maxX = (vw * (this.zoom - 1)) / 2 + 40;
    const maxY = (vh * (this.zoom - 1)) / 2 + 40;
    this.panX = Math.min(maxX, Math.max(-maxX, this.panX));
    this.panY = Math.min(maxY, Math.max(-maxY, this.panY));
  }

  private applyTransform(): void {
    this.worldEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    this.viewport.classList.toggle('map-overlay-viewport--zoomed', this.zoom > ZOOM_MIN + 0.01);
  }

  private resetView(): void {
    this.zoom = ZOOM_MIN;
    this.panX = 0;
    this.panY = 0;
    this.dragging = false;
    this.viewport.classList.remove('map-overlay-viewport--panning', 'map-overlay-viewport--zoomed');
    this.worldEl.style.transform = '';
  }
}
