import type { SpellDefinition } from "../../model/spell";

export const SEALS: SpellDefinition[] = [
  {
    id: "filum-argenti-vivi",
    name: "Quicksilver Tripwire",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an Artificer announces a spell costing 0. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "filum-argenti-vivi-trigger",
        timing: "Response",
        trigger: { kind: "whenSpellCostIs", amount: 0 },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "valva-fuliginis",
    name: "Soot-Stopper Valve",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Trigger: When your Core would reach 9+ Stress. Effect: Vent 3.",
    abilities: [],
  },
  {
    id: "acus-siphonis",
    name: "Siphon Needle",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Trigger: When an opponent gains Aether. Effect: Leech 1.",
    abilities: [],
  },
  {
    id: "amuletum-hamuli-speculi",
    name: "Mirrorhook Talisman",
    type: "Seal",
    costPower: 3,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent would Leech. Effect: Change the Leech to target the caster's Core instead.",
    abilities: [],
  },
  {
    id: "os-cera-clausum",
    name: "Wax-Sealed Mouth",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an Artificer Speaks an Incantation. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "os-cera-clausum-trigger",
        timing: "Response",
        trigger: { kind: "whenAnySpeaks" },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "sigillum-lubricum",
    name: "Grease-Slick Sigil",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent Conjures a Summon. Effect: Put 2 Jam Counters on that Summon.",
    abilities: [
      {
        id: "sigillum-lubricum-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentConjures" },
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 2 },
        ],
      },
    ],
  },
  {
    id: "laqueus-ferri-frigidi",
    name: "Cold-Iron Snare",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces a spell costing 4+. Effect: Put 3 Jam Counters on the announced spell.",
    abilities: [
      {
        id: "laqueus-ferri-frigidi-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentSpellCostAtLeast", amount: 4 },
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 3 },
        ],
      },
    ],
  },
  {
    id: "monile-ultionis",
    name: "Grudge Locket",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent Dispels one of your spells. Effect: Gain 2 Aether.",
    abilities: [],
  },
  {
    id: "clepsydra-fissa",
    name: "Cracked Hourglass",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces any spell. Effect: Put 1 Jam Counter on the announced spell.",
    abilities: [
      {
        id: "clepsydra-fissa-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentAnnounces" },
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 1 },
        ],
      },
    ],
  },
  {
    id: "amuletum-furis",
    name: "Thief-Catcher Charm",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent gains Aether while they have 8+ Aether. Effect: They gain 2 Stress.",
    abilities: [],
  },
  {
    id: "abacus-invidiae",
    name: "Spiteful Abacus",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When any spell is Dispelled during Response. Effect: Scry 2.",
    abilities: [],
  },
  {
    id: "forfex-sigilli",
    name: "Rune-Scissors",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces a Seal. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "forfex-sigilli-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentPrepares" },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "corona-cava",
    name: "Hollow Crown",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent would gain 6+ Aether from a single effect. Effect: Instead, they gain 3 Aether and 3 Stress.",
    abilities: [],
  },
  {
    id: "plumbum-iudicis",
    name: "Lead-Plumb Bob",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces a spell and they have 5+ Stress. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "plumbum-iudicis-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentAnnouncesWithStressAtLeast", amount: 5 },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "funis-salis",
    name: "Salted Fuse",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent gains 4+ Aether from a single effect. Effect: They gain 3 Stress.",
    abilities: [],
  },
  {
    id: "liber-rubiginis",
    name: "Ledger of Rust",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent would gain Power beyond their normal per-turn refresh amount. Effect: Dispel that Power gain effect.",
    abilities: [],
  },
  {
    id: "clavus-in-rota",
    name: "Nail-in-the-Gear",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent announces a spell from the center Forge slot. Effect: Dispel the announced spell.",
    abilities: [
      {
        id: "clavus-in-rota-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentAnnouncesFromForgeSlot", slotIndex: 4 },
        effects: [{ type: "Dispel", target: { kind: "announcedSpell" } }],
      },
    ],
  },
  {
    id: "pellis-anguillae",
    name: "Eel-Skin Insulation",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Trigger: When you would gain Stress. Effect: Prevent 2 of that Stress.",
    abilities: [],
  },
  {
    id: "patella-cineris",
    name: "Ash-Catcher Pan",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Trigger: When you Speak an Incantation. Effect: Vent 1.",
    abilities: [
      {
        id: "patella-cineris-trigger",
        timing: "Response",
        trigger: { kind: "whenYouSpeak" },
        effects: [{ type: "Vent", amount: 1, target: { kind: "selfCore" } }],
      },
    ],
  },
  {
    id: "magnes-gibbosi",
    name: "Gallows Magnet",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Trigger: When an opponent would Saturate their Core (reach 10+ Aether) this turn. Effect: They gain 3 Stress.",
    abilities: [],
  },
];
