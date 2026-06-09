import type { MarketIntent } from '../game/encounters';
import {
  localizeEncounterIntentType,
  localizeSector,
  localizeText
} from '../game/localization';

export function MarketIntentPanel(props: {
  intent: MarketIntent;
  canResolveIntent: boolean;
  intentResolvedThisTurn: boolean;
}) {
  return (
    <section className="panel market-intent-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">公开意图</p>
          <h2>{props.intent.label}</h2>
        </div>
        <span className="status-pill">
          {props.intentResolvedThisTurn
            ? '本回合已结算'
            : props.canResolveIntent
              ? '等待结算'
              : '提前公开'}
        </span>
      </div>
      <p>{localizeText(props.intent.description)}</p>
      <dl className="compact-stats">
        <div>
          <dt>类型</dt>
          <dd>{localizeEncounterIntentType(props.intent.type)}</dd>
        </div>
        {props.intent.value !== undefined ? (
          <div>
            <dt>数值</dt>
            <dd>{props.intent.value}</dd>
          </div>
        ) : null}
        {props.intent.sector ? (
          <div>
            <dt>板块</dt>
            <dd>{localizeSector(props.intent.sector)}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
