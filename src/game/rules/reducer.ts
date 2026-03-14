import {
  ALL_SPELLS_BY_ID,
  createNewGameState,
  makeInstanceId,
} from "../data/setup";
import type { GameState } from "../model/gameState";
import { PLAYER_IDS, otherPlayer, type PlayerId } from "../model/keywords";
import type { AbilityTiming, TargetChoice } from "../model/spell";
import { reserveKeyForPlayer, type SpellSource } from "../model/zones";
import type { GameAction } from "./actions";
import { refillForgeGrid } from "./forge";
import { isJammed, removeOneJamFromMany } from "./jam";
import {
  addLog,
  applyEffects,
  collectEffectsByTiming,
  dispelInstance,
  resolveAnnouncedSpellInstance,
} from "./resolve";
import {
  advanceToNextTurn,
  refreshPowerForActivePlayer,
  startWorkForActivePlayer,
  triggerMatchesAnnouncement,
} from "./timing";
import {
  hasCycleUsage,
  hasWorkUsage,
  makeCycleUsageKey,
  makeWorkUsageKey,
  markCycleUsage,
  markWorkUsage,
} from "./usage";

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

const isReadyInPlay = (stateSpell: GameState["inPlay"][number]): boolean => {
  if (stateSpell.status !== "inPlay" || isJammed(stateSpell)) {
    return false;
  }
  if (stateSpell.type === "Seal" && !stateSpell.armed) {
    return false;
  }
  return true;
};

const getReadySpellsById = (
  state: GameState,
  spellId: string,
  controller?: PlayerId,
) =>
  state.inPlay.filter(
    (spell) =>
      spell.spellId === spellId &&
      (controller === undefined || spell.controller === controller) &&
      isReadyInPlay(spell),
  );

const setGameOver = (
  state: GameState,
  winner: PlayerId,
  loser: PlayerId,
  message: string,
): GameState => {
  if (state.phase === "gameOver") {
    return state;
  }
  return addLog(
    {
      ...state,
      phase: "gameOver",
      winner,
      loser,
      pendingAnnouncement: null,
    },
    message,
  );
};

const applyImmediateStressCheck = (state: GameState): GameState => {
  if (state.phase === "gameOver") {
    return state;
  }
  for (const player of PLAYER_IDS) {
    if (state.cores[player].stress >= 10) {
      return setGameOver(
        state,
        otherPlayer(player),
        player,
        `Player ${player} shatters at 10 Stress. Player ${otherPlayer(player)} wins immediately.`,
      );
    }
  }
  return state;
};

