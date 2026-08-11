import { FACTIONS } from '../data/loader';
import type { GameState } from '../game/GameState';
import type { FactionId, ResourceId } from '../types/campaign';

const RESOURCE_LABELS: Record<ResourceId, string> = {
  food: 'Food',
  batteries: 'Batteries',
  medicine: 'Medicine',
};

export class ResourceUI {
  private container: HTMLDivElement;
  private resourceEls = new Map<ResourceId, HTMLElement>();
  private factionEls = new Map<FactionId, HTMLElement>();

  constructor(private readonly state: GameState, parent: HTMLElement = document.body) {
    this.container = document.createElement('div');
    this.container.className = 'resource-display';
    this.buildResources();
    this.buildFactions();
    parent.appendChild(this.container);
    this.state.events.on('resourceUpdate', () => this.syncResources());
    this.state.events.on('factionUpdate', () => this.syncFactions());
  }

  private buildResources(): void {
    const heading = document.createElement('div');
    heading.className = 'panel-heading';
    heading.textContent = 'Supplies';
    this.container.appendChild(heading);

    for (const [key, value] of Object.entries(this.state.resources) as [ResourceId, number][]) {
      const item = document.createElement('div');
      item.className = 'resource-item';
      item.innerHTML = `
        <div class="resource-icon ${key}"></div>
        <div class="resource-name">${RESOURCE_LABELS[key]}</div>
        <div class="resource-value">${value}</div>
      `;
      this.resourceEls.set(key, item.querySelector('.resource-value')!);
      this.container.appendChild(item);
    }
  }

  private buildFactions(): void {
    const heading = document.createElement('div');
    heading.className = 'panel-heading';
    heading.textContent = 'Trust';
    this.container.appendChild(heading);

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
    for (const [key, el] of this.resourceEls) {
      el.textContent = String(this.state.resources[key]);
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
