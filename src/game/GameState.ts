import { EventBus } from '../utils/EventBus';
import { CAMPAIGN } from '../data/loader';
import type { FactionId, ResourceId, ThreadId } from '../types/campaign';
import {
  BAND_COUNT,
  METER_SETTINGS,
  WATCH_START_MINUTES,
  type MeterSetting,
} from '../utils/constants';

export interface GameStateEvents {
  flagChanged: [string, boolean];
  dayAdvanced: [number];
  gameOver: [string];
  campaignComplete: [];
  resourceUpdate: [ResourceId, number, number];
  factionUpdate: [FactionId, number, number];
  clueAdded: [string];
  threadUpdate: [ThreadId, number];
  logMessage: [string, string];
  watchTimeChanged: [number];
  [key: string]: unknown[];
}

export class GameState {
  readonly events = new EventBus<GameStateEvents>();

  currentDay = 1;
  flags: Record<string, boolean> = {};
  clues = new Set<string>();
  /** Map landmark ids the boat has already surveyed. */
  discoveredLandmarks = new Set<string>();
  threadDepth: Record<ThreadId, number> = { G: 0, E: 0, R: 0, A: 0 };
  resolvedTransmissionIds = new Set<string>();
  resolvedFrequencies = new Set<number>();
  resources = { ...CAMPAIGN.resources };
  factions: Record<FactionId, number> = {
    military: 50,
    river: 50,
    expedition: 50,
    guerrilla: 50,
    desk: 50,
  };
  currentFrequencyIndex = 0;
  /** Band selector 1–5 (stored as 1-based). */
  band = 1;
  /** Meter selector A / B / C. */
  meter: MeterSetting = 'A';
  /** Main radio power switch. */
  radioOn = false;
  /** Minutes since midnight — local watch time for the wall clock / sched. */
  watchMinutes = WATCH_START_MINUTES;
  campaignComplete = false;
  /** Player + system field-note lines (restored into the notepad). */
  fieldNotes: {
    message: string;
    type: string;
    stamp: string;
    journalTitle?: string;
    journalBody?: string;
  }[] = [];

  get currentFrequency(): number {
    return CAMPAIGN.frequencies[this.currentFrequencyIndex] ?? CAMPAIGN.frequencies[0];
  }

  resetForNewGame(): void {
    this.currentDay = 1;
    this.flags = {};
    this.clues = new Set();
    this.discoveredLandmarks = new Set();
    this.threadDepth = { G: 0, E: 0, R: 0, A: 0 };
    this.resolvedTransmissionIds = new Set();
    this.resolvedFrequencies = new Set();
    this.resources = { ...CAMPAIGN.resources };
    this.factions = {
      military: 50,
      river: 50,
      expedition: 50,
      guerrilla: 50,
      desk: 50,
    };
    this.currentFrequencyIndex = 0;
    this.band = 1;
    this.meter = 'A';
    this.radioOn = false;
    this.watchMinutes = WATCH_START_MINUTES;
    this.campaignComplete = false;
    this.fieldNotes = [];
  }

  /** Hour 0–23 and minute 0–59 for the current watch clock. */
  getWatchClock(): { hour: number; minute: number } {
    const mins = ((this.watchMinutes % 1440) + 1440) % 1440;
    return { hour: Math.floor(mins / 60), minute: mins % 60 };
  }

