import {
  ALL_SPELLS_BY_ID,
  createNewGameState,
  makeInstanceId,
} from "../data/setup";
import type { GameState } from "../model/gameState";
import { PLAYER_IDS, otherPlayer, type PlayerId } from "../model/keywords";
import type { TargetChoice } from "../model/spell";
import { scryKeyForPlayer, type SpellSource } from "../model/zones";
import type { GameAction } from "./actions";
import { refillForgeGrid } from "./forge";
import { isJammed, removeOneJamFromMany } from "./jam";
import {
  addLog,
  applyEffects,
  collectEffectsByTiming,
  resolveAnnouncedSpellInstance,
} from "./resolve";
import {
  advanceToNextTurn,
  startWorkForActivePlayer,
  triggerMatchesAnnouncement,
} from "./timing";

const canPlayInWorkWindow = (window: "Work" | "Response" | "Any"): boolean =>
  window === "Work" || window === "Any";

const canPlayInResponseWindow = (
  window: "Work" | "Response" | "Any",
): boolean => window === "Response" || window === "Any";

const withUpdatedPower = (
  state: GameState,
  player: PlayerId,
  updater: (value: number) => number,
): GameState => {
  const power: [number, number] = [...state.power] as [number, number];
  power[player] = updater(power[player]);
  return { ...state, power };
};

const evaluateOutcome = (
  state: GameState,
): {
  winner: PlayerId;
  loser: PlayerId;
  reason: "stress" | "aether";
} | null => {
  for (const player of PLAYER_IDS) {
    if (state.cores[player].stress >= 10) {
      return { loser: player, winner: otherPlayer(player), reason: "stress" };
    }
  }
  for (const player of PLAYER_IDS) {
    if (state.cores[player].aether >= 10) {
      return { winner: player, loser: otherPlayer(player), reason: "aether" };
    }
  }
  return null;
};

const removeCardFromSource = (
  state: GameState,
  player: PlayerId,
  source: SpellSource,
  expectedSpellId: string,
): GameState | null => {
  if (source.zone === "forge") {
    const existing = state.forgeGrid[source.slotIndex];
    if (existing !== expectedSpellId) {
      return null;
    }
    const nextForge = [...state.forgeGrid];
    nextForge[source.slotIndex] = null;
    return { ...state, forgeGrid: nextForge };
  }

  const key = scryKeyForPlayer(player);
  const reveals = [...state.scryReveals[key]];
  if (reveals[source.revealIndex] !== expectedSpellId) {
    return null;
  }
  reveals.splice(source.revealIndex, 1);
  return {
    ...state,
    scryReveals: {
      ...state.scryReveals,
      [key]: reveals,
    },
  };
};

const addAnnouncementToInPlay = (
  state: GameState,
  player: PlayerId,
  spellId: string,
): { state: GameState; instanceId: string } => {
  const spell = ALL_SPELLS_BY_ID[spellId];
  const instanceId = makeInstanceId(state.nextInstanceNumber);
  const next = {
    ...state,
    inPlay: [
      ...state.inPlay,
      {
        instanceId,
        spellId,
        controller: player,
        type: spell.type,
        jamCounters: 0,
        status: "announced" as const,
      },
    ],
    nextInstanceNumber: state.nextInstanceNumber + 1,
  };
  return { state: next, instanceId };
};

