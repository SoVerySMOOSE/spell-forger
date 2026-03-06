import type { SpellDefinition } from "../../model/spell";

export const SUMMONS: SpellDefinition[] = [
  {
    id: "aether-foundry-drone",
    name: "Aether Foundry Drone",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Maintenance: Gain 1 Aether.",
    flavorText: "Its brass lungs inhale sparks and exhale tomorrow.",
    abilities: [
      {
        id: "foundry-drone-maintenance",
        timing: "Maintenance",
        effects: [
          { type: "GainAether", amount: 1, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "rift-leechling",
    name: "Rift Leechling",
    type: "Summon",
    costPower: 3,
    playWindow: "Work",
    rulesText: "Maintenance: Leech 1.",
    flavorText: "It feeds on certainty and leaves equations hungry.",
    abilities: [
      {
        id: "leechling-maintenance",
        timing: "Maintenance",
        effects: [
          {
            type: "Leech",
            amount: 1,
            from: { kind: "opponentCore" },
            to: { kind: "selfCore" },
          },
        ],
      },
    ],
  },
  {
    id: "vent-warden",
    name: "Vent Warden",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Maintenance: Vent 1.",
    flavorText: "It listens for fractures and bleeds pressure into song.",
    abilities: [
      {
        id: "vent-warden-maintenance",
        timing: "Maintenance",
        effects: [{ type: "Vent", amount: 1, target: { kind: "selfCore" } }],
      },
    ],
  },
  {
    id: "copper-bastion",
    name: "Copper Bastion",
    type: "Summon",
    costPower: 1,
    playWindow: "Work",
    rulesText: "A resilient body that holds the line.",
    flavorText: "Hammer marks and ward-runes map every duel it survived.",
    abilities: [],
  },
];
