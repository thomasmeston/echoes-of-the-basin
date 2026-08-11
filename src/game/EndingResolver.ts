import { ENDINGS } from '../data/loader';
import type { GameState } from './GameState';
import type { EndingDef, FactionId } from '../types/campaign';

export function resolveEnding(state: GameState): EndingDef {
  const dominant = state.getDominantFaction();

  for (const ending of ENDINGS) {
    if (ending.id === 'survived') {
      continue;
    }
    if (matchesEnding(ending, state, dominant)) {
      return ending;
    }
  }

  return ENDINGS.find((e) => e.id === 'survived') ?? ENDINGS[0];
}

function matchesEnding(
  ending: EndingDef,
  state: GameState,
  dominant: FactionId
): boolean {
  return ending.requires.every((req) => {
    if (req.startsWith('thread:')) {
      const match = req.match(/^thread:([GERA]):>=(\d+)$/);
      if (match) {
        const thread = match[1] as 'G' | 'E' | 'R' | 'A';
        return state.threadDepth[thread] >= Number(match[2]);
      }
    }
    if (req.startsWith('dominant:')) {
      return dominant === req.slice('dominant:'.length);
    }
    if (req.startsWith('flag:')) {
      return Boolean(state.flags[req.slice('flag:'.length)]);
    }
    return true;
  });
}
