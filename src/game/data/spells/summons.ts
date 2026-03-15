import type { SpellDefinition } from "../../model/spell";

export const SUMMONS: SpellDefinition[] = [
  {
    id: "reckless-imp",
    name: "Reckless Imp",
    type: "Summon",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Once per Work, you may gain 1 Stress to gain 1 Aether.",
    abilities: [],
  },
  {
    id: "town-scryer",
    name: "Tower Scryer",
    type: "Summon",
    costPower: 3,
    playWindow: "Work",
    rulesText: "Once per Work, you may Scry 2. If you do, gain 1 Stress.",
    abilities: [],
  },
  {
    id: "aether-lantern",
    name: "Aether Lantern",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "During Response, once per Cycle: if any spell is Dispelled, gain 1 Aether.",
    abilities: [],
  },
  {
    id: "hexing-turret",
    name: "Hexing Turret",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "During Response, once per Cycle: you may gain 1 Stress to put 1 Jam Counter on the announced spell.",
    abilities: [
      {
        id: "hexing-turret-response",
        timing: "Response",
        trigger: { kind: "whenAnySpellAnnounced" },
        effects: [
          { type: "GainStress", amount: 1, target: { kind: "selfCore" } },
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 1 },
        ],
      },
    ],
  },
  {
    id: "fueling-drake",
    name: "Fueling Drake",
    type: "Summon",
    costPower: 3,
    playWindow: "Work",
    rulesText:
      "During your Maintenance: if you Spoke an Incantation this turn, gain 1 Aether.",
    abilities: [],
  },
  {
    id: "dutiful-squire",
    name: "Dutiful Squire",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Once per Work: the first time you Speak an Incantation, gain 1 Power.",
    abilities: [],
  },
  {
    id: "protective-golem",
    name: "Protectice Golem",
    type: "Summon",
    costPower: 3,
    playWindow: "Work",
    rulesText:
      "The first time each Cycle an opponent would Leech from you, reduce that Leech by 1.",
    abilities: [],
  },
  {
    id: "animated-armor",
    name: "Animated Armor",
    type: "Summon",
    costPower: 3,
    playWindow: "Work",
    rulesText:
      "During Response, once per Cycle: if a spell would Leech, you may change the target Core to the caster's Core.",
    abilities: [],
  },
  {
    id: "nine-slot-mechanist",
    name: "Nine-Slot Mechanist",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Once per Work: the first spell you play from the center Forge slot costs 1 less Power.",
    abilities: [],
  },
  {
    id: "intern-smithy",
    name: "Intern Smithy",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Once per Work: when you play a spell from the top row of the Forge, gain 1 Aether.",
    abilities: [],
  },
  {
    id: "billowing-archon",
    name: "Billowing Archon",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "During your Maintenance: you may Vent 1. If you do, gain 1 Aether.",
    abilities: [],
  },
  {
    id: "basilisk",
    name: "Basilisk",
    type: "Summon",
    costPower: 4,
    playWindow: "Work",
    rulesText:
      "During your Maintenance: if an opponent has 5+ Stress, they gain 1 Stress.",
    abilities: [],
  },
  {
    id: "cathedral-sentinel",
    name: "Cathedral Sentinel",
    type: "Summon",
    costPower: 5,
    playWindow: "Work",
    rulesText: "During your Maintenance: if your Stress is 0, gain 3 Aether.",
    abilities: [],
  },
  {
    id: "crucible-stoker",
    name: "Crucible Stoker",
    type: "Summon",
    costPower: 4,
    playWindow: "Work",
    rulesText: "During your Maintenance: if you have 6+ Stress, gain 2 Aether.",
    abilities: [],
  },
  {
    id: "aether-leviathan",
    name: "Aether Leviathan",
    type: "Summon",
    costPower: 6,
    playWindow: "Work",
    rulesText:
      "During your Maintenance: gain 2 Aether. If you Spoke 2+ Incantations this turn, gain +1 Aether. Then gain 1 Stress.",
    abilities: [
      {
        id: "aether-leviathan-maintenance",
        timing: "Maintenance",
        effects: [
          { type: "GainAether", amount: 2, target: { kind: "selfCore" } },
          { type: "GainStress", amount: 1, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "anvil-warden",
    name: "Anvil Warden",
    type: "Summon",
    costPower: 3,
    playWindow: "Work",
    rulesText:
      "Once per Cycle: when you would Dispel a spell in play, you may instead put 2 Jam Counters on it and gain 1 Aether.",
    abilities: [],
  },
  {
    id: "core-auditor",
    name: "Core Auditor",
    type: "Summon",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "During Response, once per Work: when an opponent announces a spell costing 4+, you may Scry 1.",
    abilities: [
      {
        id: "core-auditor-response",
        timing: "Response",
        trigger: { kind: "whenOpponentSpellCostAtLeast", amount: 4 },
        effects: [{ type: "Scry", amount: 1, target: "self" }],
      },
    ],
  },
  {
    id: "archivist",
    name: "Archivist",
    type: "Summon",
    costPower: 4,
    playWindow: "Work",
    rulesText:
      "During your Maintenance: if you played no spells this turn, Vent 2 and gain 2 Aether.",
    abilities: [],
  },
  {
    id: "trap-master",
    name: "Trap Master",
    type: "Summon",
    costPower: 6,
    playWindow: "Work",
    rulesText:
      "During your Maintenance: gain 1 Aether for each Armed Seal you control (max 3). Then gain 1 Stress.",
    abilities: [
      {
        id: "trap-master-maintenance",
        timing: "Maintenance",
        effects: [
          { type: "GainStress", amount: 1, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "dueling-mage",
    name: "Dueling Mage",
    type: "Summon",
    costPower: 3,
    playWindow: "Work",
    rulesText:
      "During Response, once per Cycle: you may gain 2 Stress to Dispel the announced spell.",
    abilities: [
      {
        id: "dueling-mage-response",
        timing: "Response",
        trigger: { kind: "whenAnySpellAnnounced" },
        effects: [
          { type: "GainStress", amount: 2, target: { kind: "selfCore" } },
          { type: "Dispel", target: { kind: "announcedSpell" } },
        ],
      },
    ],
  },
];
