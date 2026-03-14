import { useMemo, useState, type Dispatch } from "react";
import type { GameState, InPlaySpell } from "../model/gameState";
import {
  PLAY_VERB_BY_TYPE,
  otherPlayer,
  type PlayerId,
} from "../model/keywords";
import type { Effect, TargetChoice, TargetValue } from "../model/spell";
import type { SpellSource } from "../model/zones";
import type { GameAction } from "../rules/actions";
import { hasWorkUsage, makeWorkUsageKey } from "../rules/usage";
import {
  canPlayFromForgeSlot,
  canPlayFromReserve,
  getInPlayForPlayer,
  getLastEvents,
  getResolveTargetRequirements,
  getSpellDefinition,
  getTriggeredSealsForPending,
  type TargetRequirement,
} from "../state/selectors";
import { makeRandomSeed } from "../state/store";
import { CardFace } from "./CardFace";

type PendingSelectionValue = TargetValue | null;

type PendingCast = {
  player: PlayerId;
  source: SpellSource;
  spellId: string;
  requirements: TargetRequirement[];
  selections: Partial<Record<number, PendingSelectionValue>>;
};

const PLAYER_ORDER: PlayerId[] = [1, 0];

type InPlayTargetEffect = Extract<Effect, { type: "Dispel" | "Jam" }>;
type ReserveTargetEffect = Extract<Effect, { type: "DispelReserveCardForPower" }>;
type ForgeSlotTargetEffect = Extract<Effect, { type: "GrantForgeSlotDiscount" }>;
type ChosenCoreEffect = Extract<
  Effect,
  | { type: "GainAether" }
  | { type: "GainStress" }
  | { type: "Vent" }
  | { type: "GainPower" }
  | { type: "SetAether" }
>;

const isInPlayTargetRequirement = (
  requirement: TargetRequirement,
): requirement is TargetRequirement & { effect: InPlayTargetEffect } => {
  const effect = requirement.effect;

  return (
    (effect.type === "Dispel" || effect.type === "Jam") &&
    (effect.target.kind === "chosenInPlaySpell" ||
      effect.target.kind === "chosenInPlaySpellOptional" ||
      effect.target.kind === "chosenArmedSeal" ||
      effect.target.kind === "chosenSummonWithMaxCost" ||
      effect.target.kind === "chosenJammedSpell")
  );
};

const isReserveTargetRequirement = (
  requirement: TargetRequirement,
): requirement is TargetRequirement & { effect: ReserveTargetEffect } => {
  return requirement.effect.type === "DispelReserveCardForPower";
};

const isForgeSlotTargetRequirement = (
  requirement: TargetRequirement,
): requirement is TargetRequirement & { effect: ForgeSlotTargetEffect } => {
  return requirement.effect.type === "GrantForgeSlotDiscount";
};

const isChosenCoreRequirement = (
  requirement: TargetRequirement,
): requirement is TargetRequirement & { effect: ChosenCoreEffect } => {
  const effect = requirement.effect;

  return (
    (effect.type === "GainAether" ||
      effect.type === "GainStress" ||
      effect.type === "Vent" ||
      effect.type === "GainPower" ||
      effect.type === "SetAether") &&
    effect.target.kind === "chosenCore"
  );
};

const getCurrentRequirement = (
  pendingCast: PendingCast | null,
): TargetRequirement | null => {
  if (!pendingCast) {
    return null;
  }

  return (
    pendingCast.requirements.find(
      (requirement) =>
        pendingCast.selections[requirement.effectIndex] === undefined,
    ) ?? null
  );
};

const getPlayerLabel = (player: PlayerId): string => `Artificer ${player + 1}`;

const getPhaseLabel = (phase: GameState["phase"]): string => {
  switch (phase) {
    case "work":
      return "Work";
    case "response":
      return "Response";
    case "maintenance_unjam":
      return "Maintenance";
    case "gameOver":
      return "Game Over";
    default:
      return phase;
  }
};