  /** Advance watch time by fractional game minutes. */
  advanceWatchMinutes(delta: number): void {
    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }
    const prevMin = Math.floor(this.watchMinutes);
    this.watchMinutes = (((this.watchMinutes + delta) % 1440) + 1440) % 1440;
    if (Math.floor(this.watchMinutes) !== prevMin) {
      this.events.emit('watchTimeChanged', this.watchMinutes);
    }
  }

  setWatchMinutes(minutes: number): void {
    this.watchMinutes = (((minutes % 1440) + 1440) % 1440);
    this.events.emit('watchTimeChanged', this.watchMinutes);
  }

  resetWatchForNight(): void {
    this.setWatchMinutes(WATCH_START_MINUTES);
  }

  setFlag(name: string, value = true): void {
    this.flags[name] = value;
    this.events.emit('flagChanged', name, value);
  }

  addClue(clue: string): void {
    if (!this.clues.has(clue)) {
      this.clues.add(clue);
      this.events.emit('clueAdded', clue);
    }
  }

  markLandmarkDiscovered(landmarkId: string): void {
    this.discoveredLandmarks.add(landmarkId);
  }

  hasDiscoveredLandmark(landmarkId: string): boolean {
    return this.discoveredLandmarks.has(landmarkId);
  }

  setThreadDepth(thread: ThreadId, depth: number): void {
    const next = Math.max(this.threadDepth[thread], depth);
    if (next !== this.threadDepth[thread]) {
      this.threadDepth[thread] = next;
      this.events.emit('threadUpdate', thread, next);
    }
  }

  adjustResource(resource: ResourceId, delta: number): void {
    this.resources[resource] = Math.max(0, this.resources[resource] + delta);
    this.events.emit('resourceUpdate', resource, delta, this.resources[resource]);
    this.checkResourceGameOver();
  }

  adjustTrust(faction: FactionId, delta: number): void {
    const next = Math.min(100, Math.max(0, this.factions[faction] + delta));
    this.factions[faction] = next;
    this.events.emit('factionUpdate', faction, delta, next);
  }

  markTransmissionResolved(id: string, frequency: number): void {
    this.resolvedTransmissionIds.add(id);
    this.resolvedFrequencies.add(frequency);
  }

  tune(delta: number): void {
    const len = CAMPAIGN.frequencies.length;
    this.currentFrequencyIndex = (this.currentFrequencyIndex + delta + len) % len;
  }

  /** Cycle band 1–5. Returns the new band. */
  setBandDelta(delta: number): number {
    const idx = ((this.band - 1 + delta) % BAND_COUNT + BAND_COUNT) % BAND_COUNT;
    this.band = idx + 1;
    return this.band;
  }

  setBand(band: number): void {
    const clamped = Math.min(BAND_COUNT, Math.max(1, Math.round(band)));
    this.band = clamped;
  }

  /** Cycle meter A→B→C. Returns the new setting. */
  setMeterDelta(delta: number): MeterSetting {
    const cur = METER_SETTINGS.indexOf(this.meter);
    const idx = ((cur < 0 ? 0 : cur) + delta) % METER_SETTINGS.length;
    const next = (idx + METER_SETTINGS.length) % METER_SETTINGS.length;
    this.meter = METER_SETTINGS[next]!;
    return this.meter;
  }

  setMeter(meter: MeterSetting): void {
    if ((METER_SETTINGS as readonly string[]).includes(meter)) {
      this.meter = meter;
    }
  }

  /** Toggle or set radio power. Returns the new on-state. */
  setRadioOn(on: boolean): boolean {
    this.radioOn = on;
    return this.radioOn;
  }

  toggleRadioPower(): boolean {
    this.radioOn = !this.radioOn;
    return this.radioOn;
  }

  advanceDay(): void {
    this.currentDay += 1;
    this.resolvedFrequencies.clear();
    this.resetWatchForNight();
    this.events.emit('dayAdvanced', this.currentDay);
  }

  getDominantFaction(): FactionId {
    const entries = Object.entries(this.factions) as [FactionId, number][];
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries[0]?.[0];
    if (top === 'desk') {
      return entries[1]?.[0] ?? 'military';
    }
    return top ?? 'military';
  }

  private checkResourceGameOver(): void {
    if (
      this.resources.food <= 0 ||
      this.resources.batteries <= 0 ||
      this.resources.medicine <= 0
    ) {
      this.events.emit('gameOver', 'Supplies exhausted. The outpost goes dark.');
    }
  }

  getSaveData() {
    return {
      currentDay: this.currentDay,
      flags: { ...this.flags },
      clues: [...this.clues],
      discoveredLandmarks: [...this.discoveredLandmarks],
      threadDepth: { ...this.threadDepth },
      resolvedTransmissionIds: [...this.resolvedTransmissionIds],
      resolvedFrequencies: [...this.resolvedFrequencies],
      resources: { ...this.resources },
      factions: { ...this.factions },
      currentFrequencyIndex: this.currentFrequencyIndex,
      band: this.band,
      meter: this.meter,
      radioOn: this.radioOn,
      watchMinutes: this.watchMinutes,
      campaignComplete: this.campaignComplete,
      fieldNotes: this.fieldNotes.map((n) => ({ ...n })),
    };
  }

  loadSaveData(
    data: ReturnType<GameState['getSaveData']> & {
      discoveredLandmarks?: string[];
      radioOn?: boolean;
      watchMinutes?: number;
      fieldNotes?: {
        message: string;
        type: string;
        stamp: string;
        journalTitle?: string;
        journalBody?: string;
      }[];
    }
  ): void {
    this.currentDay = data.currentDay;
    this.flags = { ...data.flags };
    this.clues = new Set(data.clues);
    this.discoveredLandmarks = new Set(data.discoveredLandmarks ?? []);
    this.threadDepth = { ...data.threadDepth };
    this.resolvedTransmissionIds = new Set(data.resolvedTransmissionIds);
    this.resolvedFrequencies = new Set(data.resolvedFrequencies);
    this.resources = { ...data.resources };
    this.factions = { ...data.factions };
    this.currentFrequencyIndex = data.currentFrequencyIndex;
    this.setBand(typeof data.band === 'number' ? data.band : 1);
    this.setMeter(
      (METER_SETTINGS as readonly string[]).includes(data.meter ?? '')
        ? (data.meter as MeterSetting)
        : 'A'
    );
    this.radioOn = data.radioOn !== false;
    this.watchMinutes =
      typeof data.watchMinutes === 'number' && Number.isFinite(data.watchMinutes)
        ? ((data.watchMinutes % 1440) + 1440) % 1440
        : WATCH_START_MINUTES;
    this.campaignComplete = data.campaignComplete;
    this.fieldNotes = Array.isArray(data.fieldNotes)
      ? data.fieldNotes
          .filter(
            (n) =>
              n &&
              typeof n.message === 'string' &&
              typeof n.type === 'string' &&
              typeof n.stamp === 'string' &&
              n.type !== 'thought' &&
              !n.message.startsWith('Thought: ')
          )
          .map((n) => ({
            message: n.message,
            type: n.type,
            stamp: n.stamp,
            ...(typeof n.journalTitle === 'string' ? { journalTitle: n.journalTitle } : {}),
            ...(typeof n.journalBody === 'string' ? { journalBody: n.journalBody } : {}),
          }))
      : [];
  }
}