const resolveTriggeredSeals = (state: GameState): GameState => {
  const pending = state.pendingAnnouncement;
  if (!pending) {
    return state;
  }

  const announcedType = ALL_SPELLS_BY_ID[pending.spellId].type;
  const responseOrder: PlayerId[] = [
    otherPlayer(state.activePlayer),
    state.activePlayer,
  ];

  let next = state;

  for (const controller of responseOrder) {
    const candidateSeals = next.inPlay.filter(
      (entry) =>
        entry.controller === controller &&
        entry.type === "Seal" &&
        entry.status === "inPlay" &&
        entry.armed &&
        !isJammed(entry),
    );

    for (const seal of candidateSeals) {
      const currentSeal = next.inPlay.find(
        (entry) => entry.instanceId === seal.instanceId,
      );
      if (!currentSeal || !currentSeal.armed || isJammed(currentSeal)) {
        continue;
      }

      const definition = ALL_SPELLS_BY_ID[currentSeal.spellId];
      const triggeredAbilities = definition.abilities.filter(
        (ability) =>
          ability.timing === "Response" &&
          ability.trigger !== undefined &&
          triggerMatchesAnnouncement(
            ability.trigger,
            currentSeal.controller,
            pending.controller,
            announcedType,
          ),
      );

      if (triggeredAbilities.length === 0) {
        continue;
      }

      next = addLog(
        next,
        `${definition.name} triggers in Response.`,
        currentSeal.controller,
      );

      for (const ability of triggeredAbilities) {
        next = applyEffects(next, ability.effects, {
          sourceController: currentSeal.controller,
          sourceInstanceId: currentSeal.instanceId,
          pendingAnnouncementInstanceId: pending.instanceId,
          pendingAnnouncementController: pending.controller,
        });
      }

      const survivingSeal = next.inPlay.find(
        (entry) => entry.instanceId === currentSeal.instanceId,
      );
      if (survivingSeal && survivingSeal.armed) {
        next = {
          ...next,
          inPlay: next.inPlay.map((entry) =>
            entry.instanceId === currentSeal.instanceId
              ? { ...entry, armed: false }
              : entry,
          ),
        };
      }
    }
  }

  return next;
};

const runMaintenanceTriggers = (state: GameState): GameState => {
  const order = state.inPlay.map((spell) => spell.instanceId);
  let next = { ...state };

  for (const instanceId of order) {
    const instance = next.inPlay.find(
      (entry) => entry.instanceId === instanceId,
    );
    if (!instance || instance.status !== "inPlay" || isJammed(instance)) {
      continue;
    }
    const spell = ALL_SPELLS_BY_ID[instance.spellId];
    const effects = collectEffectsByTiming(spell, "Maintenance");
    if (effects.length === 0) {
      continue;
    }
    next = addLog(
      next,
      `${spell.name} triggers during Maintenance.`,
      instance.controller,
    );
    next = applyEffects(next, effects, {
      sourceController: instance.controller,
      sourceInstanceId: instance.instanceId,
    });
  }

  return next;
};

const resolveUnjammedIncantations = (
  state: GameState,
  player: PlayerId,
): GameState => {
  let next = state;
  const readyIncantations = next.inPlay
    .filter(
      (entry) =>
        entry.controller === player &&
        entry.type === "Incantation" &&
        entry.status === "inPlay" &&
        entry.jamCounters === 0,
    )
    .map((entry) => entry.instanceId);

  for (const instanceId of readyIncantations) {
    const stillThere = next.inPlay.some(
      (entry) => entry.instanceId === instanceId,
    );
    if (!stillThere) {
      continue;
    }
    next = addLog(
      next,
      `Unjammed Incantation ${instanceId} resolves immediately.`,
      player,
    );
    next = resolveAnnouncedSpellInstance(next, instanceId, ALL_SPELLS_BY_ID);
  }
  return next;
};

const cleanupScryReveals = (state: GameState, player: PlayerId): GameState => {
  const key = scryKeyForPlayer(player);
  const leftover = state.scryReveals[key];
  if (leftover.length === 0) {
    return state;
  }

  return addLog(
    {
      ...state,
      spent: [...state.spent, ...leftover],
      scryReveals: {
        ...state.scryReveals,
        [key]: [],
      },
    },
    `Unplayed Scry reveals (${leftover.length}) are Dispelled to Spent.`,
    player,
  );
};

const finalizeMaintenance = (state: GameState): GameState => {
  const outcome = evaluateOutcome(state);
  if (outcome) {
    const message =
      outcome.reason === "stress"
        ? `Player ${outcome.loser} shatters at 10 Stress. Player ${outcome.winner} wins.`
        : `Player ${outcome.winner} saturates at 10 Aether and wins.`;
    return addLog(
      {
        ...state,
        phase: "gameOver",
        winner: outcome.winner,
        loser: outcome.loser,
        pendingAnnouncement: null,
      },
      message,
    );
  }

  const refilled = refillForgeGrid(state.forgeGrid, state.forgeDeck);
  let next: GameState = {
    ...state,
    forgeGrid: refilled.forgeGrid,
    forgeDeck: refilled.forgeDeck,
    pendingAnnouncement: null,
  };

  next = advanceToNextTurn(next);
  next = startWorkForActivePlayer(next);
  return addLog(
    next,
    `Turn passes to Player ${next.activePlayer}. Cycle ${next.cycleNumber}.`,
    next.activePlayer,
  );
};

