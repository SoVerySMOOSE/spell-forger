import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/setup";
import type { GameState } from "../model/gameState";
import type { PlayerId } from "../model/keywords";
import { refillForgeGrid } from "./forge";
import { reduce } from "./reducer";
import { canPlayFromForgeSlot } from "../state/selectors";

const withWorkContext = (
  state: GameState,
  activePlayer: PlayerId,
): GameState => {
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
  const currentActive = state.activePlayer;
  const afterWork = reduce(state, { type: "AdvancePhase" });
  return reduce(afterWork, {
    type: "ChooseUnjam",
    player: currentActive,
    instanceIds: [],
  });
};

describe("forge refill", () => {
  it("fills empty slots in reading order", () => {
    const grid = [
      null,
      "occupied-a",
      null,
      null,
      "occupied-b",
      null,
      null,
      null,
      "occupied-c",
    ];
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
  it("auto-resolves response when there are no manual response options", () => {
    let state = createNewGameState(11);
    state = withWorkContext(
      {
        ...state,
        forgeGrid: [
          "hasta-stellarum",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        inPlay: [
          {
            instanceId: "seal-1",
            cardId: "os-cera-clausum",
            spellId: "os-cera-clausum",
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
      spellId: "hasta-stellarum",
    });

    expect(state.phase).toBe("work");
    expect(state.cores[0].aether).toBe(0);
    expect(state.spent).toEqual(expect.arrayContaining(["hasta-stellarum"]));
    expect(
      state.inPlay.some((spell) => spell.spellId === "hasta-stellarum"),
    ).toBe(false);
  });

  it("keeps the response window open when the opponent can manually respond", () => {
    let state = createNewGameState(12);
    state = withWorkContext(
      {
        ...state,
        forgeGrid: [
          "hasta-stellarum",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        reserve: {
          player0: [],
          player1: ["rebuttal-staticus"],
        },
      },
      0,
    );

    state = reduce(state, {
      type: "AnnounceSpell",
      player: 0,
      source: { zone: "forge", slotIndex: 0 },
      spellId: "hasta-stellarum",
    });

    expect(state.phase).toBe("response");
    expect(state.pendingAnnouncement?.spellId).toBe("hasta-stellarum");
  });

  it("jammed Incantation does not resolve until unjammed during Maintenance", () => {
    let state = createNewGameState(22);
    state = withWorkContext(
      {
        ...state,
        forgeGrid: [
          "hasta-stellarum",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        inPlay: [
          {
            instanceId: "seal-2",
            cardId: "clepsydra-fissa",
            spellId: "clepsydra-fissa",
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
      spellId: "hasta-stellarum",
    });

    const jammed = state.inPlay.find(
      (spell) => spell.spellId === "hasta-stellarum",
    );
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

    expect(
      state.inPlay.some((spell) => spell.spellId === "hasta-stellarum"),
    ).toBe(false);
    expect(state.spent).toEqual(expect.arrayContaining(["hasta-stellarum"]));
    expect(state.cores[0].aether).toBe(4);
    expect(state.cores[0].stress).toBe(2);
  });
});

describe("reserve lifecycle", () => {
  it("Scry puts cards in Reserve and they persist across turns", () => {
    let state = createNewGameState(33);
    state = withWorkContext(
      {
        ...state,
        forgeGrid: [
          "corona-scintillarum",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        forgeDeck: ["siphon-aetheris", "lemur-cineris", "turris-runarum"],
      },
      0,
    );

    state = reduce(state, {
      type: "AnnounceSpell",
      player: 0,
      source: { zone: "forge", slotIndex: 0 },
      spellId: "corona-scintillarum",
    });

    expect(state.reserve.player0).toEqual(["siphon-aetheris", "lemur-cineris"]);

    state = finishTurn(state);
    expect(state.activePlayer).toBe(1);
    expect(state.reserve.player0).toEqual(["siphon-aetheris", "lemur-cineris"]);

    const invalid = reduce(state, {
      type: "AnnounceSpell",
      player: 1,
      source: { zone: "reserve", reserveIndex: 0 },
      spellId: "siphon-aetheris",
    });
    expect(invalid).toEqual(state);
  });
});

describe("objectives", () => {
  it("wins by Saturation only at the start of that player's turn", () => {
    let state = createNewGameState(44);
    state = {
      ...state,
      cores: [
        { aether: 0, stress: 0 },
        { aether: 10, stress: 0 },
      ],
    };

    state = finishTurn(state);

    expect(state.phase).toBe("gameOver");
    expect(state.winner).toBe(1);
    expect(state.loser).toBe(0);
  });

  it("loses immediately when Stress reaches 10", () => {
    let state = createNewGameState(55);
    state = withWorkContext(
      {
        ...state,
        cores: [
          { aether: 0, stress: 9 },
          { aether: 0, stress: 0 },
        ],
        forgeGrid: [
          "hasta-stellarum",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      },
      0,
    );

    state = reduce(state, {
      type: "AnnounceSpell",
      player: 0,
      source: { zone: "forge", slotIndex: 0 },
      spellId: "hasta-stellarum",
    });

    expect(state.phase).toBe("gameOver");
    expect(state.winner).toBe(1);
    expect(state.loser).toBe(0);
  });
});

describe("cycle timing", () => {
  it("increments cycle after both players act and alternates first player each cycle", () => {
    let state = createNewGameState(66);
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

describe("advanced cards", () => {
  it("supports activated once-per-work summons", () => {
    let state = createNewGameState(77);
    state = withWorkContext(
      {
        ...state,
        inPlay: [
          {
            instanceId: "lemur-1",
            cardId: "lemur-cineris",
            spellId: "lemur-cineris",
            controller: 0,
            type: "Summon",
            jamCounters: 0,
            status: "inPlay",
          },
          {
            instanceId: "oracle-1",
            cardId: "oraculum-specilli",
            spellId: "oraculum-specilli",
            controller: 0,
            type: "Summon",
            jamCounters: 0,
            status: "inPlay",
          },
        ],
        forgeDeck: ["schema-supercursus", "canticum-exhalationis"],
      },
      0,
    );

    state = reduce(state, {
      type: "ActivateSpellAbility",
      player: 0,
      instanceId: "lemur-1",
    });
    expect(state.cores[0].aether).toBe(1);
    expect(state.cores[0].stress).toBe(1);

    state = reduce(state, {
      type: "ActivateSpellAbility",
      player: 0,
      instanceId: "lemur-1",
    });
    expect(state.cores[0].aether).toBe(1);
    expect(state.cores[0].stress).toBe(1);

    state = reduce(state, {
      type: "ActivateSpellAbility",
      player: 0,
      instanceId: "oracle-1",
    });
    expect(state.reserve.player0).toEqual([
      "schema-supercursus",
      "canticum-exhalationis",
    ]);
    expect(state.cores[0].stress).toBe(2);
  });

  it("applies center-slot cost reduction from Mechanista", () => {
    let state = createNewGameState(78);
    state = withWorkContext(
      {
        ...state,
        power: [1, 0],
        forgeGrid: [
          null,
          null,
          null,
          null,
          "corona-scintillarum",
          null,
          null,
          null,
          null,
        ],
        inPlay: [
          {
            instanceId: "mechanist-1",
            cardId: "mechanista-novem",
            spellId: "mechanista-novem",
            controller: 0,
            type: "Summon",
            jamCounters: 0,
            status: "inPlay",
          },
        ],
      },
      0,
    );

    expect(canPlayFromForgeSlot(state, 0, 4)).toBe(true);
  });

  it("cancels bonus power gains with Liber Rubiginis", () => {
    let state = createNewGameState(79);
    state = withWorkContext(
      {
        ...state,
        forgeGrid: [
          "canalis-rupturae",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        inPlay: [
          {
            instanceId: "ledger-1",
            cardId: "liber-rubiginis",
            spellId: "liber-rubiginis",
            controller: 1,
            type: "Seal",
            armed: true,
            jamCounters: 0,
            status: "inPlay",
          },
        ],
      },
      0,
    );

    state = reduce(state, {
      type: "AnnounceSpell",
      player: 0,
      source: { zone: "forge", slotIndex: 0 },
      spellId: "canalis-rupturae",
    });

    expect(state.power[0]).toBe(9);
    expect(state.spent).toContain("liber-rubiginis");
  });

  it("uses Custos Incudis replacement on opponent dispels only", () => {
    let state = createNewGameState(80);
    state = withWorkContext(
      {
        ...state,
        power: [10, 10],
        forgeGrid: [
          "hasta-stellarum",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        inPlay: [
          {
            instanceId: "ward-1",
            cardId: "custos-incudis",
            spellId: "custos-incudis",
            controller: 1,
            type: "Summon",
            jamCounters: 0,
            status: "inPlay",
          },
          {
            instanceId: "wax-1",
            cardId: "os-cera-clausum",
            spellId: "os-cera-clausum",
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
      spellId: "hasta-stellarum",
    });

    const jammedHasta = state.inPlay.find(
      (spell) => spell.spellId === "hasta-stellarum",
    );
    expect(jammedHasta?.jamCounters).toBe(2);
    expect(state.cores[1].aether).toBe(1);
    expect(state.spent).toContain("os-cera-clausum");
  });

  it("does not grant Chimaera bonus at zero Stress", () => {
    let state = createNewGameState(81);
    state = withWorkContext(
      {
        ...state,
        inPlay: [
          {
            instanceId: "chim-1",
            cardId: "chimaera-exhauriens",
            spellId: "chimaera-exhauriens",
            controller: 0,
            type: "Summon",
            jamCounters: 0,
            status: "inPlay",
          },
        ],
      },
      0,
    );

    state = reduce(state, { type: "AdvancePhase" });
    expect(state.phase).toBe("work");
    expect(state.activePlayer).toBe(1);
    expect(state.cores[0].aether).toBe(0);
    expect(state.cores[0].stress).toBe(0);
  });

  it("auto-finishes maintenance when there are no unjam choices", () => {
    let state = createNewGameState(82);
    state = withWorkContext(state, 0);

    state = reduce(state, { type: "AdvancePhase" });

    expect(state.phase).toBe("work");
    expect(state.activePlayer).toBe(1);
  });

  it("keeps maintenance open when the active player has jammed spells", () => {
    let state = createNewGameState(83);
    state = withWorkContext(
      {
        ...state,
        inPlay: [
          {
            instanceId: "jammed-1",
            cardId: "lemur-cineris",
            spellId: "lemur-cineris",
            controller: 0,
            type: "Summon",
            jamCounters: 2,
            status: "inPlay",
          },
        ],
      },
      0,
    );

    state = reduce(state, { type: "AdvancePhase" });

    expect(state.phase).toBe("maintenance_unjam");
    expect(state.activePlayer).toBe(0);
  });
});
