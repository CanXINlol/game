import type { MarketIntent } from '../game/encounters';
import type { MarketPressure } from '../game/marketPressure';
import {
  localizeEncounterIntentType,
  localizeSector,
  localizeText
} from '../game/localization';

export function IntentBanner(props: {
  pressure: MarketPressure;
  intent: MarketIntent;
  damage: number;
}) {
  const hpRatio = Math.max(0, props.pressure.hp / props.pressure.maxHp);

  return (
    <section className="panel intent-banner">
      <div className="section-heading">
        <div>
          <p className="section-label">市场压力</p>
          <h2>{props.pressure.name}</h2>
        </div>
        <span className="status-pill">{props.intent.label}</span>
      </div>
      <div className="hp-bar large" aria-label="市场压力生命">
        <div style={{ width: `${hpRatio * 100}%` }} />
      </div>
      <div className="intent-banner-row">
        <strong>
          {localizeEncounterIntentType(props.intent.type)}：{props.intent.label}
        </strong>
        <span>{localizeText(props.intent.description)}</span>
      </div>
      <dl className="compact-stats">
        <div>
          <dt>生命</dt>
          <dd>
            {props.pressure.hp.toFixed(1)} / {props.pressure.maxHp}
          </dd>
        </div>
        <div>
          <dt>护盾</dt>
          <dd>{props.pressure.shield.toFixed(1)}</dd>
        </div>
        <div>
          <dt>弱点</dt>
          <dd>{localizeSector(props.pressure.weaknessSector)}</dd>
        </div>
        <div>
          <dt>抗性</dt>
          <dd>{localizeSector(props.pressure.resistanceSector)}</dd>
        </div>
      </dl>
      {props.damage > 0 ? (
        <div className="pressure-damage-popup compact">
          市场压力 -{props.damage.toFixed(1)}
        </div>
      ) : null}
    </section>
  );
}
