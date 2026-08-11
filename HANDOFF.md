# HANDOFF.md — Echoes of the Basin

## Context

Pass 3 engine (Vite + TS, data-driven campaign) plus **layered 2D desk stage** (Strange Horticulture mood). Three.js desk retired. Primary radio art: Hallicrafters SR-150 face illustration.

## Done

- Vite + TS campaign engine (days 1–15, switchboard choices, save/load, pause menu)
- `DeskStage` DOM layers under `public/images/desk/`
- SR-150 `radio-body.png` (Gemini illustration) as hero radio
- Vintage mic prop (`mic-lollipop.png`), desk + room plates
- Dial drag / ◀▶ tune; meter needle twitch + haze on receive
- Idle plant sway + lamp flicker

## Desk layer map

| File | Role |
|------|------|
| `bg-room.png` | Room wall / curtain atmosphere |
| `desk-surface.png` | Wood desk plate |
| `radio-body.png` | SR-150 face (primary) |
| `radio-dial.png` | Rotating tune knob overlay |
| `meter-needle-l/r.png` | Left/right meter needles |
| `mic-lollipop.png` | Vintage desk mic |
| `lamp.png` / `plant.png` / `papers.png` | Props |
| `static-haze.png` | Receive pulse overlay |

All desk layers are PNGs; SVG files remain as fallbacks only.

## Key files

| Path | Purpose |
|------|---------|
| `src/scene/DeskStage.ts` | Layered 2D stage |
| `src/ui/RadioUI.ts` | Dial interaction + choices |
| `src/game/Game.ts` | Orchestrator |
| `public/images/desk/` | Art pack |

## Next

- Cut true transparent dial/needle layers aligned to SR-150 face (current dial is SVG overlay)
- Optional: warm amber meter glow pass on radio-body
- Campbell prose polish days 4–15 story scripts

## Gotchas

- Save key: `echoes_save_slot_0`
- Required beats must be resolved before sleep
- Nano Banana quota may block regenerating cutouts — SVGs ship as fallbacks
