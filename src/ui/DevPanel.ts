import type { DeskStage } from '../scene/DeskStage';
import {
  BG_ZOOM_MAX,
  BG_ZOOM_MIN,
  DEFAULT_BG_ZOOM,
  DEFAULT_DESK_LAYOUT,
  DEFAULT_FRAME_ZOOM,
  DESK_LAYOUT_STORAGE_KEY,
  EDITABLE_DESK_OBJECTS,
  FRAME_ZOOM_MAX,
  FRAME_ZOOM_MIN,
  normalizeLayoutFile,
  normalizeTransform,
  type DeskLayoutFile,
  type DeskLayoutMap,
  type DeskObjectId,
  type DeskObjectTransform,
} from '../types/deskLayout';

const STEP = {
  pos: 0.5,
  size: 4,
  rotate: 1,
  scale: 0.05,
  z: 1,
} as const;

type TransformField = keyof DeskObjectTransform;

export class DevPanel {
  private el: HTMLDivElement;
  private active = false;
  private selected: DeskObjectId = 'radio-cluster';
  private layout: DeskLayoutMap = {};
  private frameZoom = DEFAULT_FRAME_ZOOM;
  private bgZoom = DEFAULT_BG_ZOOM;

  private selectedLabel!: HTMLSpanElement;
  private picker!: HTMLSelectElement;
  private inputs!: Record<TransformField, HTMLInputElement>;
  private frameZoomSlider!: HTMLInputElement;
  private frameZoomValue!: HTMLInputElement;
  private bgZoomSlider!: HTMLInputElement;
  private bgZoomValue!: HTMLInputElement;
  private statusEl!: HTMLParagraphElement;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onStageClick: (e: MouseEvent) => void;

  constructor(private readonly desk: DeskStage) {
    this.el = document.createElement('div');
    this.el.id = 'dev-panel';
    this.el.className = 'dev-panel hidden';
    this.el.innerHTML = this.buildMarkup();
    document.body.appendChild(this.el);

    this.selectedLabel = this.el.querySelector('#dev-selected-name')!;
    this.picker = this.el.querySelector('#dev-object-picker')!;
    this.statusEl = this.el.querySelector('#dev-status')!;
    this.frameZoomSlider = this.el.querySelector('#dev-frame-zoom')!;
    this.frameZoomValue = this.el.querySelector('#dev-frame-zoom-val')!;
    this.bgZoomSlider = this.el.querySelector('#dev-bg-zoom')!;
    this.bgZoomValue = this.el.querySelector('#dev-bg-zoom-val')!;
    this.inputs = {
      x: this.el.querySelector('#dev-pos-x')!,
      y: this.el.querySelector('#dev-pos-y')!,
      w: this.el.querySelector('#dev-size-w')!,
      h: this.el.querySelector('#dev-size-h')!,
      rotateX: this.el.querySelector('#dev-rotate-x')!,
      rotateY: this.el.querySelector('#dev-rotate-y')!,
      rotateZ: this.el.querySelector('#dev-rotate-z')!,
      scale: this.el.querySelector('#dev-scale')!,
      zIndex: this.el.querySelector('#dev-z')!,
    };

    this.fillPicker();
    this.bindUi();
    this.loadStoredLayout();

    this.onKeyDown = (e) => this.handleKey(e);
    this.onStageClick = (e) => this.handleStageClick(e);
  }

  get isActive(): boolean {
    return this.active;
  }

  toggle(): void {
    if (this.active) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    this.active = true;
    this.el.classList.remove('hidden');
    document.body.classList.add('dev-mode-active');
    this.desk.setDevPickMode(true);
    this.select(this.selected);
    window.addEventListener('keydown', this.onKeyDown);
    this.desk.root.addEventListener('click', this.onStageClick, true);
  }

  hide(): void {
    this.active = false;
    this.el.classList.add('hidden');
    document.body.classList.remove('dev-mode-active');
    this.desk.setDevPickMode(false);
    this.desk.clearDevSelection();
    window.removeEventListener('keydown', this.onKeyDown);
    this.desk.root.removeEventListener('click', this.onStageClick, true);
  }

