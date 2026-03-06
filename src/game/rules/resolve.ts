import type { GameState, InPlaySpell } from "../model/gameState";
import { otherPlayer, type PlayerId } from "../model/keywords";
import type {
  AbilityTiming,
  CoreTargetSpec,
  Effect,
  SpellDefinition,
  SpellTargetSpec,
  TargetChoice,
  TargetValue,
} from "../model/spell";
import { scryKeyForPlayer } from "../model/zones";
import { addJamCounters } from "./jam";

export interface EffectResolutionContext {
  sourceController: PlayerId;
  sourceInstanceId: string;
  pendingAnnouncementInstanceId?: string;
  pendingAnnouncementController?: PlayerId;
  targetChoices?: TargetChoice[];
}

export const addLog = (
  state: GameState,
  message: string,
  player: PlayerId | null = null,
): GameState => {
  const event = {
    id: state.nextEventId,
    cycle: state.cycleNumber,
    player,
    message,
  };
  return {
    ...state,
    log: [...state.log, event],
    nextEventId: state.nextEventId + 1,
  };
};

const setInPlaySpell = (
  state: GameState,
  instanceId: string,
  updater: (spell: InPlaySpell) => InPlaySpell,
): GameState => {
  const nextInPlay = state.inPlay.map((spell) => {
    if (spell.instanceId !== instanceId) {
      return spell;
    }
    return updater(spell);
  });
  return { ...state, inPlay: nextInPlay };
};

export const dispelInstance = (
  state: GameState,
  instanceId: string,
  player: PlayerId | null = null,
): GameState => {
  const spell = state.inPlay.find((entry) => entry.instanceId === instanceId);
  if (!spell) {
    return state;
  }
  const next = {
    ...state,
    inPlay: state.inPlay.filter((entry) => entry.instanceId !== instanceId),
    spent: [...state.spent, spell.spellId],
  };
  return addLog(next, `${spell.spellId} is Dispelled to Spent.`, player);
};

export const collectEffectsByTiming = (
  spell: SpellDefinition,
  timing: AbilityTiming,
): Effect[] => {
  const result: Effect[] = [];
  for (const ability of spell.abilities) {
    if (ability.timing !== timing) {
      continue;
    }
    result.push(...ability.effects);
  }
  return result;
};

const resolveChosenTarget = (
  choices: Map<number, TargetValue>,
  effectIndex: number,
): TargetValue | undefined => choices.get(effectIndex);

const resolveCoreTargetPlayer = (
  target: CoreTargetSpec,
  context: EffectResolutionContext,
  effectIndex: number,
  choices: Map<number, TargetValue>,
): PlayerId | null => {
  switch (target.kind) {
    case "selfCore":
      return context.sourceController;
    case "opponentCore":
      return otherPlayer(context.sourceController);
    case "announcedControllerCore":
      return context.pendingAnnouncementController ?? null;
    case "chosenCore": {
      const chosen = resolveChosenTarget(choices, effectIndex);
      if (chosen === 0 || chosen === 1) {
        return chosen;
      }
      return null;
    }
    default:
      return null;
  }
};

const resolveSpellTargetInstanceId = (
  state: GameState,
  target: SpellTargetSpec,
  context: EffectResolutionContext,
  effectIndex: number,
  choices: Map<number, TargetValue>,
): string | null => {
  switch (target.kind) {
    case "announcedSpell":
      return context.pendingAnnouncementInstanceId ?? null;
    case "selfSpell":
      return context.sourceInstanceId;
    case "chosenInPlaySpell": {
      const chosen = resolveChosenTarget(choices, effectIndex);
      if (typeof chosen !== "string") {
        return null;
      }
      return state.inPlay.some((spell) => spell.instanceId === chosen)
        ? chosen
        : null;
    }
    case "chosenArmedSeal": {
      const chosen = resolveChosenTarget(choices, effectIndex);
      if (typeof chosen !== "string") {
        return null;
      }
      const seal = state.inPlay.find((spell) => spell.instanceId === chosen);
      if (!seal || seal.type !== "Seal" || !seal.armed) {
        return null;
      }
      return chosen;
    }
    default:
      return null;
  }
};

const updateCore = (
  state: GameState,
  player: PlayerId,
  updater: (
    aether: number,
    stress: number,
  ) => { aether: number; stress: number },
): GameState => {
  const current = state.cores[player];
  const nextCore = updater(current.aether, current.stress);
  const cores: [GameState["cores"][0], GameState["cores"][1]] = [
    { ...state.cores[0] },
    { ...state.cores[1] },
  ];
  cores[player] = nextCore;
  return { ...state, cores };
};

