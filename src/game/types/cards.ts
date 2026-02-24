export type CardType = "Spell" | "Summon" | "Seal" | "Relic";
export type ComponentKind = "Form" | "Material" | "Sigil";
export type Compatibility = "Instant" | "Ongoing" | "Both";
export type TargetAlignment = "Friendly" | "Opposing" | "Both";

export type Path = "Ash" | "Stone" | "Bloom" | "Gale" | "Shade" | "Dawn";

export type FormTrigger =
  | "TargetSummon"
  | "TargetSeal"
  | "TargetRelic"
  | "SummonEnters"
  | "OnAttack"
  | "OnDefend"
  | "OnClash"
  | "WhenPlayed"
  | "WhileAtSite"
  | "StartOfTurn"
  | "EndOfTurn"
  | "Activate";

export type ImpliedSubject =
  | "Target"
  | "This"
  | "Attacker"
  | "Defender"
  | "OpposingSummon"
  | "EnteringSummon"
  | "OccupyingSummon"
  | "Bearer"
  | "Site"
  | "None";

export type MaterialEffect =
  | { type: "Damage"; target: "Summon"; amount: number } // deal X damage to Summon
  | {
      type: "Burn";

      amount: number;
      durationSteps: number;
    } // deal X damage to Summon for Y steps
  | { type: "Armor"; target: "Summon"; amount: number } // decrease opposing Summons might by X during clash
  | { type: "Brittle"; target: "Summon"; amount: number } // decrease Summons might by X during clash
  | { type: "Recover"; target: "Summon"; amount: number } // heal X damage
  | {
      type: "Move";
      target: "Summon" | "Seal" | "SummonOrSeal";
      amount: number;
    } // a Summon Moves X sites
  | {
      type: "Cleanse";
      target: "Summon" | "Seal" | "Relic" | "Any";
      amount: number;
    } // remove chosen statuses, keywords, or text
  | { type: "Composite"; effects: MaterialEffect[] }; // combine effects

export type SigilModifier =
  | { type: "Echo"; reducedBy: number }
  | { type: "Overcharge"; bonus: number }
  | { type: "None" };

export interface FormComponent {
  id: string;
  kind: "Form";
  name: string;
  cardType: CardType;
  cost: number;
  compatibility: Compatibility;
  targetAlignment: TargetAlignment;
  trigger: FormTrigger[];
  triggerText: string; // player-facing text
  impliedSubject: ImpliedSubject;
  baseMight?: number; // Summons only
}

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
  name: string;
  totalCost: number;
  cardType: CardType;
  triggerText: string;
  resultText: string;
  currentMight?: number;
  baseMight?: number;
}
