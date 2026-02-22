import type {
  CraftedCard,
  FormComponent,
  MaterialComponent,
  SigilComponent,
} from "./cards";

export type SiteId = "left" | "center" | "right";
export type PlayerId = "P1" | "P2";

export interface SiteState {
  id: SiteId;
  summons: CraftedCard[]; // later you may split by controller
  seals: CraftedCard[];
  relics: CraftedCard[]; // or attach relics to summons directly
}

export interface ForgeState {
  materials: MaterialComponent[];
  forms: FormComponent[];
  sigils: SigilComponent[];
}

export interface CraftTrayState {
  material?: MaterialComponent;
  form?: FormComponent;
  sigil?: SigilComponent;
  preview?: CraftedCard;
}

export interface PlayerState {
  id: PlayerId;
  focus: number;
  paths: string[]; // tighten later to Path[]
  signatureSummon?: CraftedCard;
  signatureTax: number;
}

export interface GameState {
  activePlayer: PlayerId;
  round: number;
  forge: ForgeState;
  tray: CraftTrayState;
  sites: Record<SiteId, SiteState>;
  players: Record<PlayerId, PlayerState>;
  log: string[];
}
