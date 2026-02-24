import { materialSchema } from "./schemas";
import type { MaterialComponent } from "../types/cards";

const rawMaterials: MaterialComponent[] = [
  {
    id: "material-blazing",
    kind: "Material",
    name: "Blazing",
    path: "Ash",
    cost: 1,
    compatibility: "Instant",
    resultText: "Deal 1 damage. Deal 1 damage at the start of your next turn.",
    effect: { type: "Burn", amount: 1, durationSteps: 2 },
  },
  {
    id: "material-granitite",
    kind: "Material",
    name: "Granitite",
    path: "Stone",
    cost: 1,
    compatibility: "Ongoing",
    resultText: "Gain 1 Armor.",
    effect: { type: "Armor", target: "Summon", amount: 1 },
  },
  {
    id: "material-swiftvine",
    kind: "Material",
    name: "Swiftvine",
    path: "Bloom",
    cost: 1,
    compatibility: "Instant",
    resultText: "Recover 3.",
    effect: {
      type: "Recover",
      target: "Summon",
      amount: 3,
    },
  },
  {
    id: "material-zephyrous",
    kind: "Material",
    name: "Zephyrous",
    path: "Gale",
    cost: 1,
    compatibility: "Instant",
    resultText: "Move 1.",
    effect: {
      type: "Move",
      target: "SummonOrSeal",
      amount: 1,
    },
  },
  {
    id: "material-veiled",
    kind: "Material",
    name: "Veiled",
    path: "Shade",
    cost: 1,
    compatibility: "Ongoing",
    resultText: "Brittle 1.",
    effect: {
      type: "Brittle",
      target: "Summon",
      amount: 1,
    },
  },
  {
    id: "material-luminous",
    kind: "Material",
    name: "Luminous",
    path: "Dawn",
    cost: 1,
    compatibility: "Instant",
    resultText: "Recover 1. Cleanse 1.",
    effect: {
      type: "Composite",
      effects: [
        {
          type: "Recover",
          target: "Summon",
          amount: 1,
        },
        {
          type: "Cleanse",
          target: "Summon",
          amount: 0,
        },
      ],
    },
  },
];

export const materials = rawMaterials.map((f) => materialSchema.parse(f));
