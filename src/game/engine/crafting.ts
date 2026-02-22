import type {
  FormComponent,
  MaterialComponent,
  SigilComponent,
  CraftedCard,
} from "../types/cards";

export function isCompatible(
  form: FormComponent,
  material: MaterialComponent,
): boolean {
  if (form.compatibility === "Both") return true;
  return form.compatibility === material.compatibility;
}

export function buildCraftedCard(
  form: FormComponent,
  material: MaterialComponent,
  sigil?: SigilComponent,
): CraftedCard {
  const name = `${material.name} ${form.name}${sigil ? ` ${sigil.subtitle}` : ""}`;
  const totalCost = form.cost + material.cost + (sigil?.cost ?? 0);

  return {
    id: `crafted-${crypto.randomUUID()}`,
    form,
    material,
    sigil,
    name,
    totalCost,
    cardType: form.cardType,
    triggerText: form.triggerText,
    resultText: material.resultText,
    baseMight: form.baseMight,
    currentMight: form.baseMight,
  };
}
