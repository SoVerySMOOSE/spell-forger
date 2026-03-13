import { ALL_SPELLS_BY_ID } from "../data/setup";
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
import { reserveKeyForPlayer } from "../model/zones";
import { addJamCounters, isJammed } from "./jam";
import { hasCycleUsage, makeCycleUsageKey, markCycleUsage } from "./usage";

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

const isTriggeredSpellReady = (spell: InPlaySpell): boolean =>
  spell.status === "inPlay" &&
  !isJammed(spell) &&
  (spell.type !== "Seal" || Boolean(spell.armed));

const getReadySpellsById = (
  state: GameState,
  spellId: string,
  controller?: PlayerId,
): InPlaySpell[] =>
  state.inPlay.filter(
    (spell) =>
      spell.spellId === spellId &&
      (controller === undefined || spell.controller === controller) &&
      isTriggeredSpellReady(spell),
  );

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
    case "chosenInPlaySpellOptional": {
      const chosen = resolveChosenTarget(choices, effectIndex);
      if (chosen === undefined || chosen === "") {
        return null;
      }
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
    case "chosenSummonWithMaxCost": {
      const chosen = resolveChosenTarget(choices, effectIndex);
      if (typeof chosen !== "string") {
        return null;
      }
      const summon = state.inPlay.find((spell) => spell.instanceId === chosen);
      if (!summon || summon.type !== "Summon") {
        return null;
      }
      const summonCard = ALL_SPELLS_BY_ID[summon.spellId];
      if (summonCard.costPower > target.maxCost) {
        return null;
      }
      return chosen;
    }
    case "chosenJammedSpell": {
      const chosen = resolveChosenTarget(choices, effectIndex);
      if (typeof chosen !== "string") {
        return null;
      }
      const jammed = state.inPlay.find((spell) => spell.instanceId === chosen);
      if (!jammed || jammed.jamCounters <= 0) {
        return null;
      }
      return chosen;
    }
    default:
      return null;
  }
};

const resolveChosenForgeSlot = (
  effectIndex: number,
  choices: Map<number, TargetValue>,
): number | null => {
  const chosen = resolveChosenTarget(choices, effectIndex);
  if (typeof chosen !== "number" || chosen < 0 || chosen > 8) {
    return null;
  }
  return chosen;
};

const applyVentToCore = (
  state: GameState,
  player: PlayerId,
  amount: number,
): GameState =>
  updateCore(state, player, (aether, stress) => ({
    aether,
    stress: Math.max(0, stress - amount),
  }));

const applyStressGain = (
  state: GameState,
  player: PlayerId,
  amount: number,
): GameState => {
  if (amount <= 0) {
    return state;
  }

  let next = state;
  let remaining = amount;
  const beforeStress = next.cores[player].stress;

  for (const insulation of getReadySpellsById(
    next,
    "pellis-anguillae",
    player,
  )) {
    if (remaining <= 0) {
      break;
    }
    remaining = Math.max(0, remaining - 2);
    next = dispelInstance(next, insulation.instanceId, insulation.controller);
  }

  next = updateCore(next, player, (aether, stress) => ({
    aether,
    stress: stress + remaining,
  }));

  const afterStress = next.cores[player].stress;
  if (beforeStress < 9 && afterStress >= 9) {
    const valve = getReadySpellsById(next, "valva-fuliginis", player)[0];
    if (valve) {
      next = applyVentToCore(next, player, 3);
      next = dispelInstance(next, valve.instanceId, valve.controller);
    }
  }

  return next;
};

const applyLeech = (
  state: GameState,
  from: PlayerId,
  to: PlayerId,
  amount: number,
  sourceController: PlayerId,
): GameState => {
  if (amount <= 0) {
    return state;
  }

  let next = state;
  let nextTo = to;
  let nextAmount = amount;

  const mirrorhook = getReadySpellsById(
    next,
    "amuletum-hamuli-speculi",
    from,
  )[0];
  if (mirrorhook && sourceController !== from) {
    nextTo = sourceController;
    next = dispelInstance(next, mirrorhook.instanceId, mirrorhook.controller);
  }

  const galea = getReadySpellsById(next, "galea-speculi-atrati", from)[0];
  if (next.phase === "response" && galea && sourceController !== from) {
    const key = makeCycleUsageKey(galea.instanceId, "galea-leech-redirect");
    if (!hasCycleUsage(next, key)) {
      nextTo = sourceController;
      next = markCycleUsage(next, key);
      next = addLog(
        next,
        `${galea.spellId} redirects Leech to the caster.`,
        from,
      );
    }
  }

  const aegis = getReadySpellsById(next, "aegis-sancti-ferri", from)[0];
  if (aegis && sourceController !== from) {
    const key = makeCycleUsageKey(aegis.instanceId, "aegis-reduce-leech");
    if (!hasCycleUsage(next, key)) {
      nextAmount = Math.max(0, nextAmount - 1);
      next = markCycleUsage(next, key);
      next = addLog(next, `${aegis.spellId} reduces Leech by 1.`, from);
    }
  }

  const actual = Math.min(nextAmount, next.cores[from].aether);
  if (actual <= 0) {
    return next;
  }

  next = updateCore(next, from, (aether, stress) => ({
    aether: aether - actual,
    stress,
  }));

  return applyAetherGain(next, nextTo, actual);
};

