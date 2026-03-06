import type { GameState } from "../model/gameState";
import { otherPlayer, type PlayerId, type SpellType } from "../model/keywords";
import type { TriggerCondition } from "../model/spell";

export const triggerMatchesAnnouncement = (
  trigger: TriggerCondition,
  sealController: PlayerId,
  announcer: PlayerId,
  announcedType: SpellType,
): boolean => {
  switch (trigger.kind) {
    case "whenAnySpellAnnounced":
      return true;
    case "whenOpponentSpeaks":
      return announcer !== sealController && announcedType === "Incantation";
    case "whenOpponentConjures":
      return announcer !== sealController && announcedType === "Summon";
    case "whenOpponentPrepares":
      return announcer !== sealController && announcedType === "Seal";
    case "whenYouSpeak":
      return announcer === sealController && announcedType === "Incantation";
    default:
      return false;
  }
};

export const startWorkForActivePlayer = (state: GameState): GameState => {
  const nextPower: [number, number] = [...state.power] as [number, number];
  const nextPowerLimit: [number, number] = [...state.powerLimit] as [
    number,
    number,
  ];
  nextPower[state.activePlayer] = 0;
  nextPowerLimit[state.activePlayer] = state.cycleNumber;

  return {
    ...state,
    phase: "work",
    pendingAnnouncement: null,
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