  private buildMarkup(): string {
    return `
      <div class="dev-header">
        <h3>Dev Mode</h3>
        <span class="dev-indicator" id="dev-mode-indicator">Layout</span>
      </div>
      <div class="dev-mode-tabs" role="tablist">
        <button type="button" class="dev-mode-tab active" data-tab="layout">Layout</button>
        <button type="button" class="dev-mode-tab" data-tab="export">Export</button>
      </div>
      <div id="dev-layout-section">
        <p class="dev-mode-hint">Click a desk object or pick from the list. Arrows nudge · [ ] Z · Shift+[ ] Y · Ctrl+[ ] X · -/+ scale.</p>
        <div class="dev-frame-zoom-block">
          <div class="dev-range-row">
            <label for="dev-frame-zoom">Frame zoom</label>
            <input type="range" id="dev-frame-zoom" min="${FRAME_ZOOM_MIN}" max="${FRAME_ZOOM_MAX}" step="0.01" value="${DEFAULT_FRAME_ZOOM}" />
            <input type="text" id="dev-frame-zoom-val" class="dev-input" value="${DEFAULT_FRAME_ZOOM.toFixed(2)}" />
          </div>
          <div class="dev-range-row">
            <label for="dev-bg-zoom">BG zoom</label>
            <input type="range" id="dev-bg-zoom" min="${BG_ZOOM_MIN}" max="${BG_ZOOM_MAX}" step="0.01" value="${DEFAULT_BG_ZOOM}" />
            <input type="text" id="dev-bg-zoom-val" class="dev-input" value="${DEFAULT_BG_ZOOM.toFixed(2)}" />
          </div>
          <p class="dev-mode-hint">Frame = whole stage. BG = room plate only (props stay put).</p>
        </div>
        <div class="dev-selection-status">Selected: <span id="dev-selected-name">None</span></div>
        <div class="dev-row dev-row-select">
          <label for="dev-object-picker">Object</label>
          <select id="dev-object-picker" class="dev-select"></select>
        </div>
        <div class="dev-controls-group">
          ${this.nudgeRow('Pos X %', 'dev-pos-x', 'x')}
          ${this.nudgeRow('Pos Y %', 'dev-pos-y', 'y')}
          ${this.nudgeRow('Width px', 'dev-size-w', 'w')}
          ${this.nudgeRow('Height px', 'dev-size-h', 'h')}
          ${this.nudgeRow('Rot X °', 'dev-rotate-x', 'rotateX')}
          ${this.nudgeRow('Rot Y °', 'dev-rotate-y', 'rotateY')}
          ${this.nudgeRow('Rot Z °', 'dev-rotate-z', 'rotateZ')}
          ${this.nudgeRow('Scale', 'dev-scale', 'scale')}
          ${this.nudgeRow('Z-index', 'dev-z', 'zIndex')}
        </div>
        <div class="dev-layout-actions">
          <button type="button" class="dev-btn dev-btn-primary" id="dev-save-layout">Save Layout</button>
          <button type="button" class="dev-btn" id="dev-copy-json">Copy Layout JSON</button>
          <button type="button" class="dev-btn" id="dev-copy-css">Copy CSS snippet</button>
          <button type="button" class="dev-btn dev-btn-danger" id="dev-reset-layout">Reset Layout</button>
          <p id="dev-status" class="dev-mode-hint">Saved to localStorage (<code>${DESK_LAYOUT_STORAGE_KEY}</code>).</p>
        </div>
      </div>
      <div id="dev-export-section" class="hidden">
        <p class="dev-mode-hint">Paste copied CSS into <code>src/styles.css</code> desk-layer rules, or keep localStorage overrides for playtests.</p>
        <button type="button" class="dev-btn" id="dev-copy-css-2">Copy CSS snippet</button>
        <button type="button" class="dev-btn" id="dev-copy-json-2">Copy Layout JSON</button>
      </div>
      <button type="button" class="dev-btn" id="dev-close-btn">Exit Dev Mode (\`)</button>
    `;
  }

  private nudgeRow(label: string, inputId: string, field: string): string {
    return `
      <div class="dev-row">
        <label for="${inputId}">${label}</label>
        <div class="nudge-container">
          <button type="button" class="nudge-btn" data-nudge="${field}" data-dir="-1">−</button>
          <input type="text" id="${inputId}" class="dev-input" />
          <button type="button" class="nudge-btn" data-nudge="${field}" data-dir="1">+</button>
        </div>
      </div>
    `;
  }

  private fillPicker(): void {
    this.picker.innerHTML = EDITABLE_DESK_OBJECTS.map(
      (id) => `<option value="${id}">${id}</option>`
    ).join('');
    this.picker.value = this.selected;
  }

