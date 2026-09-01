import { getDayDef, CAMPAIGN } from '../data/loader';
import type { GameState } from './GameState';
import type { FactionId, RadioStationDef, ThreadId, TransmissionDef } from '../types/campaign';
import { DAILY_RESOURCE_DRAIN } from '../utils/constants';

export type ConsequenceResult = {
  logLines: string[];
  journal?: string;
  thought?: string;
};

export class CampaignManager {
  private dayDef = getDayDef(1);

  constructor(private readonly state: GameState) {}

  loadDay(day: number): void {
    this.dayDef = getDayDef(day);
  }

  getDayDef() {
    return this.dayDef;
  }

  getTransmissionAtFrequency(frequency: number): TransmissionDef | null {
    if (this.state.resolvedFrequencies.has(frequency)) {
      return null;
    }

    const match = this.dayDef.transmissions.find(
      (t) => t.frequency === frequency && this.meetsRequirements(t.requires)
    );
    return match ?? null;
  }

  isAmbientOnly(frequency: number): boolean {
    const hasStory = this.dayDef.transmissions.some(
      (t) => t.frequency === frequency && this.meetsRequirements(t.requires)
    );
    if (hasStory) {
      return false;
    }
    return (
      this.dayDef.ambient?.some((a) => a.frequency === frequency) ?? false
    );
  }

  getRadioBed(frequency: number): RadioStationDef['bed'] | null {
    if (this.getTransmissionAtFrequency(frequency)) {
      return null;
    }
    const station = CAMPAIGN.stations?.find((s) => s.frequency === frequency);
    return station?.bed ?? null;
  }

  isDayComplete(): boolean {
    return this.dayDef.requiredBeats.every((beatId) =>
      this.state.resolvedTransmissionIds.has(beatId)
    );
  }

  failTransmission(transmission: TransmissionDef): ConsequenceResult {
    const tokens =
      transmission.on_fail ??
      ([
        `set_flag:${transmission.id}_failed`,
        `trust:${transmission.faction}:-4`,
        'log:You let the traffic die. Someone on that net will remember.',
      ] as string[]);
    const result = this.applyTokens(tokens);
    this.state.markTransmissionResolved(transmission.id, transmission.frequency);
    return result;
  }

  applyChoice(transmission: TransmissionDef, choiceId: string): ConsequenceResult {
    const choice = transmission.choices.find((c) => c.id === choiceId);
    if (!choice) {
      throw new Error(`Unknown choice ${choiceId} for ${transmission.id}`);
    }

    const result = this.applyTokens(choice.on_success);
    this.state.markTransmissionResolved(transmission.id, transmission.frequency);
    return result;
  }

  /** Apply consequence DSL tokens (radio choices, map discoveries, etc.). */
  applyTokens(tokens: string[]): ConsequenceResult {
    const result: ConsequenceResult = { logLines: [] };
    for (const token of tokens) {
      this.applyConsequence(token, result);
    }
    return result;
  }

  applyDailyDrain(): void {
    for (const [resource, delta] of Object.entries(DAILY_RESOURCE_DRAIN)) {
      this.state.adjustResource(
        resource as 'food' | 'batteries' | 'medicine',
        delta
      );
    }
  }

  getSaveData() {
    return {
      day: this.state.currentDay,
    };
  }

  loadSaveData(): void {
    this.loadDay(this.state.currentDay);
  }

  private applyConsequence(token: string, result: ConsequenceResult): void {
    if (token.startsWith('set_flag:')) {
      this.state.setFlag(token.slice('set_flag:'.length), true);
      return;
    }
    if (token.startsWith('clear_flag:')) {
      this.state.setFlag(token.slice('clear_flag:'.length), false);
      return;
    }
    if (token.startsWith('clue:')) {
      this.state.addClue(token.slice('clue:'.length));
      return;
    }
    if (token.startsWith('code:')) {
      this.state.addKnownCode(token.slice('code:'.length));
      return;
    }
    if (token.startsWith('thread:')) {
      const [, thread, depthStr] = token.split(':');
      if (thread && depthStr) {
        this.state.setThreadDepth(thread as ThreadId, Number(depthStr));
      }
      return;
    }
    if (token.startsWith('trust:')) {
      const [, faction, deltaStr] = token.split(':');
      if (faction && deltaStr) {
        this.state.adjustTrust(faction as FactionId, Number(deltaStr));
      }
      return;
    }
    if (token.startsWith('resource:')) {
      const [, resource, deltaStr] = token.split(':');
      if (resource && deltaStr) {
        this.state.adjustResource(
          resource as 'food' | 'batteries' | 'medicine',
          Number(deltaStr)
        );
      }
      return;
    }
    if (token.startsWith('log:')) {
      result.logLines.push(token.slice('log:'.length));
      return;
    }
    if (token.startsWith('journal:')) {
      result.journal = token.slice('journal:'.length);
      return;
    }
    if (token.startsWith('thought:')) {
      result.thought = token.slice('thought:'.length);
      return;
    }
  }

  private meetsRequirements(requirements: string[]): boolean {
    return requirements.every((req) => this.evaluateRequirement(req));
  }

  private evaluateRequirement(req: string): boolean {
    if (req.startsWith('flag:')) {
      return Boolean(this.state.flags[req.slice('flag:'.length)]);
    }
    if (req.startsWith('not_flag:')) {
      return !this.state.flags[req.slice('not_flag:'.length)];
    }
    if (req.startsWith('clue:')) {
      return this.state.clues.has(req.slice('clue:'.length));
    }
    if (req.startsWith('thread:')) {
      const body = req.slice('thread:'.length);
      const match = body.match(/^([GERA]):>=(\d+)$/);
      if (match) {
        const thread = match[1] as ThreadId;
        const min = Number(match[2]);
        return this.state.threadDepth[thread] >= min;
      }
    }
    if (req.startsWith('day:>=')) {
      return this.state.currentDay >= Number(req.slice('day:>='.length));
    }
    if (req.startsWith('trust:')) {
      const body = req.slice('trust:'.length);
      const match = body.match(/^([a-z]+):>=(\d+)$/);
      if (match) {
        const faction = match[1] as FactionId;
        const min = Number(match[2]);
        return this.state.factions[faction] >= min;
      }
    }
    return true;
  }
}
