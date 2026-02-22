export type CardType = "Spell" | "Summon" | "Seal" | "Relic";
export type ComponentKind = "Form" | "Material" | "Sigil";
export type Compatibility = "Instant" | "Ongoing" | "Both";

export type Path = "Ash" | "Stone" | "Bloom" | "Gale" | "Shade" | "Dawn";

export type FormTrigger =
  | "TargetSummon"
  | "TargetEnemySummon"
  | "OnAttack"
  | "OnClash"
  | "WhenAttacked"
  | "WhenConjured"
  | "WhenEnemyEntersSite"
  | "WhileAtSite"
  | "StartOfTurn"
  | "EndOfTurn"
  | "RelicActivate";

export type ImpliedSubject =
  | "Target"
  | "This"
  | "Attacker"
  | "Defender"
  | "OpposingSummon"
  | "EnteringSummon"
  | "Bearer"
  | "Site"
  | "None";

export interface FormComponent {
  id: string;
  kind: "Form";
  name: string;
  cardType: CardType;
  cost: number;
  compatibility: Compatibility;
  trigger: FormTrigger;
  triggerText: string; // player-facing text
  impliedSubject: ImpliedSubject;
  baseMight?: number; // Summons only
}

export type MaterialEffect =
  | { type: "Damage"; friendlyFire: boolean; target: "Summon"; amount: number } // deal X damage to Summon
  | {
      type: "Burn";
      friendlyFire: boolean;
      amount: number;
      durationSteps: number;
    } // deal X damage to Summon for Y steps
  | { type: "Armor"; friendlyFire: boolean; target: "Summon"; amount: number } // decrease opposing Summons might by X during clash
  | { type: "Brittle"; friendlyFire: boolean; target: "Summon"; amount: number } // decrease Summons might by X during clash
  | {
      type: "Root";
      friendlyFire: boolean;
      target: "Summon" | "Seal" | "SummonOrSeal";
      durationSteps: number;
    } // summon cannot move or be moved
  | { type: "Recover"; friendlyFire: boolean; target: "Summon"; amount: number } // heal X damage
  | { type: "Scry"; amount: number } // look at top X cards of forge, they are playable this turn
  | {
      type: "Move";
      friendlyFire: boolean;
      target: "Summon" | "Seal" | "SummonOrSeal";
      amount: number;
    } // a Summon Moves X sites
  | { type: "GainFocus"; amount: number } // increase focus by X this turn only
  | { type: "LoseFocus"; amount: number } // decrease focus by X this turn only
  | {
      type: "MightBuff";
      friendlyFire: boolean;
      target: "Summon";
      amount: number;
      duration: "ThisStep" | "NextClash" | "Ongoing";
    } // increase Summons might by X
  | {
      type: "MightDebuff";
      friendlyFire: boolean;
      target: "Summon";
      amount: number;
      duration: "ThisStep" | "NextClash" | "Ongoing";
    } // decrease Summons might by X
  | { type: "Pierce"; friendlyFire: boolean; target: "Summon"; amount: number } // ignores armor
  | {
      type: "Unyielding";
      friendlyFire: boolean;
      target: "Summon";
      duration: "ThisClash" | "ThisStep";
    } // wins tied Clashes with 1 might
  | {
      type: "Silence";
      friendlyFire: boolean;
      target: "Summon" | "Seal" | "SummonOrSeal";
      durationSteps: number;
    } // can't use activated abilities
  | {
      type: "Cleanse";
      friendlyFire: boolean;
      target: "Summon" | "Seal" | "Relic" | "Any";
      amount: number;
    } // remove chosen statuses, keywords, or text
  | {
      type: "Dispel";
      friendlyFire: boolean;
      target: "Summon" | "Seal" | "Relic" | "Any";
    } // defeat target
  | { type: "Revive"; target: "Summon" } // conjure Summon from discard
  | { type: "ConjureAlly"; might: number; tags?: string[] } // conjure a generic ally Summon with given might and tags
  | { type: "ConjureFoe"; might: number; tags?: string[] } // conjure a generic foe Summon with given might and tags
  | { type: "ModFocusCost"; amount: number } // increase or decrease focus cost by X
  | {
      type: "ClaimSite";
      duration: "ThisStep" | "WhilePresent" | "Ongoing";
    } // claim a site
  | {
      type: "AffectAll";
      friendlyFire: boolean;
      target: "Summon" | "Seal" | "Relic" | "Any";
      effect: MaterialEffect;
    } // deal any effect to every card of type at all sites
  | {
      type: "AffectAllAtSite";
      friendlyFire: boolean;
      target: "Summon" | "Seal" | "Relic" | "Any";
      effect: MaterialEffect;
    } // deal any effect to every card of type at one sites
  | { type: "Block"; target: "Site"; duration: "ThisStep" | "Ongoing" | number } // no Travel in/out of Site
  | { type: "Delayed"; delaySteps: number; effect: MaterialEffect } // deal effect X steps later
  | { type: "Repeat"; times: number; reducedBy?: number } // deal effect X more times, optionally reduced by Y each time
  | {
      type: "Banish";
      row: "materials" | "forms" | "sigils";
      amount: number;
    } // discard X cards of type from the forge // deal X damage to Summon for Y steps
  | { type: "Composite"; effects: MaterialEffect[] }; // combine effects

export interface MaterialComponent {
  id: string;
  kind: "Material";
  name: string; // e.g. "Blazing"
  path: Path;
  cost: number;
  compatibility: Exclude<Compatibility, "Both">; // Materials should be Instant or Ongoing
  resultText: string; // player-facing text
  effect: MaterialEffect; // engine-facing data
}

export type SigilModifier =
  | { type: "Echo"; reducedBy: number }
  | { type: "Focus"; bonusIfSingleTarget: number }
  | { type: "Overcharge"; bonus: number; drawback: "SelfDamage" | "LoseFocus" }
  | { type: "None" };

export interface SigilComponent {
  id: string;
  kind: "Sigil";
  subtitle: string; // e.g. "of Echoes"
  cost: number;
  text: string;
  modifier: SigilModifier;
}

export type Component = FormComponent | MaterialComponent | SigilComponent;

export interface CraftedCard {
  id: string;
  form: FormComponent;
  material: MaterialComponent;
  sigil?: SigilComponent;
  name: string; // "Blazing Bulwark of Echoes"
  totalCost: number;
  cardType: CardType;
  triggerText: string;
  resultText: string;
  currentMight?: number;
  baseMight?: number;
}