  private bindUi(): void {
    this.el.querySelectorAll('.dev-mode-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab as 'layout' | 'export';
        this.setTab(tab);
      });
    });

    this.picker.addEventListener('change', () => {
      this.select(this.picker.value as DeskObjectId);
    });

    this.el.querySelectorAll('.nudge-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = (btn as HTMLElement).dataset.nudge as TransformField;
        const dir = Number((btn as HTMLElement).dataset.dir);
        this.nudge(field, dir);
      });
    });

    (Object.keys(this.inputs) as TransformField[]).forEach((key) => {
      this.inputs[key].addEventListener('change', () => this.commitInputs());
      this.inputs[key].addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.commitInputs();
        }
      });
    });

    this.frameZoomSlider.addEventListener('input', () => {
      this.setFrameZoom(Number(this.frameZoomSlider.value));
    });
    this.frameZoomValue.addEventListener('change', () => {
      this.setFrameZoom(this.parseNum(this.frameZoomValue.value, this.frameZoom));
    });
    this.frameZoomValue.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.setFrameZoom(this.parseNum(this.frameZoomValue.value, this.frameZoom));
      }
    });

    this.bgZoomSlider.addEventListener('input', () => {
      this.setBgZoom(Number(this.bgZoomSlider.value));
    });
    this.bgZoomValue.addEventListener('change', () => {
      this.setBgZoom(this.parseNum(this.bgZoomValue.value, this.bgZoom));
    });
    this.bgZoomValue.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.setBgZoom(this.parseNum(this.bgZoomValue.value, this.bgZoom));
      }
    });

    this.el.querySelector('#dev-save-layout')!.addEventListener('click', () => this.saveLayout());
    this.el.querySelector('#dev-copy-json')!.addEventListener('click', () => this.copyJson());
    this.el.querySelector('#dev-copy-json-2')!.addEventListener('click', () => this.copyJson());
    this.el.querySelector('#dev-copy-css')!.addEventListener('click', () => this.copyCss());
    this.el.querySelector('#dev-copy-css-2')!.addEventListener('click', () => this.copyCss());
    this.el.querySelector('#dev-reset-layout')!.addEventListener('click', () => this.resetLayout());
    this.el.querySelector('#dev-close-btn')!.addEventListener('click', () => this.hide());
  }

  private setFrameZoom(zoom: number): void {
    const clamped = Math.min(FRAME_ZOOM_MAX, Math.max(FRAME_ZOOM_MIN, zoom));
    this.frameZoom = Number(clamped.toFixed(3));
    this.frameZoomSlider.value = String(this.frameZoom);
    this.frameZoomValue.value = this.frameZoom.toFixed(2);
    this.desk.setFrameZoom(this.frameZoom);
  }

  private setBgZoom(zoom: number): void {
    const clamped = Math.min(BG_ZOOM_MAX, Math.max(BG_ZOOM_MIN, zoom));
    this.bgZoom = Number(clamped.toFixed(3));
    this.bgZoomSlider.value = String(this.bgZoom);
    this.bgZoomValue.value = this.bgZoom.toFixed(2);
    this.desk.setBgZoom(this.bgZoom);
  }

  private syncZoomUi(): void {
    this.frameZoomSlider.value = String(this.frameZoom);
    this.frameZoomValue.value = this.frameZoom.toFixed(2);
    this.bgZoomSlider.value = String(this.bgZoom);
    this.bgZoomValue.value = this.bgZoom.toFixed(2);
  }

  private toLayoutFile(): DeskLayoutFile {
    return {
      version: 2,
      frameZoom: this.frameZoom,
      bgZoom: this.bgZoom,
      objects: this.layout,
    };
  }

  private setTab(tab: 'layout' | 'export'): void {
    this.el.querySelectorAll('.dev-mode-tab').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab);
    });
    this.el.querySelector('#dev-layout-section')!.classList.toggle('hidden', tab !== 'layout');
    this.el.querySelector('#dev-export-section')!.classList.toggle('hidden', tab !== 'export');
    const badge = this.el.querySelector('#dev-mode-indicator')!;
    badge.textContent = tab === 'layout' ? 'Layout' : 'Export';
  }

  private select(id: DeskObjectId): void {
    this.selected = id;
    this.picker.value = id;
    this.selectedLabel.textContent = id;
    this.desk.highlightDevSelection(id);
    const t = this.ensureTransform(id);
    this.syncInputs(t);
  }

  private ensureTransform(id: DeskObjectId): DeskObjectTransform {
    if (!this.layout[id]) {
      this.layout[id] = this.desk.captureTransform(id);
    }
    return this.layout[id]!;
  }

  private syncInputs(t: DeskObjectTransform): void {
    this.inputs.x.value = t.x.toFixed(2);
    this.inputs.y.value = t.y.toFixed(2);
    this.inputs.w.value = String(Math.round(t.w));
    this.inputs.h.value = String(Math.round(t.h));
    this.inputs.rotateX.value = t.rotateX.toFixed(1);
    this.inputs.rotateY.value = t.rotateY.toFixed(1);
    this.inputs.rotateZ.value = t.rotateZ.toFixed(1);
    this.inputs.scale.value = t.scale.toFixed(2);
    this.inputs.zIndex.value = String(t.zIndex);
  }

  private commitInputs(): void {
    const t = this.ensureTransform(this.selected);
    t.x = this.parseNum(this.inputs.x.value, t.x);
    t.y = this.parseNum(this.inputs.y.value, t.y);
    t.w = this.parseNum(this.inputs.w.value, t.w);
    t.h = this.parseNum(this.inputs.h.value, t.h);
    t.rotateX = this.parseNum(this.inputs.rotateX.value, t.rotateX);
    t.rotateY = this.parseNum(this.inputs.rotateY.value, t.rotateY);
    t.rotateZ = this.parseNum(this.inputs.rotateZ.value, t.rotateZ);
    t.scale = this.parseNum(this.inputs.scale.value, t.scale);
    t.zIndex = Math.round(this.parseNum(this.inputs.zIndex.value, t.zIndex));
    this.applySelected();
  }

  private nudge(field: TransformField, dir: number): void {
    const t = this.ensureTransform(this.selected);
    const step =
      field === 'x' || field === 'y'
        ? STEP.pos
        : field === 'w' || field === 'h'
          ? STEP.size
          : field === 'rotateX' || field === 'rotateY' || field === 'rotateZ'
            ? STEP.rotate
            : field === 'scale'
              ? STEP.scale
              : STEP.z;
    t[field] = Number((Number(t[field]) + dir * step).toFixed(3));
    if (field === 'scale') {
      t.scale = Math.max(0.05, t.scale);
    }
    if (field === 'w' || field === 'h') {
      t[field] = Math.max(4, t[field]);
    }
    this.syncInputs(t);
    this.applySelected();
  }

  private applySelected(): void {
    const t = this.layout[this.selected];
    if (!t) {
      return;
    }
    this.desk.applyObjectTransform(this.selected, t);
  }

  private handleStageClick(e: MouseEvent): void {
    if (!this.active) {
      return;
    }
    const target = e.target as HTMLElement | null;
    const pick = target?.closest?.('[data-dev-object]') as HTMLElement | null;
    if (pick?.dataset.devObject) {
      e.preventDefault();
      e.stopPropagation();
      this.select(pick.dataset.devObject as DeskObjectId);
      return;
    }
    const layer = target?.closest?.('[data-layer]') as HTMLElement | null;
    if (layer?.dataset.layer) {
      e.preventDefault();
      e.stopPropagation();
      this.select(layer.dataset.layer as DeskObjectId);
      return;
    }
    const cluster = target?.closest?.('.desk-radio-cluster') as HTMLElement | null;
    if (cluster) {
      e.preventDefault();
      e.stopPropagation();
      this.select('radio-cluster');
    }
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.active) {
      return;
    }
    if (e.key === '`' || e.key === 'Backquote') {
      return;
    }
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.nudge('x', -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.nudge('x', 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.nudge('y', 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.nudge('y', -1);
    } else if (e.key === '[') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        this.nudge('rotateX', -1);
      } else if (e.shiftKey) {
        this.nudge('rotateY', -1);
      } else {
        this.nudge('rotateZ', -1);
      }
    } else if (e.key === ']') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        this.nudge('rotateX', 1);
      } else if (e.shiftKey) {
        this.nudge('rotateY', 1);
      } else {
        this.nudge('rotateZ', 1);
      }
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      this.nudge('scale', -1);
    } else if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      this.nudge('scale', 1);
    }
  }

  private saveLayout(): void {
    localStorage.setItem(DESK_LAYOUT_STORAGE_KEY, JSON.stringify(this.toLayoutFile(), null, 2));
    this.flash('Layout saved to localStorage.');
  }

  private async copyJson(): Promise<void> {
    const text = JSON.stringify(this.toLayoutFile(), null, 2);
    await navigator.clipboard.writeText(text);
    this.flash('Layout JSON copied.');
  }

  private async copyCss(): Promise<void> {
    const lines: string[] = [
      '/* Desk layout from Dev Mode — paste into styles.css */',
      `.desk-rig { --desk-frame-zoom: ${this.frameZoom.toFixed(3)}; }`,
      `.desk-layer--bg.desk-bg-zoomed { --desk-bg-zoom: ${this.bgZoom.toFixed(3)}; }`,
      `.desk-layer--bg.desk-bg-zoomed img { transform: scale(var(--desk-bg-zoom)); }`,
      '',
    ];
    for (const id of EDITABLE_DESK_OBJECTS) {
      const t = this.layout[id];
      if (!t) {
        continue;
      }
      const sel = this.cssSelector(id);
      lines.push(`${sel} {`);
      if (id === 'radio-cluster') {
        lines.push(`  left: ${t.x.toFixed(2)}%;`);
        lines.push(`  bottom: ${t.y.toFixed(2)}%;`);
        lines.push(`  width: ${Math.round(t.w)}px;`);
        lines.push(
          `  transform: translateX(-50%) rotateX(${t.rotateX.toFixed(1)}deg) rotateY(${t.rotateY.toFixed(1)}deg) rotateZ(${t.rotateZ.toFixed(1)}deg) scale(${t.scale.toFixed(2)});`
        );
      } else {
        lines.push(`  left: ${t.x.toFixed(2)}%;`);
        lines.push(`  bottom: ${t.y.toFixed(2)}%;`);
        lines.push(`  width: ${Math.round(t.w)}px;`);
        if (t.h > 0) {
          lines.push(`  height: ${Math.round(t.h)}px;`);
        }
        const centered = id === 'radio-overlay' || id === 'freq-display';
        lines.push(
          `  transform: ${centered ? 'translateX(-50%) ' : ''}rotateX(${t.rotateX.toFixed(1)}deg) rotateY(${t.rotateY.toFixed(1)}deg) rotateZ(${t.rotateZ.toFixed(1)}deg) scale(${t.scale.toFixed(2)});`
        );
        lines.push(`  z-index: ${t.zIndex};`);
      }
      lines.push('}');
      lines.push('');
    }
    await navigator.clipboard.writeText(lines.join('\n'));
    this.flash('CSS snippet copied.');
  }

  private cssSelector(id: DeskObjectId): string {
    if (id === 'radio-cluster') {
      return '.desk-radio-cluster';
    }
    if (id === 'radio-overlay') {
      return '.radio-overlay';
    }
    if (id === 'freq-display') {
      return '.desk-radio-cluster > .frequency-display';
    }
    if (id === 'band-dial') {
      return '.radio-knob--band-dial';
    }
    if (id === 'meter-dial') {
      return '.radio-knob--meter-dial';
    }
    if (id === 'dial-notches') {
      return '.dial-notch-ring';
    }
    if (id === 'tune-label') {
      return '.desk-dial-label';
    }
    const map: Partial<Record<DeskObjectId, string>> = {
      'bg-room': 'bg',
      'desk-surface': 'desk',
      'mic-lollipop': 'mic',
      'map-folded': 'map',
      'radio-body': 'radio-body',
      'radio-dial': 'dial',
      'meter-needle-l': 'needle-l',
      'meter-needle-r': 'needle-r',
    };
    return `.desk-layer--${map[id] ?? id}`;
  }

  private resetLayout(): void {
    if (!window.confirm('Reset to baked desk layout defaults?')) {
      return;
    }
    localStorage.removeItem(DESK_LAYOUT_STORAGE_KEY);
    this.applyFile(DEFAULT_DESK_LAYOUT);
    this.select(this.selected);
    this.flash('Layout reset to baked defaults.');
  }

  private loadStoredLayout(): void {
    try {
      const raw = localStorage.getItem(DESK_LAYOUT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        this.applyFile(normalizeLayoutFile(parsed));
        return;
      }
    } catch {
      /* fall through to baked default */
    }
    this.applyFile(DEFAULT_DESK_LAYOUT);
  }

  private applyFile(file: DeskLayoutFile): void {
    this.layout = {};
    for (const [id, t] of Object.entries(file.objects) as [DeskObjectId, DeskObjectTransform][]) {
      this.layout[id] = normalizeTransform(t);
    }
    this.frameZoom = file.frameZoom;
    this.bgZoom = file.bgZoom;
    this.desk.resetLayout();
    this.desk.applyLayout(this.layout);
    this.desk.setFrameZoom(this.frameZoom);
    this.desk.setBgZoom(this.bgZoom);
    this.syncZoomUi();
  }

  private parseNum(value: string, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private flash(msg: string): void {
    this.statusEl.textContent = msg;
  }
}
