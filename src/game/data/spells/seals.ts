import type { SpellDefinition } from "../../model/spell";

export const SEALS: SpellDefinition[] = [
  {
    id: "tripwire",
    name: "Tripwire",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an Artificer announces a spell costing 0. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "tripwire-trigger",
        timing: "Response",
        trigger: { kind: "whenSpellCostIs", amount: 0 },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "emergency-exhaust",
    name: "Emergency Exhaust",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Trigger: When your Core would reach 9+ Stress. Effect: Vent 3.",
    abilities: [],
  },
  {
    id: "siphon-needle",
    name: "Siphon Needle",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Trigger: When an opponent gains Aether. Effect: Leech 1.",
    abilities: [],
  },
  {
    id: "counter-siphon",
    name: "Counter-Siphon",
    type: "Seal",
    costPower: 3,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent would Leech. Effect: Change the Leech to target the caster's Core instead.",
    abilities: [],
  },
  {
    id: "mouth-sealing-wax",
    name: "Mouth-Sealing Wax",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an Artificer Speaks an Incantation. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "mouth-sealing-wax-trigger",
        timing: "Response",
        trigger: { kind: "whenAnySpeaks" },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "summon-jammer",
    name: "Summon Jammer",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent Conjures a Summon. Effect: Put 2 Jam Counters on that Summon.",
    abilities: [
      {
        id: "summon-jammer-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentConjures" },
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 2 },
        ],
      },
    ],
  },
  {
    id: "snare",
    name: "Snare",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces a spell costing 4+. Effect: Put 3 Jam Counters on the announced spell.",
    abilities: [
      {
        id: "snare-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentSpellCostAtLeast", amount: 4 },
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 3 },
        ],
      },
    ],
  },
  {
    id: "grudge-locket",
    name: "Grudge Locket",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent Dispels one of your spells. Effect: Gain 2 Aether.",
    abilities: [],
  },
  {
    id: "hourglass",
    name: "Hourglass",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces any spell. Effect: Put 1 Jam Counter on the announced spell.",
    abilities: [
      {
        id: "hourglass-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentAnnounces" },
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 1 },
        ],
      },
    ],
  },
  {
    id: "aether-alarm",
    name: "Aether Alarm",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent gains Aether while they have 8+ Aether. Effect: They gain 2 Stress.",
    abilities: [],
  },
  {
    id: "mystical-spyglass",
    name: "Mystical Spyglass",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When any spell is Dispelled during Response. Effect: Scry 2.",
    abilities: [],
  },
  {
    id: "rune-scissors",
    name: "Rune-Scissors",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces a Seal. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "rune-scissors-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentPrepares" },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "hollow-crown",
    name: "Hollow Crown",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent would gain 6+ Aether from a single effect. Effect: Instead, they gain 3 Aether and 3 Stress.",
    abilities: [],
  },
  {
    id: "lead-plumb-bob",
    name: "Lead-Plumb Bob",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces a spell and they have 5+ Stress. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "lead-plumb-bob-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentAnnouncesWithStressAtLeast", amount: 5 },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "salted-fuse",
    name: "Salted Fuse",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent gains 4+ Aether from a single effect. Effect: They gain 3 Stress.",
    abilities: [],
  },
  {
    id: "rusty-ledger",
    name: "Rusty Ledger",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent would gain Power beyond their normal per-turn refresh amount. Effect: Dispel that Power gain effect.",
    abilities: [],
  },
  {
    id: "nail-in-the-gear",
    name: "Nail-in-the-Gear",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces a spell from the center Forge slot. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "nail-in-the-gear-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentAnnouncesFromForgeSlot", slotIndex: 4 },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "core-insulation",
    name: "Core Insulation",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When you would gain Stress. Effect: Prevent 2 of that Stress.",
    abilities: [],
  },
  {
    id: "core-capacitor",
    name: "Core Capacitor",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Trigger: When you Speak an Incantation. Effect: Vent 1.",
    abilities: [
      {
        id: "core-capacitor-trigger",
        timing: "Response",
        trigger: { kind: "whenYouSpeak" },
        effects: [{ type: "Vent", amount: 1, target: { kind: "selfCore" } }],
      },
    ],
  },
  {
    id: "eternal-reward",
    name: "Eternal Reward",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent would Saturate their Core (reach 10+ Aether) this turn. Effect: They gain 3 Stress.",
    abilities: [],
  },
];
