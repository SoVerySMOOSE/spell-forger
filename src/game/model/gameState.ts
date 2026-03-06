import type { PlayerId, SpellType } from "./keywords";
import type { SpellId, TargetChoice } from "./spell";
import type { SpellSource } from "./zones";

export interface CoreState {
  aether: number;
  stress: number;
}

export interface InPlaySpell {
  instanceId: string;
  spellId: SpellId;
  controller: PlayerId;
  type: SpellType;
  armed?: boolean;
  jamCounters: number;
  status: "announced" | "inPlay";
}

export interface GameEvent {
  id: number;
  cycle: number;
  player: PlayerId | null;
  message: string;
}

export type Phase = "work" | "response" | "maintenance_unjam" | "gameOver";

export interface PendingAnnouncement {
  instanceId: string;
  spellId: SpellId;
  controller: PlayerId;
  source: SpellSource;
  targets: TargetChoice[];
}

export interface GameState {
  cycleNumber: number;
  activePlayer: PlayerId;
  cores: [CoreState, CoreState];
  power: [number, number];
  powerLimit: [number, number];
  forgeDeck: SpellId[];
  forgeGrid: (SpellId | null)[];
  spent: SpellId[];
  inPlay: InPlaySpell[];
  scryReveals: {
    player0: SpellId[];
    player1: SpellId[];
  };
  log: GameEvent[];

  phase: Phase;
  pendingAnnouncement: PendingAnnouncement | null;
  cycleFirstPlayer: PlayerId;
  turnsInCycle: 0 | 1;
  nextInstanceNumber: number;
  nextEventId: number;
  seed: number;
  winner: PlayerId | null;
  loser: PlayerId | null;
}
