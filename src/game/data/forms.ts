import { formSchema } from "./schemas";
import type { FormComponent } from "../types/cards";

const rawForms: FormComponent[] = [
  {
    id: "form-knight",
    kind: "Form",
    name: "Knight",
    cardType: "Summon",
    cost: 1,
    compatibility: "Both",
    trigger: "WhenAttacked",
    triggerText: "When Attacked:",
    impliedSubject: "Attacker",
    baseMight: 5,
  },
];

export const forms = rawForms.map((f) => formSchema.parse(f));
