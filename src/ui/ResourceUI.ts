import { FACTIONS } from '../data/loader';
import type { GameState } from '../game/GameState';
import type { FactionId, ResourceId } from '../types/campaign';

const RESOURCE_LABELS: Record<ResourceId, string> = {
  food: 'Food',
  batteries: 'Batteries',
  medicine: 'Medicine',
};

export type ResourceSection = 'supplies' | 'trust';

export class ResourceUI {
  private container: HTMLDivElement;
  private resourceEls = new Map<ResourceId, HTMLElement>();
  private factionEls = new Map<FactionId, HTMLElement>();
  private readonly showHeadings: boolean;

  constructor(
    private readonly state: GameState,
    parent: HTMLElement = document.body,
    variant: 'panel' | 'notes' = 'panel',
    sections: ResourceSection[] = ['supplies', 'trust']
  ) {
    this.showHeadings = variant === 'panel' || sections.length > 1;
    this.container = document.createElement('div');
    const page = variant === 'notes' && sections.length === 1;
    this.container.className = [
      'resource-display',
      variant === 'notes' ? 'resource-display--notes' : '',
      page ? 'resource-display--page' : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (sections.includes('supplies')) {
      this.buildResources();
    }
    if (sections.includes('trust')) {
      this.buildFactions();
    }
    parent.appendChild(this.container);
    this.state.events.on('resourceUpdate', () => this.syncResources());
    this.state.events.on('factionUpdate', () => this.syncFactions());
  }

  private buildResources(): void {
    if (this.showHeadings) {
      const heading = document.createElement('div');
      heading.className = 'panel-heading';
      heading.textContent = 'Supplies';
      this.container.appendChild(heading);
    }

    for (const [key, value] of Object.entries(this.state.resources) as [ResourceId, number][]) {
      const item = document.createElement('div');
      item.className = 'resource-item';
      item.innerHTML = `
        <div class="resource-name">${RESOURCE_LABELS[key]}</div>
        <div class="resource-bar resource-bar--${key}" title="${RESOURCE_LABELS[key]}: ${value}">
          <div class="resource-fill" style="width:${Math.min(100, Math.max(0, value))}%"></div>
        </div>
      `;
      this.resourceEls.set(key, item);
      this.container.appendChild(item);
    }
  }

  private buildFactions(): void {
    if (this.showHeadings) {
      const heading = document.createElement('div');
      heading.className = 'panel-heading';
      heading.textContent = 'Trust';
      this.container.appendChild(heading);
    }

    for (const [key, def] of Object.entries(FACTIONS)) {
      if (key === 'desk') {
        continue;
      }
      const faction = key as FactionId;
      const item = document.createElement('div');
      item.className = 'faction-item';
      item.innerHTML = `
        <div class="faction-name">${def.label}</div>
        <div class="faction-bar"><div class="faction-fill"></div></div>
        <div class="faction-value">${this.state.factions[faction]}</div>
      `;
      this.factionEls.set(faction, item);
      this.container.appendChild(item);
    }
    this.syncFactions();
  }

  private syncResources(): void {
    for (const [key, item] of this.resourceEls) {
      const value = this.state.resources[key];
      const fill = item.querySelector('.resource-fill') as HTMLElement | null;
      const bar = item.querySelector('.resource-bar') as HTMLElement | null;
      if (fill) {
        fill.style.width = `${Math.min(100, Math.max(0, value))}%`;
      }
      if (bar) {
        bar.title = `${RESOURCE_LABELS[key]}: ${value}`;
      }
    }
  }

  private syncFactions(): void {
    for (const [key, item] of this.factionEls) {
      const value = this.state.factions[key];
      const fill = item.querySelector('.faction-fill') as HTMLElement;
      const label = item.querySelector('.faction-value') as HTMLElement;
      fill.style.width = `${value}%`;
      label.textContent = String(value);
    }
  }
}
