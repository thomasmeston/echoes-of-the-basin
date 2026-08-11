import { getDayScript } from '../data/loader';
import { EventBus } from '../utils/EventBus';
import type { GameState } from './GameState';
import type { JournalEntry } from '../types/campaign';

export interface NarrativeEvents {
  journalUpdated: [string, JournalEntry];
  thoughtShown: [string, string];
  openingLog: [string];
  [key: string]: unknown[];
}

export class NarrativeManager {
  readonly events = new EventBus<NarrativeEvents>();

  private day = 1;
  private journalEntries: Record<string, JournalEntry> = {};
  private heardThoughts = new Set<string>();
  private triggeredFlags = new Set<string>();
  private openingShown = false;

  constructor(private readonly state: GameState) {
    this.state.events.on('flagChanged', (flag) => this.onFlag(flag));
  }

  loadDay(day: number): void {
    this.day = day;
    this.openingShown = false;
  }

  showOpeningIfNeeded(): void {
    if (this.openingShown) {
      return;
    }
    const script = getDayScript(this.day);
    this.events.emit('openingLog', script.opening_log);
    this.openingShown = true;
  }

  showDayClose(): string | undefined {
    return getDayScript(this.day).day_close;
  }

  onFlag(flag: string): void {
    if (this.triggeredFlags.has(flag)) {
      return;
    }
    const script = getDayScript(this.day);
    const reaction = script.on_flag?.[flag];
    if (!reaction) {
      return;
    }
    this.triggeredFlags.add(flag);
    if (reaction.journal) {
      this.addJournal(reaction.journal);
    }
    if (reaction.thought) {
      this.showThought(reaction.thought);
    }
  }

  addJournal(id: string): void {
    const script = getDayScript(this.day);
    const allEntries = script.journal_entries ?? {};
    const entry = allEntries[id];
    if (!entry || this.journalEntries[id]) {
      return;
    }
    this.journalEntries[id] = entry;
    this.events.emit('journalUpdated', id, entry);
    if (entry.thought) {
      this.showThought(entry.thought);
    }
  }

  showThought(id: string): void {
    if (this.heardThoughts.has(id)) {
      return;
    }
    const script = getDayScript(this.day);
    const text = script.thoughts?.[id];
    if (!text) {
      return;
    }
    this.heardThoughts.add(id);
    this.events.emit('thoughtShown', id, text);
  }

  getJournalEntries(): Record<string, JournalEntry> {
    return { ...this.journalEntries };
  }

  getSaveData() {
    return {
      day: this.day,
      journalEntries: { ...this.journalEntries },
      heardThoughts: [...this.heardThoughts],
      triggeredFlags: [...this.triggeredFlags],
      openingShown: this.openingShown,
    };
  }

  loadSaveData(data: ReturnType<NarrativeManager['getSaveData']>): void {
    this.day = data.day;
    this.journalEntries = { ...data.journalEntries };
    this.heardThoughts = new Set(data.heardThoughts);
    this.triggeredFlags = new Set(data.triggeredFlags);
    this.openingShown = data.openingShown;
  }
}