const applyAetherGain = (
  state: GameState,
  player: PlayerId,
  amount: number,
): GameState => {
  if (amount <= 0) {
    return state;
  }

  let next = state;
  let nextAmount = amount;

  const hollowCrowns = getReadySpellsById(next, "corona-cava").filter(
    (seal) => seal.controller !== player,
  );
  if (nextAmount >= 6 && hollowCrowns.length > 0) {
    const crown = hollowCrowns[0];
    nextAmount = 3;
    next = applyStressGain(next, player, 3);
    next = dispelInstance(next, crown.instanceId, crown.controller);
  }

  const beforeAether = next.cores[player].aether;
  next = updateCore(next, player, (aether, stress) => ({
    aether: aether + nextAmount,
    stress,
  }));

  if (beforeAether < 10 && beforeAether + nextAmount >= 10) {
    for (const magnet of getReadySpellsById(next, "magnes-gibbosi").filter(
      (seal) => seal.controller !== player,
    )) {
      next = applyStressGain(next, player, 3);
      next = dispelInstance(next, magnet.instanceId, magnet.controller);
    }
  }

  if (beforeAether >= 8) {
    for (const charm of getReadySpellsById(next, "amuletum-furis").filter(
      (seal) => seal.controller !== player,
    )) {
      next = applyStressGain(next, player, 2);
      next = dispelInstance(next, charm.instanceId, charm.controller);
    }
  }

  if (nextAmount >= 4) {
    for (const fuse of getReadySpellsById(next, "funis-salis").filter(
      (seal) => seal.controller !== player,
    )) {
      next = applyStressGain(next, player, 3);
      next = dispelInstance(next, fuse.instanceId, fuse.controller);
    }
  }

  for (const needle of getReadySpellsById(next, "acus-siphonis").filter(
    (seal) => seal.controller !== player,
  )) {
    next = applyLeech(next, player, needle.controller, 1, needle.controller);
    next = dispelInstance(next, needle.instanceId, needle.controller);
  }

  return next;
};

const applyPowerGain = (
  state: GameState,
  player: PlayerId,
  amount: number,
): GameState => {
  if (amount <= 0) {
    return state;
  }
  let next = state;
  let nextAmount = amount;

  for (const ledger of getReadySpellsById(next, "liber-rubiginis").filter(
    (seal) => seal.controller !== player,
  )) {
    nextAmount = 0;
    next = dispelInstance(next, ledger.instanceId, ledger.controller);
    next = addLog(
      next,
      `${ledger.spellId} cancels bonus Power gain.`,
      ledger.controller,
    );
    break;
  }

  if (nextAmount <= 0) {
    return next;
  }

  const power: [number, number] = [...next.power] as [number, number];
  power[player] += nextAmount;
  return { ...next, power };
};

