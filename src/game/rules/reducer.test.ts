import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/setup";
import type { GameState } from "../model/gameState";
import type { PlayerId } from "../model/keywords";
import { refillForgeGrid } from "./forge";
import { reduce } from "./reducer";

const withWorkContext = (state: GameState, activePlayer: PlayerId): GameState => {
  return {
    ...state,
    phase: "work",
    activePlayer,
    pendingAnnouncement: null,
    power: [10, 10],
    powerLimit: [10, 10],
  };
};

const finishTurn = (state: GameState): GameState => {
  const afterWork = reduce(state, { type: "AdvancePhase" });
  return reduce(afterWork, {
    type: "ChooseUnjam",
    player: state.activePlayer,
    instanceIds: [],
  });
};

describe("forge refill", () => {
  it("fills empty slots in reading order", () => {
    const grid = [null, "occupied-a", null, null, "occupied-b", null, null, null, "occupied-c"];
    const deck = ["one", "two", "three", "four"];

    const result = refillForgeGrid(grid, deck);

    expect(result.forgeGrid).toEqual([
      "one",
      "occupied-a",
      "two",
      "three",
      "occupied-b",
      "four",
      null,
      null,
      "occupied-c",
    ]);
    expect(result.forgeDeck).toEqual([]);
  });
});

describe("response resolution", () => {
  it("Dispel in response cancels an announced Incantation", () => {
    let state = createNewGameState(11);
    state = withWorkContext(
      {
        ...state,
        forgeGrid: ["starflare-equation", null, null, null, null, null, null, null, null],
        inPlay: [
          {
            instanceId: "seal-1",
            spellId: "mute-lattice",
            controller: 1,
            type: "Seal",
            armed: true,
            jamCounters: 0,
            status: "inPlay",
          },
        ],
        nextInstanceNumber: 2,
      },
      0,
    );

    state = reduce(state, {
      type: "AnnounceSpell",
      player: 0,
      source: { zone: "forge", slotIndex: 0 },
      spellId: "starflare-equation",
    });
    expect(state.phase).toBe("response");

    state = reduce(state, { type: "ResolveResponse" });

    expect(state.phase).toBe("work");
    expect(state.cores[0].aether).toBe(0);
    expect(state.spent).toEqual(expect.arrayContaining(["starflare-equation"]));
    expect(state.inPlay.some((spell) => spell.spellId === "starflare-equation")).toBe(false);
  });

  it("jammed Incantation does not resolve until unjammed during Maintenance", () => {
    let state = createNewGameState(22);
    state = withWorkContext(
      {
        ...state,
        forgeGrid: ["starflare-equation", null, null, null, null, null, null, null, null],
        inPlay: [
          {
            instanceId: "seal-2",
            spellId: "snare-coil",
            controller: 1,
            type: "Seal",
            armed: true,
            jamCounters: 0,
            status: "inPlay",
          },
        ],
        nextInstanceNumber: 2,
      },
      0,
    );

    state = reduce(state, {
      type: "AnnounceSpell",
      player: 0,
      source: { zone: "forge", slotIndex: 0 },
      spellId: "starflare-equation",
    });
    state = reduce(state, { type: "ResolveResponse" });

    const jammed = state.inPlay.find((spell) => spell.spellId === "starflare-equation");
    expect(jammed).toBeDefined();
    expect(jammed?.jamCounters).toBe(1);
    expect(state.cores[0].aether).toBe(0);
    expect(state.cores[0].stress).toBe(0);

    state = reduce(state, { type: "AdvancePhase" });
    expect(state.phase).toBe("maintenance_unjam");

    state = reduce(state, {
      type: "ChooseUnjam",
      player: 0,
      instanceIds: jammed ? [jammed.instanceId] : [],
    });

    expect(state.inPlay.some((spell) => spell.spellId === "starflare-equation")).toBe(false);
    expect(state.spent).toEqual(expect.arrayContaining(["starflare-equation"]));
    expect(state.cores[0].aether).toBe(4);
    expect(state.cores[0].stress).toBe(2);
  });
});

describe("scry lifecycle", () => {
  it("reveals are playable only this turn and are discarded during maintenance cleanup", () => {
    let state = createNewGameState(33);
    state = withWorkContext(
      {
        ...state,
        forgeGrid: ["prismatic-scry", null, null, null, null, null, null, null, null],
        forgeDeck: ["pulse-siphon", "copper-bastion", "vent-warden"],
      },
      0,
    );

    state = reduce(state, {
      type: "AnnounceSpell",
      player: 0,
      source: { zone: "forge", slotIndex: 0 },
      spellId: "prismatic-scry",
    });
    state = reduce(state, { type: "ResolveResponse" });

    expect(state.scryReveals.player0).toEqual(["pulse-siphon", "copper-bastion"]);

    state = reduce(state, { type: "AdvancePhase" });
    state = reduce(state, {
      type: "ChooseUnjam",
      player: 0,
      instanceIds: [],
    });

    expect(state.scryReveals.player0).toEqual([]);
    expect(state.spent).toEqual(
      expect.arrayContaining(["pulse-siphon", "copper-bastion"]),
    );
  });
});

describe("cycle timing", () => {
  it("increments cycle after both players act and alternates first player each cycle", () => {
    let state = createNewGameState(44);
    state = withWorkContext(state, 0);

    expect(state.cycleNumber).toBe(1);
    expect(state.activePlayer).toBe(0);

    state = finishTurn(state);
    expect(state.cycleNumber).toBe(1);
    expect(state.activePlayer).toBe(1);

    state = finishTurn(state);
    expect(state.cycleNumber).toBe(2);
    expect(state.activePlayer).toBe(1);

    state = finishTurn(state);
    expect(state.cycleNumber).toBe(2);
    expect(state.activePlayer).toBe(0);

    state = finishTurn(state);
    expect(state.cycleNumber).toBe(3);
    expect(state.activePlayer).toBe(0);
  });
});

