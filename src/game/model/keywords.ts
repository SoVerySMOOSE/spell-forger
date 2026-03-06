export type PlayerId = 0 | 1;

export const PLAYER_IDS: readonly PlayerId[] = [0, 1] as const;

export type SpellType = "Summon" | "Incantation" | "Seal";
export type PlayVerb = "Conjure" | "Speak" | "Prepare";

export const PLAY_VERB_BY_TYPE: Record<SpellType, PlayVerb> = {
  Summon: "Conjure",
  Incantation: "Speak",
  Seal: "Prepare",
};

export const otherPlayer = (player: PlayerId): PlayerId => {
  return player === 0 ? 1 : 0;
};