const getActivationKey = (spell: InPlaySpell): string | null => {
  switch (spell.spellId) {
    case "lemur-cineris":
      return makeWorkUsageKey(spell.instanceId, "lemur-work-activate");
    case "oraculum-specilli":
      return makeWorkUsageKey(spell.instanceId, "oraculum-work-activate");
    default:
      return null;
  }
};

const getStatusChips = (spell: InPlaySpell): string[] => {
  const chips: string[] = [];

  if (spell.status === "announced") {
    chips.push("Announced");
  }
  if (spell.jamCounters > 0) {
    chips.push(`Jam ${spell.jamCounters}`);
  }
  if (spell.type === "Seal") {
    chips.push(spell.armed ? "Armed" : "Dormant");
  }

  return chips;
};

const getPreviewFallbackSpellId = (state: GameState): string | null => {
  const forgeCard = state.forgeGrid.find(
    (spellId): spellId is string => spellId !== null,
  );
  if (forgeCard) {
    return forgeCard;
  }
  if (state.spent.length > 0) {
    return state.spent[state.spent.length - 1];
  }
  return null;
};

const getRequirementPrompt = (requirement: TargetRequirement): string => {
  if (isInPlayTargetRequirement(requirement)) {
    const effect = requirement.effect;
    switch (effect.target.kind) {
      case "chosenSummonWithMaxCost":
        return `Choose a Summon in play that costs ${effect.target.maxCost} or less.`;
      case "chosenArmedSeal":
        return "Choose an Armed Seal in play.";
      case "chosenJammedSpell":
        return "Choose a jammed spell in play.";
      case "chosenInPlaySpellOptional":
        return "Choose a spell in play, or skip this target.";
      default:
        return "Choose a spell in play.";
    }
  }

  if (isReserveTargetRequirement(requirement)) {
    return "Choose a card from your Reserve to Dispel, or skip it.";
  }

  if (isForgeSlotTargetRequirement(requirement)) {
    return "Choose a Forge slot for the discount.";
  }

  return "Choose the remaining target.";
};

export interface GameBoardProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export const GameBoard = ({ state, dispatch }: GameBoardProps) => {
  const [seedInput, setSeedInput] = useState(() => String(state.seed));
  const [pendingCast, setPendingCast] = useState<PendingCast | null>(null);
  const [unjamSelection, setUnjamSelection] = useState<Record<string, boolean>>(
    {},
  );
  const [inspectedSpellId, setInspectedSpellId] = useState<string | null>(null);
  const [spentOpen, setSpentOpen] = useState(false);

  const actingPlayer: PlayerId | null = useMemo(() => {
    if (state.phase === "work") {
      return state.activePlayer;
    }
    if (state.phase === "response") {
      return otherPlayer(state.activePlayer);
    }
    return null;
  }, [state.activePlayer, state.phase]);

  const triggeredSeals = useMemo(
    () => getTriggeredSealsForPending(state),
    [state],
  );

  const jammedForActive = useMemo(
    () =>
      getInPlayForPlayer(state, state.activePlayer).filter(
        (spell) => spell.jamCounters > 0,
      ),
    [state],
  );

  const previewSpellId =
    inspectedSpellId ??
    state.pendingAnnouncement?.spellId ??
    getPreviewFallbackSpellId(state);

  const previewSpell = previewSpellId
    ? getSpellDefinition(previewSpellId)
    : null;

  const currentRequirement = getCurrentRequirement(pendingCast);
  const inPlayInstanceIds = useMemo(
    () => new Set(state.inPlay.map((spell) => spell.instanceId)),
    [state.inPlay],
  );

  const chosenInPlayTargetIds = useMemo(() => {
    if (!pendingCast) {
      return new Set<string>();
    }

    return new Set(
      Object.values(pendingCast.selections).filter(
        (value): value is string =>
          typeof value === "string" && inPlayInstanceIds.has(value),
      ),
    );
  }, [inPlayInstanceIds, pendingCast]);

