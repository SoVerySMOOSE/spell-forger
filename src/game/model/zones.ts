import type { PlayerId } from "./keywords";

export type SpellSource =
  | {
      zone: "forge";
      slotIndex: number;
    }
  | {
      zone: "reserve";
      reserveIndex: number;
    };

export type ReserveMap = {
  player0: string[];
  player1: string[];
};

export type ReserveKey = keyof ReserveMap;

export const reserveKeyForPlayer = (player: PlayerId): ReserveKey => {
  return player === 0 ? "player0" : "player1";
};
