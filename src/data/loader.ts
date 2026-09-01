import campaignMeta from '../../data/campaign.json';
import factionsData from '../../data/factions.json';
import endingsData from '../../data/endings.json';
import mapRegionsData from '../../data/map-regions.json';
import decodersData from '../../data/decoders.json';
import cluesData from '../../data/clues.json';
import day01 from '../../data/days/01.json';
import day02 from '../../data/days/02.json';
import day03 from '../../data/days/03.json';
import day04 from '../../data/days/04.json';
import day05 from '../../data/days/05.json';
import day06 from '../../data/days/06.json';
import day07 from '../../data/days/07.json';
import day08 from '../../data/days/08.json';
import day09 from '../../data/days/09.json';
import day10 from '../../data/days/10.json';
import day11 from '../../data/days/11.json';
import day12 from '../../data/days/12.json';
import day13 from '../../data/days/13.json';
import day14 from '../../data/days/14.json';
import day15 from '../../data/days/15.json';
import script01 from '../../data/story/days/01-script.json';
import script02 from '../../data/story/days/02-script.json';
import script03 from '../../data/story/days/03-script.json';
import script04 from '../../data/story/days/04-script.json';
import script05 from '../../data/story/days/05-script.json';
import script06 from '../../data/story/days/06-script.json';
import script07 from '../../data/story/days/07-script.json';
import script08 from '../../data/story/days/08-script.json';
import script09 from '../../data/story/days/09-script.json';
import script10 from '../../data/story/days/10-script.json';
import script11 from '../../data/story/days/11-script.json';
import script12 from '../../data/story/days/12-script.json';
import script13 from '../../data/story/days/13-script.json';
import script14 from '../../data/story/days/14-script.json';
import script15 from '../../data/story/days/15-script.json';
import type {
  CampaignMeta,
  ClueDef,
  DayDef,
  DayScriptDef,
  DecoderPage,
  EndingDef,
  FactionDef,
} from '../types/campaign';
import type { MapRegionDef, MapRegionsFile } from '../types/mapRegions';

export const CAMPAIGN = campaignMeta as CampaignMeta;
export const FACTIONS = factionsData as Record<string, FactionDef>;
export const ENDINGS = (endingsData as { endings: EndingDef[] }).endings;
export const MAP_REGIONS = mapRegionsData as MapRegionsFile;
export const DECODERS = decodersData as Record<string, DecoderPage>;
export const DECODER_NIGHTS = 15;
export const CLUES = cluesData as Record<string, ClueDef>;

export function getDecoderPage(day: number): DecoderPage {
  const n = Math.min(DECODER_NIGHTS, Math.max(1, Math.round(day)));
  return DECODERS[String(n)] ?? DECODERS['1']!;
}

export function getClueDef(id: string): ClueDef {
  return CLUES[id] ?? { title: id, body: 'Noted in the book.' };
}

export function getMapRegionAt(col: number, row: number): MapRegionDef | null {
  return MAP_REGIONS.regions.find((r) => r.col === col && r.row === row) ?? null;
}

export function getMapLandmark(landmarkId: string) {
  for (const region of MAP_REGIONS.regions) {
    const landmark = region.landmarks.find((l) => l.id === landmarkId);
    if (landmark) {
      return { region, landmark };
    }
  }
  return null;
}

export const DAYS: Record<number, DayDef> = {
  1: day01 as DayDef,
  2: day02 as DayDef,
  3: day03 as DayDef,
  4: day04 as DayDef,
  5: day05 as DayDef,
  6: day06 as DayDef,
  7: day07 as DayDef,
  8: day08 as DayDef,
  9: day09 as DayDef,
  10: day10 as DayDef,
  11: day11 as DayDef,
  12: day12 as DayDef,
  13: day13 as DayDef,
  14: day14 as DayDef,
  15: day15 as DayDef,
};

export const DAY_SCRIPTS: Record<number, DayScriptDef> = {
  1: script01 as DayScriptDef,
  2: script02 as DayScriptDef,
  3: script03 as DayScriptDef,
  4: script04 as DayScriptDef,
  5: script05 as DayScriptDef,
  6: script06 as DayScriptDef,
  7: script07 as DayScriptDef,
  8: script08 as DayScriptDef,
  9: script09 as DayScriptDef,
  10: script10 as DayScriptDef,
  11: script11 as DayScriptDef,
  12: script12 as DayScriptDef,
  13: script13 as DayScriptDef,
  14: script14 as DayScriptDef,
  15: script15 as DayScriptDef,
};

export function getDayDef(day: number): DayDef {
  const def = DAYS[day];
  if (!def) {
    throw new Error(`Missing day definition for day ${day}`);
  }
  return def;
}

export function getDayScript(day: number): DayScriptDef {
  return DAY_SCRIPTS[day] ?? { opening_log: `Night ${day}.` };
}
