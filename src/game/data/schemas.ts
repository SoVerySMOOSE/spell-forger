import { z } from "zod";

export const formSchema = z.object({
  id: z.string(),
  kind: z.literal("Form"),
  name: z.string(),
  cardType: z.enum(["Spell", "Summon", "Seal", "Relic"]),
  cost: z.number().int().min(0),
  compatibility: z.enum(["Instant", "Ongoing", "Both"]),
  targetAlighnment: z.enum(["Friendly", "Opposing", "Both"]),
  trigger: z.string(),
  triggerText: z.string(),
  impliedSubject: z.string(),
  baseMight: z.number().int().positive().optional(),
});

export const materialSchema = z.object({
  id: z.string(),
  kind: z.literal("Material"),
  name: z.string(),
  path: z.enum(["Ash", "Stone", "Bloom", "Gale", "Shade", "Dawn"]),
  cost: z.number().int().min(0),
  compatibility: z.enum(["Instant", "Ongoing"]),
  resultText: z.string(),
  effect: z.any(), // tighten later
});

export const sigilSchema = z.object({
  id: z.string(),
  kind: z.literal("Sigil"),
  subtitle: z.string(),
  cost: z.number().int().min(0),
  text: z.string(),
  modifier: z.any(), // tighten later
});
