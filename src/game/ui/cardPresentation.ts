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
    sigil: "S",
    frameClass: "card-face--summon",
  },
  Incantation: {
    artPosition: "center 32%",
    sigil: "I",
    frameClass: "card-face--incantation",
  },
  Seal: {
    artPosition: "center 30%",
    sigil: "Z",
    frameClass: "card-face--seal",
  },
};

const OVERRIDES: Partial<Record<string, Partial<CardPresentation>>> = {
  "leviathan-atramenti": { artPosition: "center 20%" },
  "seraph-reticuli": { artPosition: "center 24%" },
  "formula-cataclysmatis": { artPosition: "center 25%" },
  "diluvium-aetheris": { artPosition: "center 18%" },
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
