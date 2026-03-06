import type { PlayerId, SpellType } from "./keywords";

export type SpellId = string;

export type AbilityTiming =
  | "Response"
  | "Maintenance"
  | "Static"
  | "Activated"
  | "OnAnnounce";

export type PlayWindow = "Work" | "Response" | "Any";

export type TriggerCondition =
  | { kind: "whenAnySpellAnnounced" }
  | { kind: "whenOpponentSpeaks" }
  | { kind: "whenOpponentConjures" }
  | { kind: "whenOpponentPrepares" }
  | { kind: "whenYouSpeak" };

export type CoreTargetSpec =
  | { kind: "selfCore" }
  | { kind: "opponentCore" }
  | { kind: "announcedControllerCore" }
  | { kind: "chosenCore" };

export type SpellTargetSpec =
  | { kind: "announcedSpell" }
  | { kind: "selfSpell" }
  | { kind: "chosenInPlaySpell" }
  | { kind: "chosenArmedSeal" };

export type Effect =
  | {
      type: "GainAether";
      amount: number;
      target: CoreTargetSpec;
    }
  | {
      type: "GainStress";
      amount: number;
      target: CoreTargetSpec;
    }
  | {
      type: "Vent";
      amount: number;
      target: CoreTargetSpec;
    }
  | {
      type: "Leech";
      amount: number;
      from: CoreTargetSpec;
      to: CoreTargetSpec;
    }
  | {
      type: "Dispel";
      target: SpellTargetSpec;
    }
  | {
      type: "Jam";
      target: SpellTargetSpec;
      counters: number;
    }
  | {
      type: "Scry";
      amount: number;
      target: "self" | "opponent";
    };

export interface Ability {
  id: string;
  timing: AbilityTiming;
  trigger?: TriggerCondition;
  effects: Effect[];
}

export interface SpellDefinition {
  id: SpellId;
  name: string;
  type: SpellType;
  costPower: number;
  playWindow: PlayWindow;
  rulesText: string;
  flavorText: string;
  abilities: Ability[];
}

export type TargetValue = string | PlayerId;

export interface TargetChoice {
  effectIndex: number;
  value: TargetValue;
}
