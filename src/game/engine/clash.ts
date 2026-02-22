import type { CraftedCard } from "../types/cards";

export interface ClashResult {
  attacker: CraftedCard | null;
  defender: CraftedCard | null;
  log: string[];
}

export function resolveClash(
  attacker: CraftedCard,
  defender: CraftedCard,
): ClashResult {
  const a = attacker.currentMight ?? 0;
  const d = defender.currentMight ?? 0;

  if (a <= 0 || d <= 0) {
    return {
      attacker,
      defender,
      log: ["Invalid clash: a summon has 0 Might."],
    };
  }

  if (a === d) {
    return {
      attacker: null,
      defender: null,
      log: [`Clash! ${attacker.name} and ${defender.name} are both Dispelled.`],
    };
  }

  if (a > d) {
    return {
      attacker: { ...attacker, currentMight: a - d },
      defender: null,
      log: [
        `Clash! ${attacker.name} Dispelled ${defender.name} and remains at ${a - d} Might.`,
      ],
    };
  }

  return {
    attacker: null,
    defender: { ...defender, currentMight: d - a },
    log: [
      `Clash! ${defender.name} Dispelled ${attacker.name} and remains at ${d - a} Might.`,
    ],
  };
}