const announceFromWorkOrResponse = (
  state: GameState,
  player: PlayerId,
  source: SpellSource,
  spellId: string,
  targets: TargetChoice[] = [],
): GameState => {
  const spell = ALL_SPELLS_BY_ID[spellId];
  if (!spell) {
    return state;
  }

  if (state.phase === "work") {
    if (
      player !== state.activePlayer ||
      !canPlayInWorkWindow(spell.playWindow)
    ) {
      return state;
    }
  } else if (state.phase === "response") {
    if (
      player === state.activePlayer ||
      !canPlayInResponseWindow(spell.playWindow)
    ) {
      return state;
    }
  } else {
    return state;
  }

  if (state.power[player] < spell.costPower) {
    return state;
  }

  const removed = removeCardFromSource(state, player, source, spellId);
  if (!removed) {
    return state;
  }

  let next = withUpdatedPower(
    removed,
    player,
    (value) => value - spell.costPower,
  );
  const announced = addAnnouncementToInPlay(next, player, spellId);
  next = announced.state;

  next = addLog(
    next,
    `Player ${player} ${spell.type === "Summon" ? "Conjures" : spell.type === "Incantation" ? "Speaks" : "Prepares"} ${spell.name}.`,
    player,
  );

  if (state.phase === "work") {
    return {
      ...next,
      phase: "response",
      pendingAnnouncement: {
        instanceId: announced.instanceId,
        spellId,
        controller: player,
        source,
        targets,
      },
    };
  }

  return resolveAnnouncedSpellInstance(
    next,
    announced.instanceId,
    ALL_SPELLS_BY_ID,
    targets,
  );
};

export const reduce = (state: GameState, action: GameAction): GameState => {
  if (action.type === "NewGame") {
    return createNewGameState(action.seed);
  }

  if (state.phase === "gameOver") {
    return state;
  }

  switch (action.type) {
    case "DrawPower": {
      if (state.phase !== "work" || action.player !== state.activePlayer) {
        return state;
      }
      if (state.power[action.player] >= state.powerLimit[action.player]) {
        return state;
      }
      const next = withUpdatedPower(state, action.player, (value) => value + 1);
      return addLog(
        next,
        `Player ${action.player} draws 1 Power.`,
        action.player,
      );
    }
    case "AnnounceSpell": {
      return announceFromWorkOrResponse(
        state,
        action.player,
        action.source,
        action.spellId,
        action.targets ?? [],
      );
    }
    case "ResolveResponse": {
      if (state.phase !== "response" || !state.pendingAnnouncement) {
        return state;
      }

      const pending = state.pendingAnnouncement;
      let next = resolveTriggeredSeals(state);
      next = resolveAnnouncedSpellInstance(
        next,
        pending.instanceId,
        ALL_SPELLS_BY_ID,
        pending.targets,
      );

      return {
        ...next,
        phase: "work",
        pendingAnnouncement: null,
      };
    }
    case "AdvancePhase": {
      if (state.phase !== "work") {
        return state;
      }
      let next: GameState = {
        ...state,
        phase: "maintenance_unjam",
      };
      next = runMaintenanceTriggers(next);
      return next;
    }
    case "ChooseUnjam": {
      if (
        state.phase !== "maintenance_unjam" ||
        action.player !== state.activePlayer
      ) {
        return state;
      }
      let next: GameState = {
        ...state,
        inPlay: removeOneJamFromMany(
          state.inPlay,
          action.player,
          action.instanceIds,
        ),
      };
      next = resolveUnjammedIncantations(next, action.player);
      next = cleanupScryReveals(next, action.player);
      next = finalizeMaintenance(next);
      return next;
    }
    default:
      return state;
  }
};
