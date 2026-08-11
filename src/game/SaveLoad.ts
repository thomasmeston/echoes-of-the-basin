import { LEGACY_SAVE_KEY, SAVE_SLOT_COUNT, slotKey } from '../utils/constants';
import type { SaveDataV1 } from '../types/campaign';
import type { GameState } from './GameState';
import type { NarrativeManager } from './NarrativeManager';
import type { CampaignManager } from './CampaignManager';

export interface SaveSlotInfo {
  slot: number;
  empty: boolean;
  currentDay?: number;
  timestamp?: number;
  label: string;
}

export class SaveLoad {
  private activeSlot = 0;

  getActiveSlot(): number {
    return this.activeSlot;
  }

  setActiveSlot(slot: number): void {
    this.activeSlot = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, slot));
  }

  listSlots(): SaveSlotInfo[] {
    this.clearLegacySave();
    const slots: SaveSlotInfo[] = [];
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      slots.push(this.peekSlot(i));
    }
    return slots;
  }

  peekSlot(slot: number): SaveSlotInfo {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) {
      return { slot, empty: true, label: 'Empty' };
    }
    try {
      const data = JSON.parse(raw) as SaveDataV1;
      if (data.version !== 1) {
        return { slot, empty: true, label: 'Empty' };
      }
      const day = data.currentDay ?? 1;
      const when = data.timestamp
        ? new Date(data.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : '';
      return {
        slot,
        empty: false,
        currentDay: day,
        timestamp: data.timestamp,
        label: when ? `Night ${day} · ${when}` : `Night ${day}`,
      };
    } catch {
      return { slot, empty: true, label: 'Empty' };
    }
  }

  save(
    state: GameState,
    narrative: NarrativeManager,
    campaign: CampaignManager,
    slot = this.activeSlot
  ): void {
    const payload: SaveDataV1 = {
      version: 1,
      currentDay: state.currentDay,
      gameState: state.getSaveData(),
      narrative: narrative.getSaveData(),
      campaign: campaign.getSaveData(),
      timestamp: Date.now(),
    };
    localStorage.setItem(slotKey(slot), JSON.stringify(payload));
  }

  load(
    state: GameState,
    narrative: NarrativeManager,
    campaign: CampaignManager,
    slot = this.activeSlot
  ): boolean {
    this.clearLegacySave();
    this.activeSlot = slot;
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) {
      return false;
    }
    try {
      const data = JSON.parse(raw) as SaveDataV1;
      if (data.version !== 1) {
        return false;
      }
      state.loadSaveData(data.gameState);
      narrative.loadSaveData(data.narrative);
      campaign.loadSaveData();
      campaign.loadDay(state.currentDay);
      narrative.loadDay(state.currentDay);
      return true;
    } catch {
      localStorage.removeItem(slotKey(slot));
      return false;
    }
  }

  clear(slot = this.activeSlot): void {
    localStorage.removeItem(slotKey(slot));
  }

  private clearLegacySave(): void {
    if (localStorage.getItem(LEGACY_SAVE_KEY)) {
      localStorage.removeItem(LEGACY_SAVE_KEY);
    }
  }
}