const applyStandbySaturationCheck = (state: GameState): GameState => {
  if (state.phase === "gameOver") {
    return state;
  }
  const active = state.activePlayer;
  if (state.cores[active].aether >= 10) {
    return setGameOver(
      state,
      active,
      otherPlayer(active),
      `Player ${active} begins turn at 10+ Aether and wins by Saturation.`,
    );
  }
  return state;
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

  const key = reserveKeyForPlayer(player);
  const reveals = [...state.reserve[key]];
  if (reveals[source.reserveIndex] !== expectedSpellId) {
    return null;
  }
  reveals.splice(source.reserveIndex, 1);
  return {
    ...state,
    reserve: {
      ...state.reserve,
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
        cardId: spellId,
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

const describeSpellSource = (source: SpellSource): string => {
  if (source.zone === "forge") {
    return `Forge slot ${source.slotIndex + 1}`;
  }
  return `Reserve index ${source.reserveIndex + 1}`;
};

const runTimedTriggers = (
  state: GameState,
  timing: Extract<AbilityTiming, "Standby" | "Maintenance">,
): GameState => {
  const order = state.inPlay
    .filter((spell) => spell.controller === state.activePlayer)
    .map((spell) => spell.instanceId);
  let next = state;

  for (const instanceId of order) {
    const instance = next.inPlay.find(
      (entry) => entry.instanceId === instanceId,
    );
    if (!instance || instance.status !== "inPlay" || isJammed(instance)) {
      continue;
    }
    const spell = ALL_SPELLS_BY_ID[instance.spellId];
    const effects = collectEffectsByTiming(spell, timing);
    if (effects.length === 0) {
      // continue into hardcoded advanced rules below.
    } else {
      next = addLog(
        next,
        `${spell.name} triggers during ${timing}.`,
        instance.controller,
      );
      next = applyEffects(next, effects, {
        sourceController: instance.controller,
        sourceInstanceId: instance.instanceId,
      });
      next = applyImmediateStressCheck(next);
      if (next.phase === "gameOver") {
        return next;
      }
    }

    if (timing !== "Maintenance") {
      continue;
    }

    switch (instance.spellId) {
      case "chimaera-exhauriens": {
        if (next.cores[instance.controller].stress > 0) {
          next = applyEffects(
            next,
            [
              { type: "Vent", amount: 1, target: { kind: "selfCore" } },
              { type: "GainAether", amount: 1, target: { kind: "selfCore" } },
            ],
            {
              sourceController: instance.controller,
              sourceInstanceId: instance.instanceId,
            },
          );
        }
        break;
      }
      case "draco-velluminis": {
        if (next.turnIncantationCount > 0) {
          next = applyEffects(
            next,
            [{ type: "GainAether", amount: 1, target: { kind: "selfCore" } }],
            {
              sourceController: instance.controller,
              sourceInstanceId: instance.instanceId,
            },
          );
        }
        break;
      }
      case "basiliscus-riveti": {
        const opp = otherPlayer(instance.controller);
        if (next.cores[opp].stress >= 5) {
          next = applyEffects(
            next,
            [
              {
                type: "GainStress",
                amount: 1,
                target: { kind: "opponentCore" },
              },
            ],
            {
              sourceController: instance.controller,
              sourceInstanceId: instance.instanceId,
            },
          );
        }
        break;
      }
      case "custos-campanae": {
        if (next.cores[instance.controller].stress === 0) {
          next = applyEffects(
            next,
            [{ type: "GainAether", amount: 3, target: { kind: "selfCore" } }],
            {
              sourceController: instance.controller,
              sourceInstanceId: instance.instanceId,
            },
          );
        }
        break;
      }
      case "cor-crucibuli": {
        if (next.cores[instance.controller].stress >= 6) {
          next = applyEffects(
            next,
            [{ type: "GainAether", amount: 2, target: { kind: "selfCore" } }],
            {
              sourceController: instance.controller,
              sourceInstanceId: instance.instanceId,
            },
          );
        }
        break;
      }
      case "leviathan-atramenti": {
        if (next.turnIncantationCount >= 2) {
          next = applyEffects(
            next,
            [{ type: "GainAether", amount: 1, target: { kind: "selfCore" } }],
            {
              sourceController: instance.controller,
              sourceInstanceId: instance.instanceId,
            },
          );
        }
        break;
      }
      case "archivista-riftis": {
        if (next.turnSpellCount === 0) {
          next = applyEffects(
            next,
            [
              { type: "Vent", amount: 2, target: { kind: "selfCore" } },
              { type: "GainAether", amount: 2, target: { kind: "selfCore" } },
            ],
            {
              sourceController: instance.controller,
              sourceInstanceId: instance.instanceId,
            },
          );
        }
        break;
      }
      case "seraph-reticuli": {
        const armedSealCount = next.inPlay.filter(
          (spellInPlay) =>
            spellInPlay.controller === instance.controller &&
            spellInPlay.type === "Seal" &&
            spellInPlay.status === "inPlay" &&
            spellInPlay.armed &&
            !isJammed(spellInPlay),
        ).length;
        const amount = Math.min(3, armedSealCount);
        if (amount > 0) {
          next = applyEffects(
            next,
            [{ type: "GainAether", amount, target: { kind: "selfCore" } }],
            {
              sourceController: instance.controller,
              sourceInstanceId: instance.instanceId,
            },
          );
        }
        break;
      }
      default:
        break;
    }

    next = applyImmediateStressCheck(next);
    if (next.phase === "gameOver") {
      return next;
    }
  }

  return next;
};

const runStandbyForActivePlayer = (state: GameState): GameState => {
  let next: GameState = {
    ...state,
    workUsageKeys: [],
    turnSpellCount: 0,
    turnIncantationCount: 0,
    forgeSlotDiscounts: state.forgeSlotDiscounts.filter(
      (discount) => discount.player !== state.activePlayer,
    ),
  };

  next = addLog(
    next,
    `Standby begins for Player ${state.activePlayer}.`,
    state.activePlayer,
  );
  next = runTimedTriggers(next, "Standby");
  next = applyImmediateStressCheck(next);
  if (next.phase === "gameOver") {
    return next;
  }

  next = applyStandbySaturationCheck(next);
  if (next.phase === "gameOver") {
    return next;
  }

  next = refreshPowerForActivePlayer(next);
  next = startWorkForActivePlayer(next);
  return addLog(
    next,
    `Player ${next.activePlayer} refreshes Power to ${next.cycleNumber}.`,
    next.activePlayer,
  );
};

const resolveTriggeredResponseAbilities = (state: GameState): GameState => {
  const pending = state.pendingAnnouncement;
  if (!pending) {
    return state;
  }

  const announcedSpell = ALL_SPELLS_BY_ID[pending.spellId];
  const responseOrder: PlayerId[] = [
    otherPlayer(state.activePlayer),
    state.activePlayer,
  ];
  const announcementContext = {
    announcer: pending.controller,
    announcedType: announcedSpell.type,
    announcedCost: announcedSpell.costPower,
    source: pending.source,
    announcerStress: state.cores[pending.controller].stress,
  };
  let next = state;

  for (const controller of responseOrder) {
    const candidateSpells = next.inPlay.filter(
      (entry) =>
        entry.controller === controller &&
        entry.status === "inPlay" &&
        (entry.type !== "Seal" || entry.armed) &&
        !isJammed(entry),
    );

    for (const spellInPlay of candidateSpells) {
      const currentSeal = next.inPlay.find(
        (entry) => entry.instanceId === spellInPlay.instanceId,
      );
      if (
        !currentSeal ||
        (currentSeal.type === "Seal" && !currentSeal.armed) ||
        isJammed(currentSeal)
      ) {
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
            announcementContext,
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
        if (currentSeal.spellId === "auditor-fuliginis") {
          const key = makeWorkUsageKey(
            currentSeal.instanceId,
            "auditor-response-scry",
          );
          if (hasWorkUsage(next, key)) {
            continue;
          }
          next = markWorkUsage(next, key);
        }

        if (currentSeal.spellId === "turris-runarum") {
          const key = makeCycleUsageKey(
            currentSeal.instanceId,
            "turris-response-jam",
          );
          if (
            hasCycleUsage(next, key) ||
            next.cores[currentSeal.controller].stress + 1 >= 10
          ) {
            continue;
          }
          next = markCycleUsage(next, key);
        }

        if (currentSeal.spellId === "duelista-carbonis") {
          const key = makeCycleUsageKey(
            currentSeal.instanceId,
            "duelista-response-dispel",
          );
          if (
            hasCycleUsage(next, key) ||
            next.cores[currentSeal.controller].stress + 2 >= 10
          ) {
            continue;
          }
          next = markCycleUsage(next, key);
        }

        next = applyEffects(next, ability.effects, {
          sourceController: currentSeal.controller,
          sourceInstanceId: currentSeal.instanceId,
          pendingAnnouncementInstanceId: pending.instanceId,
          pendingAnnouncementController: pending.controller,
        });
        next = applyImmediateStressCheck(next);
        if (next.phase === "gameOver") {
          return next;
        }
      }

      const survivingSeal = next.inPlay.find(
        (entry) => entry.instanceId === currentSeal.instanceId,
      );
      if (survivingSeal && survivingSeal.type === "Seal") {
        next = dispelInstance(
          next,
          survivingSeal.instanceId,
          survivingSeal.controller,
        );
      }
    }
  }

  return next;
};

const hasManualResponseOptions = (state: GameState): boolean => {
  if (state.phase !== "response" || !state.pendingAnnouncement) {
    return false;
  }

  const responder = otherPlayer(state.activePlayer);
  const canPlayResponseSpell = (spellId: string | null): boolean => {
    if (!spellId) {
      return false;
    }
    const spell = ALL_SPELLS_BY_ID[spellId];
    if (!spell) {
      return false;
    }
    if (!canPlayInResponseWindow(spell.playWindow)) {
      return false;
    }
    return state.power[responder] >= spell.costPower;
  };

  if (state.forgeGrid.some((spellId) => canPlayResponseSpell(spellId))) {
    return true;
  }

  const reserveKey = reserveKeyForPlayer(responder);
  return state.reserve[reserveKey].some((spellId) =>
    canPlayResponseSpell(spellId),
  );
};

const finishPendingResponse = (state: GameState): GameState => {
  if (state.phase !== "response" || !state.pendingAnnouncement) {
    return state;
  }

  const pending = state.pendingAnnouncement;
  let next = resolveTriggeredResponseAbilities(state);
  if (next.phase === "gameOver") {
    return next;
  }

  next = resolveAnnouncedSpellInstance(
    next,
    pending.instanceId,
    ALL_SPELLS_BY_ID,
    pending.targets,
  );
  next = applyImmediateStressCheck(next);
  if (next.phase === "gameOver") {
    return next;
  }

  return {
    ...next,
    phase: "work",
    pendingAnnouncement: null,
  };
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
    next = applyImmediateStressCheck(next);
    if (next.phase === "gameOver") {
      return next;
    }
  }
  return next;
};

const endTurnFromMaintenance = (state: GameState): GameState => {
  const refilled = refillForgeGrid(state.forgeGrid, state.forgeDeck);
  let next: GameState = {
    ...state,
    forgeGrid: refilled.forgeGrid,
    forgeDeck: refilled.forgeDeck,
    pendingAnnouncement: null,
    forgeSlotDiscounts: [],
  };

  const previousCycle = next.cycleNumber;
  next = advanceToNextTurn(next);
  if (next.cycleNumber !== previousCycle) {
    next = { ...next, cycleUsageKeys: [] };
  }
  next = runStandbyForActivePlayer(next);
  return next;
};

type CostComputation = {
  finalCost: number;
  appliedMechanistaInstanceId: string | null;
  consumedDiscountSlots: number[];
};

const computeSpellCost = (
  state: GameState,
  player: PlayerId,
  source: SpellSource,
  spellId: string,
): CostComputation => {
  const card = ALL_SPELLS_BY_ID[spellId];
  let reduction = 0;
  let appliedMechanistaInstanceId: string | null = null;
  const consumedDiscountSlots: number[] = [];

  if (source.zone === "forge") {
    state.forgeSlotDiscounts.forEach((discount, index) => {
      if (
        discount.player === player &&
        discount.slotIndex === source.slotIndex &&
        discount.remainingUses > 0
      ) {
        reduction += discount.amount;
        consumedDiscountSlots.push(index);
      }
    });

    if (source.slotIndex === 4) {
      const mechanista = getReadySpellsById(
        state,
        "mechanista-novem",
        player,
      )[0];
      if (mechanista) {
        const key = makeWorkUsageKey(
          mechanista.instanceId,
          "mechanista-center-cost",
        );
        if (!hasWorkUsage(state, key)) {
          reduction += 1;
          appliedMechanistaInstanceId = mechanista.instanceId;
        }
      }
    }
  }

  return {
    finalCost: Math.max(0, card.costPower - reduction),
    appliedMechanistaInstanceId,
    consumedDiscountSlots,
  };
};

const applyPostCostUsage = (
  state: GameState,
  consumedDiscountSlots: number[],
  appliedMechanistaInstanceId: string | null,
): GameState => {
  let next = state;

  if (consumedDiscountSlots.length > 0) {
    const consumed = new Set(consumedDiscountSlots);
    next = {
      ...next,
      forgeSlotDiscounts: next.forgeSlotDiscounts
        .map((discount, index) =>
          consumed.has(index)
            ? { ...discount, remainingUses: discount.remainingUses - 1 }
            : discount,
        )
        .filter((discount) => discount.remainingUses > 0),
    };
  }

  if (appliedMechanistaInstanceId) {
    next = markWorkUsage(
      next,
      makeWorkUsageKey(appliedMechanistaInstanceId, "mechanista-center-cost"),
    );
  }

  return next;
};

const announceFromWork = (
  state: GameState,
  player: PlayerId,
  source: SpellSource,
  spellId: string,
  targets: TargetChoice[] = [],
): GameState => {
  const spell = ALL_SPELLS_BY_ID[spellId];
  if (!spell || state.phase !== "work") {
    return state;
  }
  if (player !== state.activePlayer || !canPlayInWorkWindow(spell.playWindow)) {
    return state;
  }

  const costData = computeSpellCost(state, player, source, spellId);
  if (state.power[player] < costData.finalCost) {
    return state;
  }

  const removed = removeCardFromSource(state, player, source, spellId);
  if (!removed) {
    return state;
  }

  let next = applyPostCostUsage(
    removed,
    costData.consumedDiscountSlots,
    costData.appliedMechanistaInstanceId,
  );

  next = {
    ...next,
    turnSpellCount: next.turnSpellCount + 1,
    turnIncantationCount:
      next.turnIncantationCount + (spell.type === "Incantation" ? 1 : 0),
  };

  if (spell.type === "Incantation" && next.turnIncantationCount === 1) {
    const scriba = getReadySpellsById(next, "scriba-aeris", player)[0];
    if (scriba) {
      const power: [number, number] = [...next.power] as [number, number];
      power[player] += 1;
      next = { ...next, power };
      next = addLog(
        next,
        `${scriba.spellId} grants 1 Power on your first Incantation this Work.`,
        player,
      );
    }
  }

  if (source.zone === "forge" && source.slotIndex <= 2) {
    const venator = getReadySpellsById(next, "venator-fornacis", player)[0];
    if (venator) {
      const key = makeWorkUsageKey(
        venator.instanceId,
        "venator-top-row-aether",
      );
      if (!hasWorkUsage(next, key)) {
        next = markWorkUsage(next, key);
        next = applyEffects(
          next,
          [{ type: "GainAether", amount: 1, target: { kind: "selfCore" } }],
          { sourceController: player, sourceInstanceId: venator.instanceId },
        );
      }
    }
  }

  next = withUpdatedPower(next, player, (value) => value - costData.finalCost);
  const announced = addAnnouncementToInPlay(next, player, spellId);
  next = announced.state;

  next = addLog(
    next,
    `Player ${player} ${spell.type === "Summon" ? "Conjures" : spell.type === "Incantation" ? "Speaks" : "Prepares"} ${spell.name}.`,
    player,
  );
  next = addLog(
    next,
    `Card ${announced.instanceId} (${spell.id}) moves from ${describeSpellSource(source)} to In Play.`,
    player,
  );

  const responseState: GameState = {
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

  if (!hasManualResponseOptions(responseState)) {
    return finishPendingResponse(responseState);
  }

  return responseState;
};

const announceFromResponse = (
  state: GameState,
  player: PlayerId,
  source: SpellSource,
  spellId: string,
  targets: TargetChoice[] = [],
): GameState => {
  const spell = ALL_SPELLS_BY_ID[spellId];
  if (!spell || state.phase !== "response") {
    return state;
  }
  if (
    player === state.activePlayer ||
    !canPlayInResponseWindow(spell.playWindow) ||
    state.power[player] < spell.costPower
  ) {
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
  next = addLog(next, `Player ${player} responds with ${spell.name}.`, player);
  next = addLog(
    next,
    `Card ${announced.instanceId} (${spell.id}) moves from ${describeSpellSource(source)} to In Play.`,
    player,
  );
  next = resolveAnnouncedSpellInstance(
    next,
    announced.instanceId,
    ALL_SPELLS_BY_ID,
    targets,
  );
  next = applyImmediateStressCheck(next);
  return next;
};

const activateSpellAbilityFromWork = (
  state: GameState,
  player: PlayerId,
  instanceId: string,
): GameState => {
  if (state.phase !== "work" || player !== state.activePlayer) {
    return state;
  }

  const spellInPlay = state.inPlay.find(
    (entry) => entry.instanceId === instanceId,
  );
  if (
    !spellInPlay ||
    spellInPlay.controller !== player ||
    spellInPlay.status !== "inPlay" ||
    spellInPlay.jamCounters > 0
  ) {
    return state;
  }

  switch (spellInPlay.spellId) {
    case "lemur-cineris": {
      const key = makeWorkUsageKey(instanceId, "lemur-work-activate");
      if (hasWorkUsage(state, key)) {
        return state;
      }
      let next = markWorkUsage(state, key);
      next = addLog(next, "Lemur Cineris activates.", player);
      next = applyEffects(
        next,
        [
          { type: "GainStress", amount: 1, target: { kind: "selfCore" } },
          { type: "GainAether", amount: 1, target: { kind: "selfCore" } },
        ],
        {
          sourceController: player,
          sourceInstanceId: instanceId,
        },
      );
      return applyImmediateStressCheck(next);
    }
    case "oraculum-specilli": {
      const key = makeWorkUsageKey(instanceId, "oraculum-work-activate");
      if (hasWorkUsage(state, key)) {
        return state;
      }
      let next = markWorkUsage(state, key);
      next = addLog(next, "Oraculum Specilli activates.", player);
      next = applyEffects(
        next,
        [
          { type: "Scry", amount: 2, target: "self" },
          { type: "GainStress", amount: 1, target: { kind: "selfCore" } },
        ],
        {
          sourceController: player,
          sourceInstanceId: instanceId,
        },
      );
      return applyImmediateStressCheck(next);
    }
    default:
      return state;
  }
};

export const reduce = (state: GameState, action: GameAction): GameState => {
  if (action.type === "NewGame") {
    return runStandbyForActivePlayer(createNewGameState(action.seed));
  }

  if (state.phase === "gameOver") {
    return state;
  }

  switch (action.type) {
    case "AnnounceSpell": {
      if (state.phase === "work") {
        return announceFromWork(
          state,
          action.player,
          action.source,
          action.spellId,
          action.targets ?? [],
        );
      }
      if (state.phase === "response") {
        return announceFromResponse(
          state,
          action.player,
          action.source,
          action.spellId,
          action.targets ?? [],
        );
      }
      return state;
    }
    case "ResolveResponse": {
      return finishPendingResponse(state);
    }
    case "AdvancePhase": {
      if (state.phase !== "work") {
        return state;
      }
      let next: GameState = {
        ...state,
        phase: "maintenance_unjam",
      };
      next = runTimedTriggers(next, "Maintenance");
      next = applyImmediateStressCheck(next);
      if (next.phase === "gameOver") {
        return next;
      }

      const hasUnjamChoices = next.inPlay.some(
        (spell) =>
          spell.controller === next.activePlayer && spell.jamCounters > 0,
      );
      if (!hasUnjamChoices) {
        return endTurnFromMaintenance(next);
      }

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
      if (next.phase === "gameOver") {
        return next;
      }

      next = applyImmediateStressCheck(next);
      if (next.phase === "gameOver") {
        return next;
      }

      next = endTurnFromMaintenance(next);
      return next;
    }
    case "ActivateSpellAbility":
      return activateSpellAbilityFromWork(
        state,
        action.player,
        action.instanceId,
      );
    default:
      return state;
  }
};