export const applyEffects = (
  state: GameState,
  effects: Effect[],
  context: EffectResolutionContext,
): GameState => {
  const choices = new Map<number, TargetValue>();
  for (const choice of context.targetChoices ?? []) {
    choices.set(choice.effectIndex, choice.value);
  }

  let next = state;

  effects.forEach((effect, effectIndex) => {
    switch (effect.type) {
      case "GainAether": {
        const player = resolveCoreTargetPlayer(
          effect.target,
          context,
          effectIndex,
          choices,
        );
        if (player === null) {
          return;
        }
        next = updateCore(next, player, (aether, stress) => ({
          aether: aether + effect.amount,
          stress,
        }));
        return;
      }
      case "GainStress": {
        const player = resolveCoreTargetPlayer(
          effect.target,
          context,
          effectIndex,
          choices,
        );
        if (player === null) {
          return;
        }
        next = updateCore(next, player, (aether, stress) => ({
          aether,
          stress: stress + effect.amount,
        }));
        return;
      }
      case "Vent": {
        const player = resolveCoreTargetPlayer(
          effect.target,
          context,
          effectIndex,
          choices,
        );
        if (player === null) {
          return;
        }
        next = updateCore(next, player, (aether, stress) => ({
          aether,
          stress: Math.max(0, stress - effect.amount),
        }));
        return;
      }
      case "Leech": {
        const from = resolveCoreTargetPlayer(
          effect.from,
          context,
          effectIndex,
          choices,
        );
        const to = resolveCoreTargetPlayer(
          effect.to,
          context,
          effectIndex,
          choices,
        );
        if (from === null || to === null) {
          return;
        }
        const amount = Math.min(effect.amount, next.cores[from].aether);
        if (amount <= 0) {
          return;
        }
        next = updateCore(next, from, (aether, stress) => ({
          aether: aether - amount,
          stress,
        }));
        next = updateCore(next, to, (aether, stress) => ({
          aether: aether + amount,
          stress,
        }));
        return;
      }
      case "Dispel": {
        const targetId = resolveSpellTargetInstanceId(
          next,
          effect.target,
          context,
          effectIndex,
          choices,
        );
        if (!targetId) {
          return;
        }
        next = dispelInstance(next, targetId, context.sourceController);
        return;
      }
      case "Jam": {
        const targetId = resolveSpellTargetInstanceId(
          next,
          effect.target,
          context,
          effectIndex,
          choices,
        );
        if (!targetId) {
          return;
        }
        next = {
          ...next,
          inPlay: addJamCounters(next.inPlay, targetId, effect.counters),
        };
        return;
      }
      case "Scry": {
        const targetPlayer =
          effect.target === "self"
            ? context.sourceController
            : otherPlayer(context.sourceController);
        const key = scryKeyForPlayer(targetPlayer);
        const deck = [...next.forgeDeck];
        const reveals = [...next.scryReveals[key]];
        for (let i = 0; i < effect.amount; i += 1) {
          const drawn = deck.shift();
          if (!drawn) {
            break;
          }
          reveals.push(drawn);
        }
        next = {
          ...next,
          forgeDeck: deck,
          scryReveals: {
            ...next.scryReveals,
            [key]: reveals,
          },
        };
        return;
      }
      default:
        return;
    }
  });

  return next;
};

export const resolveAnnouncedSpellInstance = (
  state: GameState,
  instanceId: string,
  spellBook: Record<string, SpellDefinition>,
  targets: TargetChoice[] = [],
): GameState => {
  const spellInPlay = state.inPlay.find(
    (entry) => entry.instanceId === instanceId,
  );
  if (!spellInPlay) {
    return addLog(
      state,
      `Announced spell ${instanceId} was Dispelled during Response and does not resolve.`,
    );
  }

  let next = setInPlaySpell(state, instanceId, (spell) => ({
    ...spell,
    status: "inPlay",
  }));
  const spell = spellBook[spellInPlay.spellId];
  const context: EffectResolutionContext = {
    sourceController: spellInPlay.controller,
    sourceInstanceId: spellInPlay.instanceId,
    pendingAnnouncementInstanceId: state.pendingAnnouncement?.instanceId,
    pendingAnnouncementController: state.pendingAnnouncement?.controller,
    targetChoices: targets,
  };

  if (spellInPlay.jamCounters > 0) {
    return addLog(
      next,
      `${spell.name} is jammed (${spellInPlay.jamCounters}) and fails to resolve.`,
      spellInPlay.controller,
    );
  }

  const resolveEffects = collectEffectsByTiming(spell, "OnAnnounce");
  next = applyEffects(next, resolveEffects, context);

  if (spellInPlay.type === "Incantation") {
    next = dispelInstance(next, instanceId, spellInPlay.controller);
    return addLog(
      next,
      `${spell.name} resolves and is sent to Spent.`,
      spellInPlay.controller,
    );
  }

  if (spellInPlay.type === "Seal") {
    next = setInPlaySpell(next, instanceId, (entry) => ({
      ...entry,
      status: "inPlay",
      armed: true,
    }));
    return addLog(
      next,
      `${spell.name} enters play Armed.`,
      spellInPlay.controller,
    );
  }

  return addLog(next, `${spell.name} enters play.`, spellInPlay.controller);
};