  const legalInPlayTargetIds = useMemo(() => {
    if (!currentRequirement || !isInPlayTargetRequirement(currentRequirement)) {
      return new Set<string>();
    }

    const effect = currentRequirement.effect;

    return new Set(
      state.inPlay
        .filter((spell) => {
          if (chosenInPlayTargetIds.has(spell.instanceId)) {
            return false;
          }

          switch (effect.target.kind) {
            case "chosenInPlaySpell":
            case "chosenInPlaySpellOptional":
              return true;
            case "chosenArmedSeal":
              return spell.type === "Seal" && spell.armed;
            case "chosenSummonWithMaxCost":
              return (
                spell.type === "Summon" &&
                getSpellDefinition(spell.spellId).costPower <=
                  effect.target.maxCost
              );
            case "chosenJammedSpell":
              return spell.jamCounters > 0;
            default:
              return false;
          }
        })
        .map((spell) => spell.instanceId),
    );
  }, [chosenInPlayTargetIds, currentRequirement, state.inPlay]);

  const isBoardTargetPrompt =
    currentRequirement !== null &&
    (isInPlayTargetRequirement(currentRequirement) ||
      isReserveTargetRequirement(currentRequirement) ||
      isForgeSlotTargetRequirement(currentRequirement));

  const spentCards = useMemo(() => [...state.spent].reverse(), [state.spent]);
  const spentTopSpellId = spentCards[0] ?? null;

  const openCastFlow = (
    player: PlayerId,
    source: SpellSource,
    spellId: string,
  ) => {
    const spell = getSpellDefinition(spellId);
    const requirements = getResolveTargetRequirements(spell);
    setInspectedSpellId(spellId);

    if (requirements.length === 0) {
      dispatch({
        type: "AnnounceSpell",
        player,
        source,
        spellId,
      });
      return;
    }

    setPendingCast({
      player,
      source,
      spellId,
      requirements,
      selections: {},
    });
  };

  const dispatchCast = (cast: PendingCast) => {
    const requiredRequirements = cast.requirements.filter(
      (requirement) => !requirement.optional,
    );
    if (
      requiredRequirements.some(
        (requirement) => cast.selections[requirement.effectIndex] == null,
      )
    ) {
      return;
    }

    const targets: TargetChoice[] = cast.requirements
      .map((requirement) => ({
        effectIndex: requirement.effectIndex,
        value: cast.selections[requirement.effectIndex],
      }))
      .filter(
        (choice): choice is TargetChoice =>
          choice.value !== undefined && choice.value !== null,
      );

    dispatch({
      type: "AnnounceSpell",
      player: cast.player,
      source: cast.source,
      spellId: cast.spellId,
      targets,
    });
    setPendingCast(null);
  };

  const updatePendingSelection = (
    effectIndex: number,
    value: PendingSelectionValue,
  ) => {
    if (!pendingCast) {
      return;
    }

    const nextCast: PendingCast = {
      ...pendingCast,
      selections: {
        ...pendingCast.selections,
        [effectIndex]: value,
      },
    };

    if (getCurrentRequirement(nextCast) === null) {
      dispatchCast(nextCast);
      return;
    }

    setPendingCast(nextCast);
  };

  const refreshSeed = () => {
    const nextSeed = makeRandomSeed();
    setSeedInput(String(nextSeed));
    setInspectedSpellId(null);
    setPendingCast(null);
    setUnjamSelection({});
    setSpentOpen(false);
    dispatch({ type: "NewGame", seed: nextSeed });
  };

  const applySeed = () => {
    const parsed = Number(seedInput);
    if (!Number.isFinite(parsed)) {
      return;
    }
    setInspectedSpellId(null);
    setPendingCast(null);
    setUnjamSelection({});
    setSpentOpen(false);
    dispatch({ type: "NewGame", seed: Math.trunc(parsed) });
  };

  const confirmUnjam = () => {
    const chosen = Object.entries(unjamSelection)
      .filter(([, selected]) => selected)
      .map(([instanceId]) => instanceId);

    dispatch({
      type: "ChooseUnjam",
      player: state.activePlayer,
      instanceIds: chosen,
    });
    setUnjamSelection({});
  };