const handleSpellDispelledTriggers = (
  state: GameState,
  dispelledSpell: InPlaySpell,
  sourcePlayer: PlayerId | null,
): GameState => {
  let next = state;

  if (next.phase === "response") {
    for (const lantern of getReadySpellsById(next, "lucerna-scintillarum")) {
      const key = makeCycleUsageKey(
        lantern.instanceId,
        "lucerna-response-dispel",
      );
      if (hasCycleUsage(next, key)) {
        continue;
      }
      next = markCycleUsage(next, key);
      next = applyAetherGain(next, lantern.controller, 1);
    }

    for (const abacus of getReadySpellsById(next, "abacus-invidiae")) {
      next = applyEffects(next, [{ type: "Scry", amount: 2, target: "self" }], {
        sourceController: abacus.controller,
        sourceInstanceId: abacus.instanceId,
      });
      next = dispelInstance(next, abacus.instanceId, abacus.controller);
    }
  }

  if (sourcePlayer !== null && sourcePlayer !== dispelledSpell.controller) {
    for (const locket of getReadySpellsById(
      next,
      "monile-ultionis",
      dispelledSpell.controller,
    )) {
      next = applyAetherGain(next, locket.controller, 2);
      next = dispelInstance(next, locket.instanceId, locket.controller);
    }
  }

  return next;
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

  let next = state;
  if (player !== null && spell.controller !== player) {
    for (const warden of getReadySpellsById(next, "custos-incudis", player)) {
      const key = makeCycleUsageKey(
        warden.instanceId,
        "custos-incudis-replace-dispel",
      );
      if (hasCycleUsage(next, key)) {
        continue;
      }
      next = markCycleUsage(next, key);
      next = {
        ...next,
        inPlay: addJamCounters(next.inPlay, instanceId, 2),
      };
      next = applyAetherGain(next, player, 1);
      next = addLog(
        next,
        `${warden.spellId} replaces a Dispel with 2 Jam counters and 1 Aether.`,
        player,
      );
      return next;
    }
  }

  next = {
    ...next,
    inPlay: next.inPlay.filter((entry) => entry.instanceId !== instanceId),
    spent: [...next.spent, spell.spellId],
  };
  next = addLog(
    next,
    `Card ${spell.instanceId} (${spell.spellId}) is Dispelled from In Play to Spent.`,
    player,
  );
  return handleSpellDispelledTriggers(next, spell, player);
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
        next = applyAetherGain(next, player, effect.amount);
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
        next = applyStressGain(next, player, effect.amount);
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
        next = applyVentToCore(next, player, effect.amount);
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
        next = applyLeech(
          next,
          from,
          to,
          effect.amount,
          context.sourceController,
        );
        return;
      }
      case "GainPower": {
        const player = resolveCoreTargetPlayer(
          effect.target,
          context,
          effectIndex,
          choices,
        );
        if (player === null) {
          return;
        }
        next = applyPowerGain(next, player, effect.amount);
        return;
      }
      case "SetAether": {
        const player = resolveCoreTargetPlayer(
          effect.target,
          context,
          effectIndex,
          choices,
        );
        if (player === null) {
          return;
        }
        next = updateCore(next, player, (_aether, stress) => ({
          aether: effect.amount,
          stress,
        }));
        return;
      }
      case "MoveStress": {
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
        const moved = Math.min(effect.amount, next.cores[from].stress);
        next = updateCore(next, from, (aether, stress) => ({
          aether,
          stress: stress - moved,
        }));
        next = applyStressGain(next, to, moved);
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
        const key = reserveKeyForPlayer(targetPlayer);
        const deck = [...next.forgeDeck];
        const reveals = [...next.reserve[key]];
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
          reserve: {
            ...next.reserve,
            [key]: reveals,
          },
        };
        return;
      }
      case "GrantForgeSlotDiscount": {
        const slotIndex = resolveChosenForgeSlot(effectIndex, choices);
        if (slotIndex === null) {
          return;
        }
        next = {
          ...next,
          forgeSlotDiscounts: [
            ...next.forgeSlotDiscounts,
            {
              player: context.sourceController,
              slotIndex,
              amount: effect.amount,
              remainingUses: effect.uses,
            },
          ],
        };
        return;
      }
      case "DispelReserveCardForPower": {
        const chosen = resolveChosenTarget(choices, effectIndex);
        if (typeof chosen !== "string") {
          return;
        }
        const key = reserveKeyForPlayer(context.sourceController);
        const reserve = [...next.reserve[key]];
        const index = reserve.indexOf(chosen);
        if (index < 0) {
          return;
        }
        const [removed] = reserve.splice(index, 1);
        next = {
          ...next,
          reserve: { ...next.reserve, [key]: reserve },
          spent: [...next.spent, removed],
        };
        next = applyPowerGain(next, context.sourceController, effect.gainPower);
        return;
      }
      case "DispelAnnouncedUnlessControllerGainsStress": {
        const announced = context.pendingAnnouncementController;
        if (announced === undefined) {
          return;
        }
        const wouldLive =
          next.cores[announced].stress + effect.stressAmount < 10;
        if (wouldLive) {
          next = applyStressGain(next, announced, effect.stressAmount);
          next = addLog(
            next,
            `Player ${announced} pays ${effect.stressAmount} Stress to prevent a Dispel.`,
            announced,
          );
          return;
        }
        const targetId = context.pendingAnnouncementInstanceId;
        if (!targetId) {
          return;
        }
        next = dispelInstance(next, targetId, context.sourceController);
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
