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

export type GameAction =
  | {
      type: "NewGame";
      seed: number;
    }
  | {
      type: "DrawPower";
      player: PlayerId;
    }
  | AnnounceSpellAction
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
