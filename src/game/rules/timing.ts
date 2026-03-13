import type { GameState } from "../model/gameState";
import { otherPlayer, type PlayerId, type SpellType } from "../model/keywords";
import type { TriggerCondition } from "../model/spell";
import type { SpellSource } from "../model/zones";

export interface AnnouncementContext {
  announcer: PlayerId;
  announcedType: SpellType;
  announcedCost: number;
  source: SpellSource;
  announcerStress: number;
}

export const triggerMatchesAnnouncement = (
  trigger: TriggerCondition,
  sealController: PlayerId,
  context: AnnouncementContext,
): boolean => {
  const { announcer, announcedType, announcedCost, source, announcerStress } =
    context;
  switch (trigger.kind) {
    case "whenAnySpellAnnounced":
      return true;
    case "whenOpponentAnnounces":
      return announcer !== sealController;
    case "whenOpponentSpeaks":
      return announcer !== sealController && announcedType === "Incantation";
    case "whenAnySpeaks":
      return announcedType === "Incantation";
    case "whenOpponentConjures":
      return announcer !== sealController && announcedType === "Summon";
    case "whenOpponentPrepares":
      return announcer !== sealController && announcedType === "Seal";
    case "whenYouSpeak":
      return announcer === sealController && announcedType === "Incantation";
    case "whenSpellCostIs":
      return announcedCost === trigger.amount;
    case "whenOpponentSpellCostAtLeast":
      return announcer !== sealController && announcedCost >= trigger.amount;
    case "whenOpponentAnnouncesWithStressAtLeast":
      return announcer !== sealController && announcerStress >= trigger.amount;
    case "whenOpponentAnnouncesFromForgeSlot":
      return (
        announcer !== sealController &&
        source.zone === "forge" &&
        source.slotIndex === trigger.slotIndex
      );
    default:
      return false;
  }
};

export const startWorkForActivePlayer = (state: GameState): GameState => {
  return {
    ...state,
    phase: "work",
    pendingAnnouncement: null,
  };
};

export const refreshPowerForActivePlayer = (state: GameState): GameState => {
  const nextPower: [number, number] = [...state.power] as [number, number];
  const nextPowerLimit: [number, number] = [...state.powerLimit] as [
    number,
    number,
  ];

  nextPower[state.activePlayer] = state.cycleNumber;
  nextPowerLimit[state.activePlayer] = state.cycleNumber;

  return {
    ...state,
    power: nextPower,
    powerLimit: nextPowerLimit,
  };
};

export const advanceToNextTurn = (state: GameState): GameState => {
  if (state.turnsInCycle === 0) {
    return {
      ...state,
      activePlayer: otherPlayer(state.cycleFirstPlayer),
      turnsInCycle: 1,
    };
  }

  const nextCycleFirst = otherPlayer(state.cycleFirstPlayer);
  return {
    ...state,
    cycleNumber: state.cycleNumber + 1,
    cycleFirstPlayer: nextCycleFirst,
    activePlayer: nextCycleFirst,
    turnsInCycle: 0,
  };
};
