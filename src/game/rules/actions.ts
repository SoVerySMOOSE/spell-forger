import type { PlayerId } from "../model/keywords";
import type { SpellId, TargetChoice } from "../model/spell";
import type { SpellSource } from "../model/zones";

export type AnnounceSpellAction = {
  type: "AnnounceSpell";
  player: PlayerId;
  source: SpellSource;
  spellId: SpellId;
  targets?: TargetChoice[];
};

export type ActivateSpellAbilityAction = {
  type: "ActivateSpellAbility";
  player: PlayerId;
  instanceId: string;
};

export type GameAction =
  | {
      type: "NewGame";
      seed: number;
    }
  | AnnounceSpellAction
  | ActivateSpellAbilityAction
  | {
      type: "ResolveResponse";
    }
  | {
      type: "ChooseUnjam";
      player: PlayerId;
      instanceIds: string[];
    }
  | {
      type: "AdvancePhase";
    };
