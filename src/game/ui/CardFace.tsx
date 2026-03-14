import { useState, type KeyboardEvent, type ReactNode } from "react";
import type { SpellDefinition } from "../model/spell";
import { getCardPresentation } from "./cardPresentation";

type CardFaceSize = "forge" | "rack" | "preview";

export interface CardFaceProps {
  spell: SpellDefinition;
  size?: CardFaceSize;
  subtitle?: string;
  statusChips?: string[];
  metaLines?: string[];
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  muted?: boolean;
  footer?: ReactNode;
  onInspect?: () => void;
}

export const CardFace = ({
  spell,
  size = "rack",
  subtitle,
  statusChips = [],
  metaLines = [],
  actionLabel,
  onAction,
  actionDisabled = false,
  highlighted = false,
  selected = false,
  muted = false,
  footer,
  onInspect,
}: CardFaceProps) => {
  const presentation = getCardPresentation(spell.id, spell.type);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageFailed = failedSrc === presentation.artSrc;
  const isForgeCard = size === "forge";
  const isInteractiveCard = Boolean(onAction);
  const tabIndex = onInspect || isInteractiveCard ? 0 : -1;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isInteractiveCard || !onAction) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    if (!actionDisabled) {
      onAction();
    }
  };

  return (
    <article
      className={`card-face ${presentation.frameClass} card-face--${size} ${
        isInteractiveCard ? "card-face--interactive" : ""
      } ${highlighted ? "card-face--targetable" : ""} ${
        selected ? "card-face--selected" : ""
      } ${muted ? "card-face--muted" : ""}`}
      onMouseEnter={onInspect}
      onFocus={onInspect}
      onClick={isInteractiveCard && !actionDisabled ? onAction : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      role={isInteractiveCard ? "button" : undefined}
      aria-disabled={isInteractiveCard ? actionDisabled : undefined}
    >
      <header className="card-face__header">
        <div className="card-face__type-line">
          <span className="card-face__type-badge">{spell.type}</span>
          {subtitle ? (
            <span className="card-face__subtitle">{subtitle}</span>
          ) : null}
        </div>
        <div className="card-face__title-row">
          <h3>{spell.name}</h3>
          <div className="card-face__cost-pip">
            <span className="card-face__cost-label">Cost</span>
            <strong>{spell.costPower}</strong>
          </div>
        </div>
      </header>

      <div className="card-face__art-frame">
        {!imageFailed ? (
          <img
            src={presentation.artSrc}
            alt={spell.name}
            className="card-face__art-image"
            style={{ objectPosition: presentation.artPosition }}
            onError={() => setFailedSrc(presentation.artSrc)}
          />
        ) : null}
        <div className="card-face__art-overlay" />
        {imageFailed ? (
          <div className="card-face__art-fallback">
            <span className="card-face__sigil">{presentation.sigil}</span>
            <span className="card-face__fallback-label">Art slot ready</span>
          </div>
        ) : null}
        {actionLabel && isInteractiveCard ? (
          <span className="card-face__action-tag">{actionLabel}</span>
        ) : null}
      </div>

      {!isForgeCard ? (
        <div className="card-face__body">
          <p className="card-face__rules">{spell.rulesText}</p>
          {statusChips.length > 0 ? (
            <div className="card-face__chip-row">
              {statusChips.map((chip) => (
                <span key={chip} className="card-face__chip">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          {metaLines.length > 0 ? (
            <div className="card-face__meta">
              {metaLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!isForgeCard && footer ? (
        <footer className="card-face__footer">{footer}</footer>
      ) : null}
    </article>
  );
};
