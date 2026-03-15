import type { SpellType } from "../model/keywords";

export interface CardPresentation {
  artSrc: string;
  artPosition: string;
  sigil: string;
  frameClass: string;
}

const TYPE_DEFAULTS: Record<SpellType, Omit<CardPresentation, "artSrc">> = {
  Summon: {
    artPosition: "center 38%",
    sigil: ":P",
    frameClass: "card-face--summon",
  },
  Incantation: {
    artPosition: "center 32%",
    sigil: ">:(",
    frameClass: "card-face--incantation",
  },
  Seal: {
    artPosition: "center 30%",
    sigil: ":D",
    frameClass: "card-face--seal",
  },
};

const OVERRIDES: Partial<Record<string, Partial<CardPresentation>>> = {
  "aether-leviathan": { artPosition: "center 20%" },
  "trap-master": { artPosition: "center 24%" },
  "cataclysmic-breakthrough": { artPosition: "center 25%" },
  "aether-flood": { artPosition: "center 18%" },
};

export const getCardPresentation = (
  spellId: string,
  type: SpellType,
): CardPresentation => {
  const base = TYPE_DEFAULTS[type];
  const override = OVERRIDES[spellId] ?? {};

  return {
    ...base,
    artSrc: `/card-art/${spellId}.jpg`,
    ...override,
  };
};
