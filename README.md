# ARCANE FORGE (V1)

Deterministic 2-player card game prototype built with React + TypeScript + Vite.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

## Build

```bash
npm run build
```

## Project Structure

- `src/game/model`: core types (`GameState`, spell model, zones, keywords)
- `src/game/data`: 12-card singleton set + seeded new-game setup
- `src/game/rules`: pure reducer and rule modules (forge, jam, timing, resolution)
- `src/game/state`: selectors + reducer hook store
- `src/game/ui`: board UI (thin dispatch-only layer)

## Implemented Rule Loop

- Shared singleton Forge Deck, shared Spent pile
- Shared face-up 3x3 Forge grid
- Work -> Response -> Maintenance flow
- Announce / Response / Resolve lifecycle
- Jam counters and maintenance unjamming
- Scry reveal zone with maintenance cleanup
- Cycle progression with first-player alternation each cycle
- Win/lose check order: Stress first, then Aether

## Test Coverage

- Forge refill reading order
- Response Dispel canceling Incantation resolution
- Jam prevention + unjammed Incantation immediate maintenance resolution
- Scry reveal cleanup timing
- Cycle increment and first-player alternation
