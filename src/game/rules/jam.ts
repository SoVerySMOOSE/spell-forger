import type { InPlaySpell } from "../model/gameState";
import type { PlayerId } from "../model/keywords";

export const isJammed = (spell: InPlaySpell): boolean => spell.jamCounters > 0;

export const addJamCounters = (
  inPlay: InPlaySpell[],
  instanceId: string,
  counters: number,
): InPlaySpell[] => {
  if (counters <= 0) {
    return inPlay;
  }
  return inPlay.map((spell) => {
    if (spell.instanceId !== instanceId) {
      return spell;
    }
    return { ...spell, jamCounters: spell.jamCounters + counters };
  });
};

export const removeOneJamFromMany = (
  inPlay: InPlaySpell[],
  controller: PlayerId,
  instanceIds: string[],
): InPlaySpell[] => {
  const chosen = new Set(instanceIds);
  return inPlay.map((spell) => {
    if (
      spell.controller !== controller ||
      spell.jamCounters <= 0 ||
      !chosen.has(spell.instanceId)
    ) {
      return spell;
    }
    return { ...spell, jamCounters: spell.jamCounters - 1 };
  });
};
