import { sigilSchema } from "./schemas";
import type { SigilComponent } from "../types/cards";

const rawSigils: SigilComponent[] = [
  {
    id: "sigil-echoes",
    kind: "Sigil",
    cost: 1,
    subtitle: "of Echoes",
    text: "Trigger again next Step, reducing it by 1.",
    modifier: { type: "Echo", reducedBy: 1 },
  },
  {
    id: "sigil-overcharge",
    kind: "Sigil",
    cost: 1,
    subtitle: "Overcharged",
    text: "Increase all variables by 1.",
    modifier: { type: "Overcharge", bonus: 1 },
  },
];

export const sigils = rawSigils.map((f) => sigilSchema.parse(f));
