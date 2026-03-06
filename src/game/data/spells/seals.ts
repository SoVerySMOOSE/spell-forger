import type { SpellDefinition } from "../../model/spell";

export const SEALS: SpellDefinition[] = [
  {
    id: "mute-lattice",
    name: "Mute Lattice",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Armed. Response: When an opponent Speaks, Dispel the announced Incantation.",
    flavorText: "Quiet is not absence. Quiet is a blade.",
    abilities: [
      {
        id: "mute-lattice-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentSpeaks" },
        effects: [
          { type: "Dispel", target: { kind: "announcedSpell" } },
          { type: "Dispel", target: { kind: "selfSpell" } },
        ],
      },
    ],
  },
  {
    id: "snare-coil",
    name: "Snare Coil",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Armed. Response: When any spell is announced, Jam it with 1.",
    flavorText: "It snaps shut on unfinished words.",
    abilities: [
      {
        id: "snare-coil-trigger",
        timing: "Response",
        trigger: { kind: "whenAnySpellAnnounced" },
        effects: [
          { type: "Jam", target: { kind: "announcedSpell" }, counters: 1 },
          { type: "Dispel", target: { kind: "selfSpell" } },
        ],
      },
    ],
  },
  {
    id: "ashen-mirror",
    name: "Ashen Mirror",
    type: "Seal",
    costPower: 2,
    playWindow: "Work",
    rulesText:
      "Armed. Response: When an opponent Conjures, that opponent gains 1 Stress.",
    flavorText: "It reflects your triumph as hairline cracks.",
    abilities: [
      {
        id: "ashen-mirror-trigger",
        timing: "Response",
        trigger: { kind: "whenOpponentConjures" },
        effects: [
          {
            type: "GainStress",
            amount: 1,
            target: { kind: "announcedControllerCore" },
          },
          { type: "Dispel", target: { kind: "selfSpell" } },
        ],
      },
    ],
  },
  {
    id: "resonance-cache",
    name: "Resonance Cache",
    type: "Seal",
    costPower: 1,
    playWindow: "Work",
    rulesText: "Armed. Response: When you Speak, gain 1 Aether.",
    flavorText: "Stored echoes break open at exactly the right syllable.",
    abilities: [
      {
        id: "resonance-cache-trigger",
        timing: "Response",
        trigger: { kind: "whenYouSpeak" },
        effects: [
          { type: "GainAether", amount: 1, target: { kind: "selfCore" } },
          { type: "Dispel", target: { kind: "selfSpell" } },
        ],
      },
    ],
  },
];