  const renderPlayerZone = (player: PlayerId) => {
    const reserveKey = player === 0 ? "player0" : "player1";
    const reserveCards = state.reserve[reserveKey];
    const inPlayCards = getInPlayForPlayer(state, player);

    return (
      <section
        key={player}
        className={`player-zone ${
          state.activePlayer === player ? "player-zone--active" : ""
        }`}
      >
        <header className="zone-header">
          <div>
            <span className="zone-eyebrow">
              {player === 1 ? "North Bench" : "South Bench"}
            </span>
            <h2>{getPlayerLabel(player)}</h2>
          </div>
          <div className="zone-markers">
            {state.activePlayer === player ? (
              <span className="zone-pill zone-pill--active">Active</span>
            ) : null}
            {state.phase === "gameOver" && state.winner === player ? (
              <span className="zone-pill zone-pill--winner">Winner</span>
            ) : null}
          </div>
        </header>

        <div className="resource-strip">
          <span className="resource-chip">
            <strong>Aether</strong> {state.cores[player].aether}
          </span>
          <span className="resource-chip">
            <strong>Stress</strong> {state.cores[player].stress}
          </span>
          <span className="resource-chip">
            <strong>Power</strong> {state.power[player]} /{" "}
            {state.powerLimit[player]}
          </span>
          <span className="resource-chip">
            <strong>Cycle</strong> {state.cycleNumber}
          </span>
        </div>

        <section className="zone-section">
          <div className="zone-section__header">
            <h3>Reserve</h3>
            <span>{reserveCards.length}</span>
          </div>
          {reserveCards.length === 0 ? (
            <div className="card-rack card-rack--empty">
              <div className="rack-placeholder">No reserve cards.</div>
            </div>
          ) : (
            <div className="card-rack">
              {reserveCards.map((spellId, reserveIndex) => {
                const spell = getSpellDefinition(spellId);
                const canPlay = canPlayFromReserve(state, player, reserveIndex);
                const isReserveTarget =
                  pendingCast?.player === player &&
                  currentRequirement !== null &&
                  isReserveTargetRequirement(currentRequirement);
                const isSelectedReserveTarget =
                  isReserveTarget &&
                  pendingCast.selections[currentRequirement.effectIndex] ===
                    spell.id;
                const canSelectReserveTarget = isReserveTarget;
                const reserveAction =
                  canSelectReserveTarget && currentRequirement
                    ? () =>
                        updatePendingSelection(
                          currentRequirement.effectIndex,
                          spell.id,
                        )
                    : !pendingCast && canPlay
                      ? () =>
                          openCastFlow(
                            player,
                            { zone: "reserve", reserveIndex },
                            spell.id,
                          )
                      : undefined;

                return (
                  <CardFace
                    key={`${spellId}-${reserveIndex}`}
                    spell={spell}
                    size="rack"
                    subtitle="Reserve"
                    actionLabel={
                      isReserveTarget
                        ? "Target"
                        : reserveAction
                          ? PLAY_VERB_BY_TYPE[spell.type]
                          : undefined
                    }
                    actionDisabled={reserveAction === undefined}
                    highlighted={canSelectReserveTarget}
                    selected={isSelectedReserveTarget}
                    muted={
                      Boolean(pendingCast) &&
                      !canSelectReserveTarget &&
                      !isSelectedReserveTarget
                    }
                    onAction={reserveAction}
                    onInspect={() => setInspectedSpellId(spell.id)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="zone-section">
          <div className="zone-section__header">
            <h3>In Play</h3>
            <span>{inPlayCards.length}</span>
          </div>
          {inPlayCards.length === 0 ? (
            <div className="card-rack card-rack--empty">
              <div className="rack-placeholder">No spells in play.</div>
            </div>
          ) : (
            <div className="card-rack">
              {inPlayCards.map((spell) => {
                const definition = getSpellDefinition(spell.spellId);
                const activationKey = getActivationKey(spell);
                const canActivate =
                  activationKey !== null &&
                  state.phase === "work" &&
                  state.activePlayer === player &&
                  spell.status === "inPlay" &&
                  spell.jamCounters === 0;
                const activationAvailable =
                  canActivate &&
                  activationKey !== null &&
                  !hasWorkUsage(state, activationKey);
                const isTargetable =
                  currentRequirement !== null &&
                  isInPlayTargetRequirement(currentRequirement) &&
                  legalInPlayTargetIds.has(spell.instanceId);
                const isSelectedTarget =
                  chosenInPlayTargetIds.has(spell.instanceId);
                const inPlayAction =
                  isTargetable && currentRequirement
                    ? () =>
                        updatePendingSelection(
                          currentRequirement.effectIndex,
                          spell.instanceId,
                        )
                    : !pendingCast && activationAvailable
                      ? () =>
                          dispatch({
                            type: "ActivateSpellAbility",
                            player,
                            instanceId: spell.instanceId,
                          })
                      : undefined;

                return (
                  <CardFace
                    key={spell.instanceId}
                    spell={definition}
                    size="rack"
                    subtitle={spell.instanceId}
                    statusChips={getStatusChips(spell)}
                    actionLabel={
                      isTargetable
                        ? "Target"
                        : inPlayAction
                          ? "Activate"
                          : undefined
                    }
                    actionDisabled={inPlayAction === undefined}
                    highlighted={isTargetable}
                    selected={isSelectedTarget}
                    muted={
                      currentRequirement !== null &&
                      isInPlayTargetRequirement(currentRequirement) &&
                      !isTargetable &&
                      !isSelectedTarget
                    }
                    onAction={inPlayAction}
                    onInspect={() => setInspectedSpellId(spell.spellId)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </section>
    );
  };

  return (
    <main className="layout layout--table">
      <header className="masthead">
        <div className="masthead__copy">
          <span className="masthead__eyebrow">Prototype Table</span>
          <h1>Arcane Forge</h1>
          <p>
            Card-face rendering, art hooks, and a playmat board are now wired.
          </p>
        </div>
        <div className="masthead__controls">
          <label>
            Seed
            <input
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              className="seed-input"
            />
          </label>
          <button onClick={applySeed}>New Game</button>
          <button onClick={refreshSeed}>Reseed</button>
        </div>
      </header>

      <div className="table-shell">
        <section className="playmat">
          <div className="playmat__glow playmat__glow--left" />
          <div className="playmat__glow playmat__glow--right" />
          <div className="battlefield">
            <section className="forge-sanctum">
              <header className="forge-sanctum__header">
                <div>
                  <span className="zone-eyebrow">Shared Forge</span>
                  <h2>Forge</h2>
                </div>
                <div className="forge-readout">
                  <span className="resource-chip">
                    <strong>Deck</strong> {state.forgeDeck.length}
                  </span>
                  <span className="resource-chip">
                    <strong>Spent</strong> {state.spent.length}
                  </span>
                </div>
              </header>

              <div className="forge-grid forge-grid--cards">
                {state.forgeGrid.map((spellId, slotIndex) => {
                  const isForgeTarget =
                    currentRequirement !== null &&
                    isForgeSlotTargetRequirement(currentRequirement);
                  const isSelectedForgeTarget =
                    isForgeTarget &&
                    pendingCast?.selections[currentRequirement.effectIndex] ===
                      slotIndex;
                  const forgeTargetAction =
                    isForgeTarget && currentRequirement
                      ? () =>
                          updatePendingSelection(
                            currentRequirement.effectIndex,
                            slotIndex,
                          )
                      : undefined;

                  if (!spellId) {
                    return (
                      <article
                        key={slotIndex}
                        className={`card-slot card-slot--empty ${
                          isForgeTarget ? "card-slot--targetable" : ""
                        } ${isSelectedForgeTarget ? "card-slot--selected" : ""}`}
                        onClick={forgeTargetAction}
                        role={forgeTargetAction ? "button" : undefined}
                        tabIndex={forgeTargetAction ? 0 : -1}
                        onKeyDown={(event) => {
                          if (!forgeTargetAction) {
                            return;
                          }
                          if (event.key !== "Enter" && event.key !== " ") {
                            return;
                          }
                          event.preventDefault();
                          forgeTargetAction();
                        }}
                      >
                        <span>
                          {isForgeTarget
                            ? `Choose slot ${slotIndex + 1}`
                            : "Empty Forge slot"}
                        </span>
                      </article>
                    );
                  }

                  const spell = getSpellDefinition(spellId);
                  const canPlay =
                    actingPlayer !== null &&
                    canPlayFromForgeSlot(state, actingPlayer, slotIndex);
                  const forgeAction =
                    forgeTargetAction ??
                    (!pendingCast && canPlay && actingPlayer !== null
                      ? () =>
                          openCastFlow(
                            actingPlayer,
                            { zone: "forge", slotIndex },
                            spell.id,
                          )
                      : undefined);

                  return (
                    <CardFace
                      key={slotIndex}
                      spell={spell}
                      size="forge"
                      subtitle={`Forge ${slotIndex + 1}`}
                      actionLabel={
                        isForgeTarget
                          ? "Target"
                          : forgeAction
                            ? PLAY_VERB_BY_TYPE[spell.type]
                            : undefined
                      }
                      actionDisabled={forgeAction === undefined}
                      highlighted={isForgeTarget}
                      selected={isSelectedForgeTarget}
                      muted={Boolean(pendingCast) && !isForgeTarget}
                      onAction={forgeAction}
                      onInspect={() => setInspectedSpellId(spell.id)}
                    />
                  );
                })}
              </div>
            </section>

            <div className="bench-column">
              {PLAYER_ORDER.map((player) => renderPlayerZone(player))}
            </div>
          </div>
        </section>

        <aside className="side-rail">
          <section className="panel panel--rail">
            <div className="panel__header">
              <h2>Preview</h2>
              <span className="zone-pill">{getPhaseLabel(state.phase)}</span>
            </div>
            {previewSpell ? (
              <CardFace
                key={previewSpell.id}
                spell={previewSpell}
                size="preview"
                subtitle={previewSpell.id}
              />
            ) : (
              <div className="preview-placeholder">
                Hover a card to inspect it.
              </div>
            )}
            <p className="helper-text">
              Art hook: place files in `public/card-art/` using the card
              `spellId` as the filename, for example
              `public/card-art/lemur-cineris.jpg`.
            </p>
          </section>

          <section className="panel panel--rail controls">
            <div className="panel__header">
              <h2>Turn Controls</h2>
              <span className="zone-pill">
                {getPlayerLabel(state.activePlayer)}
              </span>
            </div>

            {pendingCast && currentRequirement && isBoardTargetPrompt ? (
              <div className="targeting-note">
                <p>
                  <strong>{getSpellDefinition(pendingCast.spellId).name}</strong>
                </p>
                <p>{getRequirementPrompt(currentRequirement)}</p>
                {isInPlayTargetRequirement(currentRequirement) &&
                legalInPlayTargetIds.size === 0 ? (
                  <p>No legal cards are available for this target right now.</p>
                ) : null}
                <div className="button-row">
                  {currentRequirement.optional ? (
                    <button
                      onClick={() =>
                        updatePendingSelection(
                          currentRequirement.effectIndex,
                          null,
                        )
                      }
                    >
                      Skip Target
                    </button>
                  ) : null}
                  <button onClick={() => setPendingCast(null)}>Cancel Cast</button>
                </div>
              </div>
            ) : null}

            {state.phase === "work" && !pendingCast ? (
              <div className="response-panel">
                <p>
                  Play from the Forge or Reserve, then pass into Maintenance.
                </p>
                <div className="button-row">
                  <button onClick={() => dispatch({ type: "AdvancePhase" })}>
                    End Work
                  </button>
                </div>
              </div>
            ) : null}

            {state.phase === "response" &&
            state.pendingAnnouncement &&
            !pendingCast ? (
              <div className="response-panel">
                <p>
                  Announced:{" "}
                  <strong>
                    {getSpellDefinition(state.pendingAnnouncement.spellId).name}
                  </strong>
                </p>
                <p>By {getPlayerLabel(state.pendingAnnouncement.controller)}</p>
                <p>
                  Triggered Seals:{" "}
                  {triggeredSeals.length > 0
                    ? triggeredSeals
                        .map((seal) => getSpellDefinition(seal.spellId).name)
                        .join(", ")
                    : "None"}
                </p>
                <button onClick={() => dispatch({ type: "ResolveResponse" })}>
                  Resolve Response
                </button>
              </div>
            ) : null}

            {state.phase === "maintenance_unjam" ? (
              <div className="maintenance-panel">
                <p>Remove 1 Jam counter from any number of your spells.</p>
                {jammedForActive.length === 0 ? (
                  <p>No jammed spells under your control.</p>
                ) : (
                  <div className="unjam-list">
                    {jammedForActive.map((spell) => (
                      <label key={spell.instanceId}>
                        <input
                          type="checkbox"
                          checked={Boolean(unjamSelection[spell.instanceId])}
                          onChange={(event) =>
                            setUnjamSelection((prev) => ({
                              ...prev,
                              [spell.instanceId]: event.target.checked,
                            }))
                          }
                        />
                        {getSpellDefinition(spell.spellId).name} (
                        {spell.jamCounters} jam)
                      </label>
                    ))}
                  </div>
                )}
                <button onClick={confirmUnjam}>Continue Maintenance</button>
              </div>
            ) : null}
          </section>

          <section className="panel panel--rail">
            <div className="panel__header">
              <h2>Spent</h2>
              <span>{state.spent.length}</span>
            </div>
            {spentTopSpellId ? (
              <>
                <button
                  type="button"
                  className="spent-pile"
                  onClick={() => setSpentOpen(true)}
                  onMouseEnter={() => setInspectedSpellId(spentTopSpellId)}
                  onFocus={() => setInspectedSpellId(spentTopSpellId)}
                >
                  <span className="spent-pile__back spent-pile__back--far" />
                  <span className="spent-pile__back spent-pile__back--near" />
                  <CardFace
                    spell={getSpellDefinition(spentTopSpellId)}
                    size="rack"
                    subtitle="Top of Spent"
                  />
                </button>
                <p className="helper-text">
                  Click the pile to fan out the discard and inspect every card.
                </p>
              </>
            ) : (
              <div className="preview-placeholder">Spent is empty.</div>
            )}
          </section>

          <section className="panel panel--rail">
            <div className="panel__header">
              <h2>Event Log</h2>
            </div>
            <ul className="plain-list log-list">
              {getLastEvents(state, 16).map((event) => (
                <li key={event.id}>
                  [{event.id}] {event.message}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {spentOpen ? (
        <div className="modal-scrim" onClick={() => setSpentOpen(false)}>
          <section
            className="panel spent-tray"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel__header">
              <h2>Spent Pile</h2>
              <span>{state.spent.length} cards</span>
            </div>
            <div className="spent-grid">
              {spentCards.map((spellId, index) => (
                <CardFace
                  key={`${spellId}-${index}`}
                  spell={getSpellDefinition(spellId)}
                  size="rack"
                  subtitle={index === 0 ? "Top of Spent" : `Spent ${index + 1}`}
                  onInspect={() => setInspectedSpellId(spellId)}
                />
              ))}
            </div>
            <div className="button-row">
              <button onClick={() => setSpentOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingCast && currentRequirement && !isBoardTargetPrompt ? (
        <div className="modal-scrim">
          <section className="panel cast-panel">
            <div className="panel__header">
              <h2>Select Target</h2>
              <span>{getSpellDefinition(pendingCast.spellId).name}</span>
            </div>
            <p>{getRequirementPrompt(currentRequirement)}</p>
            <div className="target-list">
              {isChosenCoreRequirement(currentRequirement) ? (
                <>
                  <button
                    onClick={() =>
                      updatePendingSelection(currentRequirement.effectIndex, 0)
                    }
                  >
                    {getPlayerLabel(0)}
                  </button>
                  <button
                    onClick={() =>
                      updatePendingSelection(currentRequirement.effectIndex, 1)
                    }
                  >
                    {getPlayerLabel(1)}
                  </button>
                </>
              ) : (
                <p>No direct target control is available for this effect yet.</p>
              )}
            </div>
            <div className="button-row">
              <button onClick={() => setPendingCast(null)}>Cancel</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
};
