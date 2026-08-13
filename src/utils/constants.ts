export const SAVE_SLOT_COUNT = 3;
export const SAVE_KEY_PREFIX = 'echoes_save_slot_';
/** @deprecated use slotKey(0) — kept for migration */
export const SAVE_KEY = `${SAVE_KEY_PREFIX}0`;
export const LEGACY_SAVE_KEY = 'amazonRadioMystery';
export const TOTAL_DAYS = 15;
/** Night watch begins at 18:00 local (minutes since midnight). */
export const WATCH_START_MINUTES = 18 * 60;
/** Game clock pace while a watch is active (1 real second → N game minutes). */
export const GAME_MINUTES_PER_REAL_SECOND = 1;
/** After reply beep (~0.65s) before notepad handwriting SFX / log. */
export const REPLY_HANDWRITING_DELAY_MS = 900;
/** Main dial exterior scale markings. */
export const DIAL_NOTCH_MAX = 106;
export const BAND_COUNT = 5;
export const METER_SETTINGS = ['A', 'B', 'C'] as const;
export type MeterSetting = (typeof METER_SETTINGS)[number];
export const THREAD_LABELS = { G: 'Ghost', E: 'Expedition', R: 'River', A: 'Air' } as const;

export const DAILY_RESOURCE_DRAIN: Record<string, number> = {
  food: -3,
  batteries: -2,
  medicine: -1,
};

export function slotKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}${slot}`;
}
