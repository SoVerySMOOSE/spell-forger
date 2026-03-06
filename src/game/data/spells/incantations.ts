import type { SpellDefinition } from "../../model/spell";

export const INCANTATIONS: SpellDefinition[] = [
  {
    id: "starflare-equation",
    name: "Starflare Equation",
    type: "Incantation",
    costPower: 4,
    playWindow: "Work",
    rulesText: "Gain 4 Aether. Gain 2 Stress.",
    flavorText: "A sun can be folded into a sentence, once.",
    abilities: [
      {
        id: "starflare-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainAether", amount: 4, target: { kind: "selfCore" } },
          { type: "GainStress", amount: 2, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "static-rebuttal",
    name: "Static Rebuttal",
    type: "Incantation",
    costPower: 2,
    playWindow: "Response",
    rulesText: "Response: Jam the announced spell with 2 counters.",
    flavorText: "One hiss through clenched teeth, and the weave stalls.",
    abilities: [
      {
        id: "static-rebuttal-response",
        timing: "OnAnnounce",
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 2 },
        ],
      },
    ],
  },
  {
    id: "prismatic-scry",
    name: "Prismatic Scry",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Scry 2.",
    flavorText: "Every shard reflects a possible future and a worse one.",
    abilities: [
      {
        id: "prismatic-scry-resolution",
        timing: "OnAnnounce",
        effects: [{ type: "Scry", amount: 2, target: "self" }],
      },
    ],
  },
  {
    id: "pulse-siphon",
    name: "Pulse Siphon",
    type: "Incantation",
    costPower: 3,
    playWindow: "Work",
    rulesText: "Leech 2.",
    flavorText: "Borrowed brilliance returns as debt and static.",
    abilities: [
      {
        id: "pulse-siphon-resolution",
        timing: "OnAnnounce",
        effects: [
          {
            type: "Leech",
            amount: 2,
            from: { kind: "opponentCore" },
            to: { kind: "selfCore" },
          },
        ],
      },
    ],
  },
];
