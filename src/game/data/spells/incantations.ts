import type { SpellDefinition } from "../../model/spell";

export const INCANTATIONS: SpellDefinition[] = [
  {
    id: "channel-the-faultline",
    name: "Channel the Faultline",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Gain 3 Stress. Gain 3 Power.",
    abilities: [
      {
        id: "channel-the-faultline-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainStress", amount: 3, target: { kind: "selfCore" } },
          { type: "GainPower", amount: 3, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "overclock",
    name: "Overclock",
    type: "Incantation",
    costPower: 0,
    playWindow: "Work",
    rulesText: "Gain 2 Stress. Gain 2 Power.",
    abilities: [
      {
        id: "overclock-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainStress", amount: 2, target: { kind: "selfCore" } },
          { type: "GainPower", amount: 2, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "venting-canticle",
    name: "Venting Canticle",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Vent 4.",
    abilities: [
      {
        id: "venting-canticle-resolution",
        timing: "OnAnnounce",
        effects: [{ type: "Vent", amount: 4, target: { kind: "selfCore" } }],
      },
    ],
  },
  {
    id: "crown-of-sparks",
    name: "Crown of Sparks",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Gain 2 Aether. Scry 2.",
    abilities: [
      {
        id: "crown-of-sparks-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainAether", amount: 2, target: { kind: "selfCore" } },
          { type: "Scry", amount: 2, target: "self" },
        ],
      },
    ],
  },
  {
    id: "aether-siphon",
    name: "Aether Siphon",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Leech 2.",
    abilities: [
      {
        id: "aether-siphon-resolution",
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
  {
    id: "invert-the-flow",
    name: "Invert the Flow",
    type: "Incantation",
    costPower: 3,
    playWindow: "Work",
    rulesText: "Move 3 Stress from your Core to an opponent's Core.",
    abilities: [
      {
        id: "invert-the-flow-resolution",
        timing: "OnAnnounce",
        effects: [
          {
            type: "MoveStress",
            amount: 3,
            from: { kind: "selfCore" },
            to: { kind: "opponentCore" },
          },
        ],
      },
    ],
  },
  {
    id: "quick-analysis",
    name: "Quick Analysis",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Scry 4. You may immediately Dispel one revealed card. If you do, gain 1 Power.",
    abilities: [
      {
        id: "quick-analysis-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "Scry", amount: 4, target: "self" },
          {
            type: "DispelReserveCardForPower",
            target: "chosenOwnReserveCard",
            gainPower: 1,
          },
        ],
      },
    ],
  },
  {
    id: "scry",
    name: "Scry",
    type: "Incantation",
    costPower: 0,
    playWindow: "Work",
    rulesText: "Scry 1. Then gain 1 Stress.",
    abilities: [
      {
        id: "scry-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "Scry", amount: 1, target: "self" },
          { type: "GainStress", amount: 1, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "tinkers-charm",
    name: "Tinker's Charm",
    type: "Incantation",
    costPower: 3,
    playWindow: "Work",
    rulesText: "Gain 4 Aether. Then gain 2 Stress.",
    abilities: [
      {
        id: "tinkers-charm-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainAether", amount: 4, target: { kind: "selfCore" } },
          { type: "GainStress", amount: 2, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "aether-flood",
    name: "Aether Flood",
    type: "Incantation",
    costPower: 4,
    playWindow: "Work",
    rulesText: "Gain 6 Aether. Then gain 4 Stress.",
    abilities: [
      {
        id: "aether-flood-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainAether", amount: 6, target: { kind: "selfCore" } },
          { type: "GainStress", amount: 4, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "cataclysmic-breakthrough",
    name: "Cataclysmic Breakthrough",
    type: "Incantation",
    costPower: 5,
    playWindow: "Work",
    rulesText: "Set your Aether to 9. Then gain 7 Stress.",
    abilities: [
      {
        id: "cataclysmic-breakthrough-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "SetAether", amount: 9, target: { kind: "selfCore" } },
          { type: "GainStress", amount: 7, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "dispelling-hex",
    name: "Dispelling Hex",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Dispel a Summon with cost 3 or less.",
    abilities: [
      {
        id: "dispelling-hex-resolution",
        timing: "OnAnnounce",
        effects: [
          {
            type: "Dispel",
            target: { kind: "chosenSummonWithMaxCost", maxCost: 3 },
          },
        ],
      },
    ],
  },
  {
    id: "disarm",
    name: "Disarm",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Dispel an Armed Seal.",
    abilities: [
      {
        id: "disarm-resolution",
        timing: "OnAnnounce",
        effects: [{ type: "Dispel", target: { kind: "chosenArmedSeal" } }],
      },
    ],
  },
  {
    id: "jammer-bolt",
    name: "Jammer Bolt",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Put 1 Jam Counter on up to two spells in play.",
    abilities: [
      {
        id: "jammer-bolt-resolution",
        timing: "OnAnnounce",
        effects: [
          {
            type: "Jam",
            target: { kind: "chosenInPlaySpellOptional" },
            counters: 1,
          },
          {
            type: "Jam",
            target: { kind: "chosenInPlaySpellOptional" },
            counters: 1,
          },
        ],
      },
    ],
  },
  {
    id: "unmake",
    name: "Unmake",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Dispel a Jammed spell.",
    abilities: [
      {
        id: "unmake-resolution",
        timing: "OnAnnounce",
        effects: [{ type: "Dispel", target: { kind: "chosenJammedSpell" } }],
      },
    ],
  },
  {
    id: "focussed-efforts",
    name: "Focussed Efforts",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Choose a Forge slot. The next spell you play from that slot this turn costs 2 less Power.",
    abilities: [
      {
        id: "focussed-efforts-resolution",
        timing: "OnAnnounce",
        effects: [
          {
            type: "GrantForgeSlotDiscount",
            amount: 2,
            uses: 1,
            target: "chosenForgeSlot",
          },
        ],
      },
    ],
  },
  {
    id: "delay",
    name: "Delay",
    type: "Incantation",
    costPower: 1,
    playWindow: "Response",
    rulesText:
      "Response: Put 1 Jam Counter on the announced spell. Then Scry 1.",
    abilities: [
      {
        id: "delay-response",
        timing: "OnAnnounce",
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 1 },
          { type: "Scry", amount: 1, target: "self" },
        ],
      },
    ],
  },
  {
    id: "nullification",
    name: "Nullification",
    type: "Incantation",
    costPower: 1,
    playWindow: "Response",
    rulesText:
      "Response: Dispel the announced spell unless its controller gains 2 Stress.",
    abilities: [
      {
        id: "nullification-response",
        timing: "OnAnnounce",
        effects: [
          {
            type: "DispelAnnouncedUnlessControllerGainsStress",
            stressAmount: 2,
          },
        ],
      },
    ],
  },
  {
    id: "sabotage",
    name: "Sabotage",
    type: "Incantation",
    costPower: 2,
    playWindow: "Response",
    rulesText: "Response: Put 3 Jam Counters on the announced spell.",
    abilities: [
      {
        id: "sabotage-response",
        timing: "OnAnnounce",
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 3 },
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
    rulesText: "Response: Put 2 Jam Counters on the announced spell.",
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
];
