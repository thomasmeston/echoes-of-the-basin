# AGENTS.md — Echoes of the Basin

Harness-neutral conventions for coding agents.

## Read first

1. `CURRENT_TASK.md`
2. `HANDOFF.md`
3. `docs/story/story.md` — narrative bible
4. `data/days/` + `data/story/days/` — runtime campaign
5. `src/game/Game.ts` — orchestrator

## Commands

```bash
npm install
npm run dev       # Vite dev server :5173
npm run build     # tsc + vite build → dist/
npm run preview   # serve dist/
npm run test:e2e  # Playwright smoke (optional)
```

## Verification profile

| Check | When |
|-------|------|
| `npm run build` | Any TS/game/data change |
| `npm run dev` + tune/respond/sleep Day 1 | Gameplay/UI |
| Save refresh smoke | SaveLoad changes |
| Pages deploy on push to `main` | Deploy changes |

**Rule:** Don't claim feel from build alone — browser play-through is the gate.

## Architecture

- **Data:** `data/campaign.json`, `data/factions.json`, `data/days/NN.json`, `data/story/days/NN-script.json`, `data/endings.json`
- **Engine:** `src/game/` — GameState, CampaignManager (consequence DSL), NarrativeManager, SaveLoad, Game
- **UI:** `src/ui/` — RadioUI, NotepadUI, CalendarUI, ResourceUI
- **Scene:** `src/scene/DeskStage.ts` — layered 2D desk (SR-150 radio + mic)
- **Assets:** `public/audio/`, `public/images/desk/`

## Conventions

- Content changes → edit JSON under `data/`, not hardcoded strings in TS
- Minimize diff; match existing patterns
- Only commit when Thomas explicitly asks
- `base: './'` for GitHub Pages; use `publicUrl()` for asset paths
- Dev Mode: press `` ` `` (or Pause → Toggle Dev Mode) for layout nudges; localStorage key `echoes_desk_layout_v3`
