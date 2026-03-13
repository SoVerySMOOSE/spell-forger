import { useMemo, useState, type Dispatch } from "react";
import type { GameState, InPlaySpell } from "../model/gameState";
import {
  PLAY_VERB_BY_TYPE,
  otherPlayer,
  type PlayerId,
} from "../model/keywords";
import type { TargetChoice, TargetValue } from "../model/spell";
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

type PendingCast = {
  player: PlayerId;
  source: SpellSource;
  spellId: string;
  requirements: TargetRequirement[];
  selections: Partial<Record<number, TargetValue>>;
};

const PLAYER_ORDER: PlayerId[] = [1, 0];

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

  const dispatchCast = () => {
    if (!pendingCast) {
      return;
    }

    const requiredRequirements = pendingCast.requirements.filter(
      (requirement) => !requirement.optional,
    );
    if (
      requiredRequirements.some(
        (requirement) =>
          pendingCast.selections[requirement.effectIndex] === undefined,
      )
    ) {
      return;
    }

    const targets: TargetChoice[] = pendingCast.requirements
      .map((requirement) => ({
        effectIndex: requirement.effectIndex,
        value: pendingCast.selections[requirement.effectIndex],
      }))
      .filter((choice) => choice.value !== undefined) as TargetChoice[];

    dispatch({
      type: "AnnounceSpell",
      player: pendingCast.player,
      source: pendingCast.source,
      spellId: pendingCast.spellId,
      targets,
    });
    setPendingCast(null);
  };

  const refreshSeed = () => {
    const nextSeed = makeRandomSeed();
    setSeedInput(String(nextSeed));
    setInspectedSpellId(null);
    setPendingCast(null);
    setUnjamSelection({});
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

                return (
                  <CardFace
                    key={`${spellId}-${reserveIndex}`}
                    spell={spell}
                    size="rack"
                    subtitle="Reserve"
                    actionLabel={PLAY_VERB_BY_TYPE[spell.type]}
                    actionDisabled={!canPlay}
                    onAction={() =>
                      openCastFlow(
                        player,
                        { zone: "reserve", reserveIndex },
                        spell.id,
                      )
                    }
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
                const actionDisabled =
                  !canActivate ||
                  (activationKey !== null &&
                    hasWorkUsage(state, activationKey));

                return (
                  <CardFace
                    key={spell.instanceId}
                    spell={definition}
                    size="rack"
                    subtitle={spell.instanceId}
                    statusChips={getStatusChips(spell)}
                    actionLabel={activationKey ? "Activate" : undefined}
                    actionDisabled={actionDisabled}
                    onAction={
                      activationKey
                        ? () =>
                            dispatch({
                              type: "ActivateSpellAbility",
                              player,
                              instanceId: spell.instanceId,
                            })
                        : undefined
                    }
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

          {PLAYER_ORDER.map((player) => renderPlayerZone(player))}

          <section className="forge-sanctum">
            <header className="forge-sanctum__header">
              <div>
                <span className="zone-eyebrow">Shared Centerline</span>
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
                if (!spellId) {
                  return (
                    <article
                      key={slotIndex}
                      className="card-slot card-slot--empty"
                    >
                      <span>Empty Forge slot</span>
                    </article>
                  );
                }

                const spell = getSpellDefinition(spellId);
                const canPlay =
                  actingPlayer !== null &&
                  canPlayFromForgeSlot(state, actingPlayer, slotIndex);

                return (
                  <CardFace
                    key={slotIndex}
                    spell={spell}
                    size="table"
                    subtitle={`Forge ${slotIndex + 1}`}
                    actionLabel={PLAY_VERB_BY_TYPE[spell.type]}
                    actionDisabled={!canPlay || actingPlayer === null}
                    onAction={() =>
                      actingPlayer !== null &&
                      openCastFlow(
                        actingPlayer,
                        { zone: "forge", slotIndex },
                        spell.id,
                      )
                    }
                    onInspect={() => setInspectedSpellId(spell.id)}
                  />
                );
              })}
            </div>
          </section>
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

            {state.phase === "work" ? (
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

            {state.phase === "response" && state.pendingAnnouncement ? (
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
            <ul className="plain-list">
              {state.spent.length === 0 ? (
                <li>Spent is empty.</li>
              ) : (
                state.spent.map((spellId, index) => (
                  <li key={`${spellId}-${index}`}>
                    {getSpellDefinition(spellId).name}
                  </li>
                ))
              )}
            </ul>
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

      {pendingCast ? (
        <div className="modal-scrim">
          <section className="panel cast-panel">
            <div className="panel__header">
              <h2>Select Targets</h2>
              <span>{getSpellDefinition(pendingCast.spellId).name}</span>
            </div>
            <p>Finish the announcement by choosing all required targets.</p>
            <div className="target-list">
              {pendingCast.requirements.map((requirement) => {
                const effect = requirement.effect;

                if (
                  (effect.type === "Dispel" || effect.type === "Jam") &&
                  (effect.target.kind === "chosenInPlaySpell" ||
                    effect.target.kind === "chosenInPlaySpellOptional")
                ) {
                  const optional =
                    effect.target.kind === "chosenInPlaySpellOptional";
                  return (
                    <label key={requirement.effectIndex}>
                      Target spell in play
                      <select
                        value={String(
                          pendingCast.selections[requirement.effectIndex] ?? "",
                        )}
                        onChange={(event) =>
                          setPendingCast((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  selections: {
                                    ...prev.selections,
                                    [requirement.effectIndex]:
                                      event.target.value,
                                  },
                                }
                              : prev,
                          )
                        }
                      >
                        <option value="">
                          {optional ? "No target" : "Select a spell"}
                        </option>
                        {state.inPlay.map((spell) => (
                          <option
                            key={spell.instanceId}
                            value={spell.instanceId}
                          >
                            {getSpellDefinition(spell.spellId).name} (
                            {spell.instanceId})
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (
                  effect.type === "Dispel" &&
                  effect.target.kind === "chosenSummonWithMaxCost"
                ) {
                  const { maxCost } = effect.target;
                  const legalSummons = state.inPlay.filter((spell) => {
                    if (spell.type !== "Summon") {
                      return false;
                    }
                    const card = getSpellDefinition(spell.spellId);
                    return card.costPower <= maxCost;
                  });
                  return (
                    <label key={requirement.effectIndex}>
                      Target Summon (cost {maxCost} or less)
                      <select
                        value={String(
                          pendingCast.selections[requirement.effectIndex] ?? "",
                        )}
                        onChange={(event) =>
                          setPendingCast((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  selections: {
                                    ...prev.selections,
                                    [requirement.effectIndex]:
                                      event.target.value,
                                  },
                                }
                              : prev,
                          )
                        }
                      >
                        <option value="">Select a summon</option>
                        {legalSummons.map((spell) => (
                          <option
                            key={spell.instanceId}
                            value={spell.instanceId}
                          >
                            {getSpellDefinition(spell.spellId).name} (
                            {spell.instanceId})
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (
                  effect.type === "Dispel" &&
                  effect.target.kind === "chosenJammedSpell"
                ) {
                  const jammedSpells = state.inPlay.filter(
                    (spell) => spell.jamCounters > 0,
                  );
                  return (
                    <label key={requirement.effectIndex}>
                      Target jammed spell
                      <select
                        value={String(
                          pendingCast.selections[requirement.effectIndex] ?? "",
                        )}
                        onChange={(event) =>
                          setPendingCast((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  selections: {
                                    ...prev.selections,
                                    [requirement.effectIndex]:
                                      event.target.value,
                                  },
                                }
                              : prev,
                          )
                        }
                      >
                        <option value="">Select a jammed spell</option>
                        {jammedSpells.map((spell) => (
                          <option
                            key={spell.instanceId}
                            value={spell.instanceId}
                          >
                            {getSpellDefinition(spell.spellId).name} (
                            {spell.instanceId})
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (
                  (effect.type === "Dispel" || effect.type === "Jam") &&
                  effect.target.kind === "chosenArmedSeal"
                ) {
                  const armedSeals = state.inPlay.filter(
                    (spell) => spell.type === "Seal" && spell.armed,
                  );
                  return (
                    <label key={requirement.effectIndex}>
                      Target armed seal
                      <select
                        value={String(
                          pendingCast.selections[requirement.effectIndex] ?? "",
                        )}
                        onChange={(event) =>
                          setPendingCast((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  selections: {
                                    ...prev.selections,
                                    [requirement.effectIndex]:
                                      event.target.value,
                                  },
                                }
                              : prev,
                          )
                        }
                      >
                        <option value="">Select a seal</option>
                        {armedSeals.map((spell) => (
                          <option
                            key={spell.instanceId}
                            value={spell.instanceId}
                          >
                            {getSpellDefinition(spell.spellId).name} (
                            {spell.instanceId})
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (effect.type === "GrantForgeSlotDiscount") {
                  return (
                    <label key={requirement.effectIndex}>
                      Choose Forge slot for discount
                      <select
                        value={String(
                          pendingCast.selections[requirement.effectIndex] ?? "",
                        )}
                        onChange={(event) =>
                          setPendingCast((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  selections: {
                                    ...prev.selections,
                                    [requirement.effectIndex]: Number(
                                      event.target.value,
                                    ),
                                  },
                                }
                              : prev,
                          )
                        }
                      >
                        <option value="">Select a slot</option>
                        {Array.from({ length: 9 }).map((_, slotIndex) => (
                          <option key={slotIndex} value={slotIndex}>
                            Slot {slotIndex + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (effect.type === "DispelReserveCardForPower") {
                  const key = pendingCast.player === 0 ? "player0" : "player1";
                  const reserveCards = state.reserve[key];
                  return (
                    <label key={requirement.effectIndex}>
                      Optional: Dispel one card from your Reserve
                      <select
                        value={String(
                          pendingCast.selections[requirement.effectIndex] ?? "",
                        )}
                        onChange={(event) =>
                          setPendingCast((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  selections: {
                                    ...prev.selections,
                                    [requirement.effectIndex]:
                                      event.target.value === ""
                                        ? undefined
                                        : event.target.value,
                                  },
                                }
                              : prev,
                          )
                        }
                      >
                        <option value="">No card</option>
                        {reserveCards.map((spellId) => (
                          <option key={spellId} value={spellId}>
                            {getSpellDefinition(spellId).name}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                return (
                  <label key={requirement.effectIndex}>
                    Target core
                    <select
                      value={String(
                        pendingCast.selections[requirement.effectIndex] ?? "",
                      )}
                      onChange={(event) =>
                        setPendingCast((prev) =>
                          prev
                            ? {
                                ...prev,
                                selections: {
                                  ...prev.selections,
                                  [requirement.effectIndex]: Number(
                                    event.target.value,
                                  ) as PlayerId,
                                },
                              }
                            : prev,
                        )
                      }
                    >
                      <option value="">Select a core</option>
                      <option value="0">{getPlayerLabel(0)}</option>
                      <option value="1">{getPlayerLabel(1)}</option>
                    </select>
                  </label>
                );
              })}
            </div>
            <div className="button-row">
              <button onClick={dispatchCast}>Confirm Cast</button>
              <button onClick={() => setPendingCast(null)}>Cancel</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
};
