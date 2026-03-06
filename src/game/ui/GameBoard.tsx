import { useMemo, useState, type Dispatch } from "react";
import type { GameState } from "../model/gameState";
import {
  PLAY_VERB_BY_TYPE,
  otherPlayer,
  type PlayerId,
  type SpellType,
} from "../model/keywords";
import type { TargetChoice, TargetValue } from "../model/spell";
import type { SpellSource } from "../model/zones";
import type { GameAction } from "../rules/actions";
import {
  canDrawPower,
  canPlayFromForgeSlot,
  canPlayFromScryReveal,
  getInPlayForPlayer,
  getLastEvents,
  getResolveTargetRequirements,
  getSpellDefinition,
  getTriggeredSealsForPending,
  type TargetRequirement,
} from "../state/selectors";
import { makeRandomSeed } from "../state/store";

type PendingCast = {
  player: PlayerId;
  source: SpellSource;
  spellId: string;
  requirements: TargetRequirement[];
  selections: Record<number, TargetValue>;
};

const typeBadgeClass = (type: SpellType): string => {
  switch (type) {
    case "Summon":
      return "badge badge-summon";
    case "Incantation":
      return "badge badge-incantation";
    case "Seal":
      return "badge badge-seal";
    default:
      return "badge";
  }
};

const getPlayerLabel = (player: PlayerId): string => `Artificer ${player + 1}`;

export interface GameBoardProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export const GameBoard = ({ state, dispatch }: GameBoardProps) => {
  const [seedInput, setSeedInput] = useState(() => String(state.seed));
  const [pendingCast, setPendingCast] = useState<PendingCast | null>(null);
  const [unjamSelection, setUnjamSelection] = useState<Record<string, boolean>>({});

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

  const openCastFlow = (player: PlayerId, source: SpellSource, spellId: string) => {
    const spell = getSpellDefinition(spellId);
    const requirements = getResolveTargetRequirements(spell);
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

    const targets: TargetChoice[] = pendingCast.requirements.map((requirement) => ({
      effectIndex: requirement.effectIndex,
      value: pendingCast.selections[requirement.effectIndex],
    }));

    if (targets.some((target) => target.value === undefined)) {
      return;
    }

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
    dispatch({ type: "NewGame", seed: nextSeed });
    setPendingCast(null);
    setUnjamSelection({});
  };

