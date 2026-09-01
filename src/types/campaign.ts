export type ThreadId = 'G' | 'E' | 'R' | 'A';

export type FactionId = 'military' | 'river' | 'expedition' | 'guerrilla' | 'desk';

export type ResourceId = 'food' | 'batteries' | 'medicine';

export interface RadioStationDef {
  frequency: number;
  /** Looping radio program layered over static. */
  bed: 'opera';
}

export interface CampaignMeta {
  startDate: string;
  totalDays: number;
  frequencies: number[];
  resources: Record<ResourceId, number>;
  outpostName: string;
  missingOperator: string;
  stations?: RadioStationDef[];
}

export interface FactionDef {
  label: string;
  voice: string;
}

export type PrecedenceId = 'ROUTINE' | 'PRIORITY' | 'IMMEDIATE' | 'FLASH';

export interface ChoiceDef {
  id: string;
  text: string;
  on_success: string[];
}

export interface CallSignDef {
  challenge: string;
  answer: string;
  clueHint?: string;
}

export interface TransmissionDef {
  id: string;
  frequency: number;
  thread: ThreadId | 'meta';
  sender: string;
  message: string;
  faction: FactionId;
  requires: string[];
  choices: ChoiceDef[];
  precedence?: PrecedenceId;
  originator?: string;
  addressee?: string;
  /** Space-separated numbers; decode with that night's pad before choices. */
  cipher?: string;
  decoderDay?: number;
  callSign?: CallSignDef;
  /** Tokens if the player skips/fails decode or call-sign. */
  on_fail?: string[];
}

export interface DecoderPage {
  day: number;
  title: string;
  legend: string;
  map: Record<string, string>;
}

export interface ClueDef {
  title: string;
  body: string;
}

export interface AmbientDef {
  frequency: number;
  type: 'static_only';
}

export interface DayDef {
  day: number;
  meta?: { supplyEvent?: string };
  requiredBeats: string[];
  transmissions: TransmissionDef[];
  ambient?: AmbientDef[];
}

export interface JournalEntry {
  title: string;
  body: string;
  thought?: string;
}

export interface DayScriptDef {
  opening_log: string;
  on_flag?: Record<string, { thought?: string; journal?: string }>;
  thoughts?: Record<string, string>;
  journal_entries?: Record<string, JournalEntry>;
  day_close?: string;
}

export interface EndingDef {
  id: string;
  requires: string[];
  title: string;
  body: string;
}

export interface SaveDataV1 {
  version: 1;
  currentDay: number;
  gameState: ReturnType<import('../game/GameState').GameState['getSaveData']>;
  narrative: ReturnType<import('../game/NarrativeManager').NarrativeManager['getSaveData']>;
  campaign: ReturnType<import('../game/CampaignManager').CampaignManager['getSaveData']>;
  timestamp: number;
}

declare global {
  interface Window {
    game?: import('../game/Game').Game;
  }
}
