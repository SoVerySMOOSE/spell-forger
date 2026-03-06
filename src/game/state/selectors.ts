import { ALL_SPELLS_BY_ID } from "../data/setup";
import type { GameState, InPlaySpell } from "../model/gameState";
import { otherPlayer, type PlayerId } from "../model/keywords";
import type { Effect, SpellDefinition } from "../model/spell";
import { triggerMatchesAnnouncement } from "../rules/timing";

export const getSpellDefinition = (spellId: string): SpellDefinition => {
  return ALL_SPELLS_BY_ID[spellId];
};

export const getInPlayForPlayer = (
  state: GameState,
  player: PlayerId,
): InPlaySpell[] => {
  return state.inPlay.filter((spell) => spell.controller === player);
};

export const canDrawPower = (state: GameState, player: PlayerId): boolean => {
  return (
    state.phase === "work" &&
    state.activePlayer === player &&
    state.power[player] < state.powerLimit[player]
  );
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

export const canPlayFromForgeSlot = (
  state: GameState,
  player: PlayerId,
  slotIndex: number,
): boolean => {
  const spellId = state.forgeGrid[slotIndex];
  if (!spellId) {
    return false;
  }
  return canPlaySpell(state, player, spellId);
};

export const canPlayFromScryReveal = (
  state: GameState,
  player: PlayerId,
  revealIndex: number,
): boolean => {
  const key = player === 0 ? "player0" : "player1";
  const spellId = state.scryReveals[key][revealIndex];
  if (!spellId) {
    return false;
  }
  return canPlaySpell(state, player, spellId);
};

export type TargetRequirement = {
  effectIndex: number;
  effect: Effect;
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
          effect.target.kind === "chosenArmedSeal")
      ) {
        requirements.push({ effectIndex, effect });
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
          triggerMatchesAnnouncement(
            ability.trigger,
            seal.controller,
            pending.controller,
            announced.type,
          ),
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
