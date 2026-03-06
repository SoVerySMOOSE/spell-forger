import type { PlayerId } from "./keywords";

export type SpellSource =
  | {
      zone: "forge";
      slotIndex: number;
    }
  | {
      zone: "scry";
      revealIndex: number;
    };

export type ScryRevealMap = {
  player0: string[];
  player1: string[];
};

export type ScryOwnerKey = keyof ScryRevealMap;

export const scryKeyForPlayer = (player: PlayerId): ScryOwnerKey => {
  return player === 0 ? "player0" : "player1";
};