  const applySeed = () => {
    const parsed = Number(seedInput);
    if (!Number.isFinite(parsed)) {
      return;
    }
    dispatch({ type: "NewGame", seed: Math.trunc(parsed) });
    setPendingCast(null);
    setUnjamSelection({});
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

  return (
    <main className="layout">
      <header className="topbar panel">
        <div className="title-group">
          <h1>Arcane Forge</h1>
          <p>Shared Forge. Deterministic duel.</p>
        </div>
        <div className="seed-controls">
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

      <section className="hud-grid">
        {[0, 1].map((rawPlayer) => {
          const player = rawPlayer as PlayerId;
          return (
            <article
              key={player}
              className={`panel hud ${
                state.activePlayer === player ? "active-player" : ""
              }`}
            >
              <h2>{getPlayerLabel(player)}</h2>
              <div className="stats">
                <span>Aether: {state.cores[player].aether}</span>
                <span>Stress: {state.cores[player].stress}</span>
                <span>
                  Power: {state.power[player]} / {state.powerLimit[player]}
                </span>
                <span>Cycle: {state.cycleNumber}</span>
              </div>
              <div className="status-row">
                {state.activePlayer === player ? <strong>Active Turn</strong> : <span>Waiting</span>}
                {state.phase === "gameOver" && state.winner === player ? (
                  <strong>Winner</strong>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel controls">
        <h2>Turn Controls</h2>
        {state.phase === "work" && (
          <div className="button-row">
            <button
              onClick={() =>
                dispatch({ type: "DrawPower", player: state.activePlayer })
              }
              disabled={!canDrawPower(state, state.activePlayer)}
            >
              Draw Power
            </button>
            <button onClick={() => dispatch({ type: "AdvancePhase" })}>End Work</button>
          </div>
        )}
        {state.phase === "response" && state.pendingAnnouncement && (
          <div className="response-panel">
            <p>
              Announced:{" "}
              <strong>{getSpellDefinition(state.pendingAnnouncement.spellId).name}</strong>{" "}
              by {getPlayerLabel(state.pendingAnnouncement.controller)}
            </p>
            <p>
              Triggered Seals:{" "}
              {triggeredSeals.length > 0
                ? triggeredSeals
                    .map((seal) => getSpellDefinition(seal.spellId).name)
                    .join(", ")
                : "None"}
            </p>
            <p>
              {getPlayerLabel(otherPlayer(state.activePlayer))} may play Response spells from
              Forge/Scry, then resolve.
            </p>
            <button onClick={() => dispatch({ type: "ResolveResponse" })}>
              Resolve Response
            </button>
          </div>
        )}
        {state.phase === "maintenance_unjam" && (
          <div className="maintenance-panel">
            <p>
              Maintenance: remove 1 Jam counter from any number of your spells.
            </p>
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
                    {getSpellDefinition(spell.spellId).name} ({spell.jamCounters} jam)
                  </label>
                ))}
              </div>
            )}
            <button onClick={confirmUnjam}>Continue Maintenance</button>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Forge (3x3)</h2>
        <div className="forge-grid">
          {state.forgeGrid.map((spellId, slotIndex) => {
            if (!spellId) {
              return (
                <article key={slotIndex} className="forge-slot forge-empty">
                  <span>Empty slot</span>
                </article>
              );
            }

            const spell = getSpellDefinition(spellId);
            const canPlay = actingPlayer !== null && canPlayFromForgeSlot(state, actingPlayer, slotIndex);

            return (
              <article key={slotIndex} className="forge-slot">
                <div className="spell-top">
                  <span className={typeBadgeClass(spell.type)}>{spell.type}</span>
                  <span>Cost {spell.costPower}</span>
                </div>
                <h3>{spell.name}</h3>
                <p className="rules">{spell.rulesText}</p>
                <details>
                  <summary>Flavor</summary>
                  <p className="flavor">{spell.flavorText}</p>
                </details>
                <button
                  disabled={!canPlay || actingPlayer === null}
                  onClick={() =>
                    actingPlayer !== null &&
                    openCastFlow(actingPlayer, { zone: "forge", slotIndex }, spell.id)
                  }
                >
                  {PLAY_VERB_BY_TYPE[spell.type]}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="two-col">
        {[0, 1].map((rawPlayer) => {
          const player = rawPlayer as PlayerId;
          const key = player === 0 ? "player0" : "player1";
          const reveals = state.scryReveals[key];

          return (
            <article key={player} className="panel">
              <h2>{getPlayerLabel(player)} Scry Reveals</h2>
              {reveals.length === 0 ? (
                <p>No reveals.</p>
              ) : (
                <div className="reveal-list">
                  {reveals.map((spellId, revealIndex) => {
                    const spell = getSpellDefinition(spellId);
                    const canPlay = canPlayFromScryReveal(state, player, revealIndex);
                    return (
                      <div key={`${spellId}-${revealIndex}`} className="reveal-card">
                        <div>
                          <strong>{spell.name}</strong> ({spell.type}, Cost {spell.costPower})
                        </div>
                        <button
                          disabled={!canPlay}
                          onClick={() =>
                            openCastFlow(player, { zone: "scry", revealIndex }, spell.id)
                          }
                        >
                          {PLAY_VERB_BY_TYPE[spell.type]}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="two-col">
        {[0, 1].map((rawPlayer) => {
          const player = rawPlayer as PlayerId;
          return (
            <article key={player} className="panel">
              <h2>{getPlayerLabel(player)} In Play</h2>
              {getInPlayForPlayer(state, player).length === 0 ? (
                <p>No spells in play.</p>
              ) : (
                <div className="in-play-list">
                  {getInPlayForPlayer(state, player).map((spell) => {
                    const card = getSpellDefinition(spell.spellId);
                    return (
                      <div key={spell.instanceId} className="in-play-card">
                        <strong>{card.name}</strong>
                        <span className={typeBadgeClass(card.type)}>{card.type}</span>
                        <span>Status: {spell.status}</span>
                        <span>Jam: {spell.jamCounters}</span>
                        {spell.type === "Seal" ? (
                          <span>{spell.armed ? "Armed" : "Disarmed"}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="two-col">
        <article className="panel">
          <h2>Spent ({state.spent.length})</h2>
          <details>
            <summary>Show cards</summary>
            <ul className="plain-list">
              {state.spent.map((spellId, index) => (
                <li key={`${spellId}-${index}`}>{getSpellDefinition(spellId).name}</li>
              ))}
            </ul>
          </details>
        </article>

        <article className="panel">
          <h2>Event Log</h2>
          <ul className="plain-list log-list">
            {getLastEvents(state, 14).map((event) => (
              <li key={event.id}>
                [{event.id}] {event.message}
              </li>
            ))}
          </ul>
        </article>
      </section>

      {pendingCast && (
        <section className="panel cast-panel">
          <h2>Select Targets</h2>
          <p>
            {getSpellDefinition(pendingCast.spellId).name} requires target selection before
            announcement.
          </p>
          <div className="target-list">
            {pendingCast.requirements.map((requirement) => {
              const effect = requirement.effect;

              if (
                (effect.type === "Dispel" || effect.type === "Jam") &&
                effect.target.kind === "chosenInPlaySpell"
              ) {
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
                                  [requirement.effectIndex]: event.target.value,
                                },
                              }
                            : prev,
                        )
                      }
                    >
                      <option value="">Select a spell</option>
                      {state.inPlay.map((spell) => (
                        <option key={spell.instanceId} value={spell.instanceId}>
                          {getSpellDefinition(spell.spellId).name} ({spell.instanceId})
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
                                  [requirement.effectIndex]: event.target.value,
                                },
                              }
                            : prev,
                        )
                      }
                    >
                      <option value="">Select a seal</option>
                      {armedSeals.map((spell) => (
                        <option key={spell.instanceId} value={spell.instanceId}>
                          {getSpellDefinition(spell.spellId).name} ({spell.instanceId})
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
                    value={String(pendingCast.selections[requirement.effectIndex] ?? "")}
                    onChange={(event) =>
                      setPendingCast((prev) =>
                        prev
                          ? {
                              ...prev,
                              selections: {
                                ...prev.selections,
                                [requirement.effectIndex]: Number(event.target.value) as PlayerId,
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
      )}
    </main>
  );
};
