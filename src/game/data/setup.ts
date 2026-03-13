import { INCANTATIONS } from "./spells/incantations";
import { SEALS } from "./spells/seals";
import { SUMMONS } from "./spells/summons";
import type { GameState } from "../model/gameState";
import type { PlayerId } from "../model/keywords";
import type { SpellDefinition, SpellId } from "../model/spell";
import { refillForgeGrid } from "../rules/forge";

const ALL_SPELLS_LIST = [...SUMMONS, ...INCANTATIONS, ...SEALS];

export const ALL_SPELLS_BY_ID: Record<SpellId, SpellDefinition> =
  ALL_SPELLS_LIST.reduce<Record<SpellId, SpellDefinition>>((acc, spell) => {
    acc[spell.id] = spell;
    return acc;
  }, {});

export const FORGE_SINGLETON_DECK: SpellId[] = ALL_SPELLS_LIST.map(
  (spell) => spell.id,
);

const mulberry32 = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffleWithSeed = <T>(items: readonly T[], seed: number): T[] => {
  const random = mulberry32(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
};

export const toPlayerIndex = (player: PlayerId): 0 | 1 => player;

export const makeInstanceId = (index: number): string => `spell-${index}`;

export const createNewGameState = (seed: number): GameState => {
  const shuffledDeck = shuffleWithSeed(FORGE_SINGLETON_DECK, seed);
  const filledForge = refillForgeGrid(Array(9).fill(null), shuffledDeck);

  const initial: GameState = {
    cycleNumber: 1,
    activePlayer: 0,
    cores: [
      { aether: 0, stress: 0 },
      { aether: 0, stress: 0 },
    ],
    power: [0, 0],
    powerLimit: [0, 0],
    forgeDeck: filledForge.forgeDeck,
    forgeGrid: filledForge.forgeGrid,
    spent: [],
    inPlay: [],
    reserve: { player0: [], player1: [] },
    forgeSlotDiscounts: [],
    log: [],
    phase: "work",
    pendingAnnouncement: null,
    cycleFirstPlayer: 0,
    turnsInCycle: 0,
    nextInstanceNumber: 1,
    nextEventId: 1,
    seed,
    winner: null,
    loser: null,
    workUsageKeys: [],
    cycleUsageKeys: [],
    turnSpellCount: 0,
    turnIncantationCount: 0,
  };

  initial.powerLimit[0] = initial.cycleNumber;
  initial.power[0] = initial.cycleNumber;

  initial.log.push({
    id: initial.nextEventId,
    cycle: initial.cycleNumber,
    player: null,
    message: `New game seeded with ${seed}.`,
  });
  initial.nextEventId += 1;

  return initial;
};
