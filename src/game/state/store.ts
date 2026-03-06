import { useMemo, useReducer, type Dispatch } from "react";
import { createNewGameState } from "../data/setup";
import type { GameState } from "../model/gameState";
import type { GameAction } from "../rules/actions";
import { reduce } from "../rules/reducer";

export const defaultSeed = 1337;

export const makeRandomSeed = (): number => {
  return Math.floor(Math.random() * 2_147_483_647);
};

export const useGameStore = (
  initialSeed: number = defaultSeed,
): [GameState, Dispatch<GameAction>] => {
  const initialState = useMemo(
    () => createNewGameState(initialSeed),
    [initialSeed],
  );
  return useReducer(reduce, initialState);
};
