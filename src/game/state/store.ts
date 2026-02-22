import { create } from "zustand";
import type { GameState } from "../types/game";
import { buildCraftedCard, isCompatible } from "../engine/crafting";
import { forms } from "../data/forms";
import { materials } from "../data/materials";
import { sigils } from "../data/sigils";

interface GameStore extends GameState {
  selectMaterial: (id: string) => void;
  selectForm: (id: string) => void;
  selectSigil: (id: string) => void;
  clearTray: () => void;
  buildPreview: () => void;
  endTurn: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  activePlayer: "P1",
  round: 1,
  forge: {
    materials: materials.slice(0, 5),
    forms: forms.slice(0, 5),
    sigils: sigils.slice(0, 3),
  },
  tray: {},
  sites: {
    left: { id: "left", summons: [], seals: [], relics: [] },
    center: { id: "center", summons: [], seals: [], relics: [] },
    right: { id: "right", summons: [], seals: [], relics: [] },
  },
  players: {
    P1: { id: "P1", focus: 1, paths: ["Flame", "Stone"], signatureTax: 0 },
    P2: { id: "P2", focus: 1, paths: ["Frost", "Storm"], signatureTax: 0 },
  },
  log: [],

  selectMaterial: (id) => {
    const material = get().forge.materials.find((m) => m.id === id);
    set((state) => ({ tray: { ...state.tray, material } }));
    get().buildPreview();
  },

  selectForm: (id) => {
    const form = get().forge.forms.find((f) => f.id === id);
    set((state) => ({ tray: { ...state.tray, form } }));
    get().buildPreview();
  },

  selectSigil: (id) => {
    const sigil = get().forge.sigils.find((s) => s.id === id);
    set((state) => ({ tray: { ...state.tray, sigil } }));
    get().buildPreview();
  },

  clearTray: () => set({ tray: {} }),

  buildPreview: () => {
    const { tray } = get();
    if (!tray.form || !tray.material) {
      set((state) => ({ tray: { ...state.tray, preview: undefined } }));
      return;
    }
    if (!isCompatible(tray.form, tray.material)) {
      set((state) => ({
        tray: { ...state.tray, preview: undefined },
        log: [...state.log, "Invalid craft: incompatible Form and Material."],
      }));
      return;
    }
    const preview = buildCraftedCard(tray.form, tray.material, tray.sigil);
    set((state) => ({ tray: { ...state.tray, preview } }));
  },

  endTurn: () => {
    set((state) => {
      const nextPlayer = state.activePlayer === "P1" ? "P2" : "P1";
      const nextRound = nextPlayer === "P1" ? state.round + 1 : state.round;
      return {
        activePlayer: nextPlayer,
        round: nextRound,
        // Forge refill logic comes next
        log: [...state.log, `End turn. ${nextPlayer}'s turn.`],
      };
    });
  },
  slingSpell: () => {},
}));

export const conjureSummon = (siteId: string) => {
  useGameStore.getState().log.push(`Conjured a Summon on site ${siteId}`);
};

export const inscribeSeal = (siteId: string) => {
  useGameStore.getState().log.push(`Inscribed a Seal on site ${siteId}`);
};

export const attuneRelic = (siteId: string, summonId: string) => {
  useGameStore
    .getState()
    .log.push(`Attuned a Relic on site ${siteId} to Summon ${summonId}`);
};

export const endTurn = () => {
  useGameStore.getState().log.push("End of turn.");
};

export const refillForge = () => {
  useGameStore.getState().log.push("Refilled Forge.");
};
