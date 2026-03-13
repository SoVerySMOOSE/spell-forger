import type { GameState } from "../model/gameState";

export const makeWorkUsageKey = (instanceId: string, label: string): string =>
  `work:${instanceId}:${label}`;

export const makeCycleUsageKey = (instanceId: string, label: string): string =>
  `cycle:${instanceId}:${label}`;

export const hasWorkUsage = (state: GameState, key: string): boolean =>
  state.workUsageKeys.includes(key);

export const hasCycleUsage = (state: GameState, key: string): boolean =>
  state.cycleUsageKeys.includes(key);

export const markWorkUsage = (state: GameState, key: string): GameState => {
  if (state.workUsageKeys.includes(key)) {
    return state;
  }
  return { ...state, workUsageKeys: [...state.workUsageKeys, key] };
};

export const markCycleUsage = (state: GameState, key: string): GameState => {
  if (state.cycleUsageKeys.includes(key)) {
    return state;
  }
  return { ...state, cycleUsageKeys: [...state.cycleUsageKeys, key] };
};
