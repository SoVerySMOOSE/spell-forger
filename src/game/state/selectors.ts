import { ALL_SPELLS_BY_ID } from "../data/setup";
import type { GameState, InPlaySpell } from "../model/gameState";
import { otherPlayer, type PlayerId } from "../model/keywords";
import type { Effect, SpellDefinition } from "../model/spell";
import { triggerMatchesAnnouncement } from "../rules/timing";
import { hasWorkUsage, makeWorkUsageKey } from "../rules/usage";

export const getSpellDefinition = (spellId: string): SpellDefinition => {
  return ALL_SPELLS_BY_ID[spellId];
};

export const getInPlayForPlayer = (
  state: GameState,
  player: PlayerId,
): InPlaySpell[] => {
  return state.inPlay.filter((spell) => spell.controller === player);
};

const canUsePlayWindow = (
  state: GameState,
  player: PlayerId,
  playWindow: "Work" | "Response" | "Any",
): boolean => {
  if (state.phase === "work") {
    return (
      player === state.activePlayer &&
      (playWindow === "Work" || playWindow === "Any")
    );
  }
  if (state.phase === "response") {
    return (
      player === otherPlayer(state.activePlayer) &&
      (playWindow === "Response" || playWindow === "Any")
    );
  }
  return false;
};

export const canPlaySpell = (
  state: GameState,
  player: PlayerId,
  spellId: string,
): boolean => {
  const spell = ALL_SPELLS_BY_ID[spellId];
  if (!spell) {
    return false;
  }
  if (!canUsePlayWindow(state, player, spell.playWindow)) {
    return false;
  }
  return state.power[player] >= spell.costPower;
};

const isReadyInPlay = (spell: InPlaySpell): boolean => {
  if (spell.status !== "inPlay" || spell.jamCounters > 0) {
    return false;
  }
  if (spell.type === "Seal" && !spell.armed) {
    return false;
  }
  return true;
};

const getForgeSlotCost = (
  state: GameState,
  player: PlayerId,
  slotIndex: number,
  spellId: string,
): number => {
  const spell = ALL_SPELLS_BY_ID[spellId];
  let reduction = 0;

  for (const discount of state.forgeSlotDiscounts) {
    if (
      discount.player === player &&
      discount.slotIndex === slotIndex &&
      discount.remainingUses > 0
    ) {
      reduction += discount.amount;
    }
  }

  if (slotIndex === 4) {
    const mechanista = state.inPlay.find(
      (entry) =>
        entry.controller === player &&
        entry.spellId === "mechanista-novem" &&
        isReadyInPlay(entry),
    );
    if (mechanista) {
      const key = makeWorkUsageKey(
        mechanista.instanceId,
        "mechanista-center-cost",
      );
      if (!hasWorkUsage(state, key)) {
        reduction += 1;
      }
    }
  }

  return Math.max(0, spell.costPower - reduction);
};

export const canPlayFromForgeSlot = (
  state: GameState,
  player: PlayerId,
  slotIndex: number,
): boolean => {
  const spellId = state.forgeGrid[slotIndex];
  if (!spellId) {
    return false;
  }
  const spell = ALL_SPELLS_BY_ID[spellId];
  if (!spell) {
    return false;
  }
  if (!canUsePlayWindow(state, player, spell.playWindow)) {
    return false;
  }
  return (
    state.power[player] >= getForgeSlotCost(state, player, slotIndex, spellId)
  );
};

export const canPlayFromReserve = (
  state: GameState,
  player: PlayerId,
  reserveIndex: number,
): boolean => {
  const key = player === 0 ? "player0" : "player1";
  const spellId = state.reserve[key][reserveIndex];
  if (!spellId) {
    return false;
  }
  return canPlaySpell(state, player, spellId);
};

export type TargetRequirement = {
  effectIndex: number;
  effect: Effect;
  optional?: boolean;
};

export const getResolveTargetRequirements = (
  spell: SpellDefinition,
): TargetRequirement[] => {
  const requirements: TargetRequirement[] = [];
  let effectIndex = 0;

  for (const ability of spell.abilities) {
    if (ability.timing !== "OnAnnounce") {
      continue;
    }
    for (const effect of ability.effects) {
      if (
        (effect.type === "Dispel" || effect.type === "Jam") &&
        (effect.target.kind === "chosenInPlaySpell" ||
          effect.target.kind === "chosenInPlaySpellOptional" ||
          effect.target.kind === "chosenArmedSeal" ||
          effect.target.kind === "chosenSummonWithMaxCost" ||
          effect.target.kind === "chosenJammedSpell")
      ) {
        requirements.push({
          effectIndex,
          effect,
          optional: effect.target.kind === "chosenInPlaySpellOptional",
        });
      }
      if (
        (effect.type === "GainAether" ||
          effect.type === "GainStress" ||
          effect.type === "Vent" ||
          effect.type === "Leech") &&
        ((effect.type !== "Leech" && effect.target.kind === "chosenCore") ||
          (effect.type === "Leech" &&
            (effect.from.kind === "chosenCore" ||
              effect.to.kind === "chosenCore")))
      ) {
        requirements.push({ effectIndex, effect });
      }
      if (
        effect.type === "GrantForgeSlotDiscount" ||
        effect.type === "DispelReserveCardForPower"
      ) {
        requirements.push({
          effectIndex,
          effect,
          optional: effect.type === "DispelReserveCardForPower",
        });
      }
      effectIndex += 1;
    }
  }

  return requirements;
};

export const getTriggeredSealsForPending = (
  state: GameState,
): InPlaySpell[] => {
  const pending = state.pendingAnnouncement;
  if (!pending) {
    return [];
  }
  const announced = ALL_SPELLS_BY_ID[pending.spellId];
  const order: PlayerId[] = [
    otherPlayer(state.activePlayer),
    state.activePlayer,
  ];
  const results: InPlaySpell[] = [];

  for (const controller of order) {
    const seals = state.inPlay.filter(
      (spell) =>
        spell.controller === controller &&
        spell.type === "Seal" &&
        spell.status === "inPlay" &&
        spell.armed &&
        spell.jamCounters === 0,
    );
    for (const seal of seals) {
      const definition = ALL_SPELLS_BY_ID[seal.spellId];
      const triggered = definition.abilities.some(
        (ability) =>
          ability.timing === "Response" &&
          ability.trigger !== undefined &&
          triggerMatchesAnnouncement(ability.trigger, seal.controller, {
            announcer: pending.controller,
            announcedType: announced.type,
            announcedCost: announced.costPower,
            source: pending.source,
            announcerStress: state.cores[pending.controller].stress,
          }),
      );
      if (triggered) {
        results.push(seal);
      }
    }
  }

  return results;
};

export const getLastEvents = (
  state: GameState,
  count: number,
): GameState["log"] => {
  return state.log.slice(Math.max(0, state.log.length - count));
};
