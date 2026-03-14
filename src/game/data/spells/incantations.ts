import type { SpellDefinition } from "../../model/spell";

export const INCANTATIONS: SpellDefinition[] = [
  {
    id: "canalis-rupturae",
    name: "Channel the Faultline",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Gain 3 Stress. Gain 3 Power.",
    abilities: [
      {
        id: "canalis-rupturae-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainStress", amount: 3, target: { kind: "selfCore" } },
          { type: "GainPower", amount: 3, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "schema-supercursus",
    name: "Overclock Sketch",
    type: "Incantation",
    costPower: 0,
    playWindow: "Work",
    rulesText: "Gain 2 Stress. Gain 2 Power.",
    abilities: [
      {
        id: "schema-supercursus-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainStress", amount: 2, target: { kind: "selfCore" } },
          { type: "GainPower", amount: 2, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "canticum-exhalationis",
    name: "Venting Canticle",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Vent 4.",
    abilities: [
      {
        id: "canticum-exhalationis-resolution",
        timing: "OnAnnounce",
        effects: [{ type: "Vent", amount: 4, target: { kind: "selfCore" } }],
      },
    ],
  },
  {
    id: "corona-scintillarum",
    name: "Crown of Sparks",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Gain 2 Aether. Scry 2.",
    abilities: [
      {
        id: "corona-scintillarum-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainAether", amount: 2, target: { kind: "selfCore" } },
          { type: "Scry", amount: 2, target: "self" },
        ],
      },
    ],
  },
  {
    id: "siphon-aetheris",
    name: "Ether Siphon",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Leech 2.",
    abilities: [
      {
        id: "siphon-aetheris-resolution",
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
    id: "inversio-fluxus",
    name: "Invert the Flow",
    type: "Incantation",
    costPower: 3,
    playWindow: "Work",
    rulesText: "Move 3 Stress from your Core to an opponent's Core.",
    abilities: [
      {
        id: "inversio-fluxus-resolution",
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
    id: "analysis-rupturae",
    name: "Breakpoint Analysis",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText:
      "Scry 4. You may immediately Dispel one revealed card (to Spent). If you do, gain 1 Power.",
    abilities: [
      {
        id: "analysis-rupturae-resolution",
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
    id: "recordatio-cineris",
    name: "Ashen Recall",
    type: "Incantation",
    costPower: 0,
    playWindow: "Work",
    rulesText: "Scry 1. Then gain 1 Stress.",
    abilities: [
      {
        id: "recordatio-cineris-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "Scry", amount: 1, target: "self" },
          { type: "GainStress", amount: 1, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "hasta-stellarum",
    name: "Starfire Lance",
    type: "Incantation",
    costPower: 3,
    playWindow: "Work",
    rulesText: "Gain 4 Aether. Then gain 2 Stress.",
    abilities: [
      {
        id: "hasta-stellarum-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainAether", amount: 4, target: { kind: "selfCore" } },
          { type: "GainStress", amount: 2, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "diluvium-aetheris",
    name: "Aether Flood",
    type: "Incantation",
    costPower: 4,
    playWindow: "Work",
    rulesText: "Gain 6 Aether. Then gain 4 Stress.",
    abilities: [
      {
        id: "diluvium-aetheris-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "GainAether", amount: 6, target: { kind: "selfCore" } },
          { type: "GainStress", amount: 4, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "formula-cataclysmatis",
    name: "Cataclysm Formula",
    type: "Incantation",
    costPower: 5,
    playWindow: "Work",
    rulesText: "Set your Aether to 9. Then gain 7 Stress.",
    abilities: [
      {
        id: "formula-cataclysmatis-resolution",
        timing: "OnAnnounce",
        effects: [
          { type: "SetAether", amount: 9, target: { kind: "selfCore" } },
          { type: "GainStress", amount: 7, target: { kind: "selfCore" } },
        ],
      },
    ],
  },
  {
    id: "incus-cadens",
    name: "Hammerfall Hex",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Dispel a Summon with cost 3 or less.",
    abilities: [
      {
        id: "incus-cadens-resolution",
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
    id: "forfex-runarum",
    name: "Sever the Tripwire",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText: "Dispel an Armed Seal.",
    abilities: [
      {
        id: "forfex-runarum-resolution",
        timing: "OnAnnounce",
        effects: [{ type: "Dispel", target: { kind: "chosenArmedSeal" } }],
      },
    ],
  },
  {
    id: "aequatio-susurrans",
    name: "Hushed Equation",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Put 1 Jam Counter on up to two spells in play.",
    abilities: [
      {
        id: "aequatio-susurrans-resolution",
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
    id: "rivus-retusus",
    name: "Unmake the Rivet",
    type: "Incantation",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Dispel a Jammed spell.",
    abilities: [
      {
        id: "rivus-retusus-resolution",
        timing: "OnAnnounce",
        effects: [{ type: "Dispel", target: { kind: "chosenJammedSpell" } }],
      },
    ],
  },
  {
    id: "compas-witchlight",
    name: "Witchlight Compass",
    type: "Incantation",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Choose a Forge slot. The next spell you play from that slot this turn costs 2 less Power.",
    abilities: [
      {
        id: "compas-witchlight-resolution",
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
    id: "minuta-mutuata",
    name: "Borrowed Minute",
    type: "Incantation",
    costPower: 1,
    playWindow: "Response",
    rulesText:
      "Response: Put 1 Jam Counter on the announced spell. Then Scry 1.",
    abilities: [
      {
        id: "minuta-mutuata-response",
        timing: "OnAnnounce",
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 1 },
          { type: "Scry", amount: 1, target: "self" },
        ],
      },
    ],
  },
  {
    id: "syllaba-nulla",
    name: "Null-Syllable",
    type: "Incantation",
    costPower: 1,
    playWindow: "Response",
    rulesText:
      "Response: Dispel the announced spell unless its controller gains 2 Stress.",
    abilities: [
      {
        id: "syllaba-nulla-response",
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
    id: "tempus-perfectum",
    name: "Perfect Timing",
    type: "Incantation",
    costPower: 2,
    playWindow: "Response",
    rulesText: "Response: Put 3 Jam Counters on the announced spell.",
    abilities: [
      {
        id: "tempus-perfectum-response",
        timing: "OnAnnounce",
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 3 },
        ],
      },
    ],
  },
  {
    id: "rebuttal-staticus",
    name: "Static Rebuttal",
    type: "Incantation",
    costPower: 2,
    playWindow: "Response",
    rulesText: "Response: Put 2 Jam Counters on the announced spell.",
    abilities: [
      {
        id: "rebuttal-staticus-response",
        timing: "OnAnnounce",
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 2 },
        ],
      },
    ],
  },
];
