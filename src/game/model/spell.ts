import type { SpellType } from "./keywords";

export type SpellId = string;

export type AbilityTiming =
  | "Standby"
  | "Response"
  | "Maintenance"
  | "Static"
  | "Activated"
  | "OnAnnounce";

export type PlayWindow = "Work" | "Response" | "Any";

export type TriggerCondition =
  | { kind: "whenAnySpellAnnounced" }
  | { kind: "whenOpponentAnnounces" }
  | { kind: "whenOpponentSpeaks" }
  | { kind: "whenAnySpeaks" }
  | { kind: "whenOpponentConjures" }
  | { kind: "whenOpponentPrepares" }
  | { kind: "whenYouSpeak" }
  | { kind: "whenSpellCostIs"; amount: number }
  | { kind: "whenOpponentSpellCostAtLeast"; amount: number }
  | { kind: "whenOpponentAnnouncesWithStressAtLeast"; amount: number }
  | { kind: "whenOpponentAnnouncesFromForgeSlot"; slotIndex: number };

export type CoreTargetSpec =
  | { kind: "selfCore" }
  | { kind: "opponentCore" }
  | { kind: "announcedControllerCore" }
  | { kind: "chosenCore" };

export type SpellTargetSpec =
  | { kind: "announcedSpell" }
  | { kind: "selfSpell" }
  | { kind: "chosenInPlaySpell" }
  | { kind: "chosenInPlaySpellOptional" }
  | { kind: "chosenArmedSeal" }
  | { kind: "chosenSummonWithMaxCost"; maxCost: number }
  | { kind: "chosenJammedSpell" };

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
    }
  | {
      type: "GrantForgeSlotDiscount";
      amount: number;
      uses: number;
      target: "chosenForgeSlot";
    }
  | {
      type: "DispelReserveCardForPower";
      target: "chosenOwnReserveCard";
      gainPower: number;
    }
  | {
      type: "DispelAnnouncedUnlessControllerGainsStress";
      stressAmount: number;
    }
  | {
      type: "GainPower";
      amount: number;
      target: CoreTargetSpec;
    }
  | {
      type: "SetAether";
      amount: number;
      target: CoreTargetSpec;
    }
  | {
      type: "MoveStress";
      amount: number;
      from: CoreTargetSpec;
      to: CoreTargetSpec;
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
  abilities: Ability[];
}

export type TargetValue = string | number;

export interface TargetChoice {
  effectIndex: number;
  value: TargetValue;
}
