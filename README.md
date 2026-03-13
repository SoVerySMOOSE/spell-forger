# ARCANE FORGE (V1)

Deterministic 2-player card game prototype built with React + TypeScript + Vite.
Current card pool: 60-card singleton Forge Deck (20 Summons, 20 Incantations, 20 Seals).

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
- Standby -> Work -> Maintenance flow
- Announce / Response / Resolve lifecycle
- Jam counters and maintenance unjamming
- Scry to Reserve (persistent until played)
- Cycle progression with first-player alternation each cycle
- Objective timing:
  - Stress 10 = immediate loss
  - Aether 10 = saturation win at start of your own turn (Standby)

## Test Coverage

- Forge refill reading order
- Response Dispel canceling Incantation resolution
- Jam prevention + unjammed Incantation immediate maintenance resolution
- Reserve persistence and owner-only access
- Saturation start-of-turn win timing
- Immediate stress-loss timing
- Cycle increment and first-player alternation
