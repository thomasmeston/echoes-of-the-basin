# Echoes of the Basin

A web-based moral switchboard game: tune a military radio, relay or bury basin traffic, and piece together why the prior operator vanished.

**Play:** [https://thomasmeston.github.io/echoes-of-the-basin/](https://thomasmeston.github.io/echoes-of-the-basin/)

## Development

```bash
npm install
npm run dev          # Vite dev server — http://localhost:5173
npm run build        # tsc + production build → dist/
npm run preview      # serve dist/
npm run test:e2e     # Playwright smoke (optional)
```

## Stack

- Vite 6 + TypeScript
- Data-driven campaign in `data/days/` + `data/story/days/`
- Three.js desk backdrop (non-interactive)

## Agent handoff

Read `CURRENT_TASK.md` → `HANDOFF.md` → `AGENTS.md` before coding.

## Narrative

Design bible: [`docs/story/story.md`](docs/story/story.md)
