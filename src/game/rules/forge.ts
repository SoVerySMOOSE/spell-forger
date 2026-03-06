import type { SpellId } from "../model/spell";

export interface RefillResult {
  forgeGrid: (SpellId | null)[];
  forgeDeck: SpellId[];
}

export const refillForgeGrid = (
  forgeGrid: (SpellId | null)[],
  forgeDeck: SpellId[],
): RefillResult => {
  const nextGrid = [...forgeGrid];
  const nextDeck = [...forgeDeck];

  for (let i = 0; i < nextGrid.length; i += 1) {
    if (nextGrid[i] !== null) {
      continue;
    }
    const drawn = nextDeck.shift();
    if (!drawn) {
      break;
    }
    nextGrid[i] = drawn;
  }

  return { forgeGrid: nextGrid, forgeDeck: nextDeck };
};
