import type { MarketPressure } from '../game/marketPressure';
import { localizeSector, localizeText } from '../game/localization';

export function CombatMarketPanel(props: {
  pressure: MarketPressure;
  bossStage?: string | null;
}) {
  const hpRatio = Math.max(0, props.pressure.hp / props.pressure.maxHp);

  return (
    <section className="panel combat-market-panel" aria-label="市场压力">
      <div className="combat-market-heading">
        <div>
          <p className="section-label">市场压力</p>
          <h2>{props.pressure.name}</h2>
        </div>
        {props.bossStage ? <span className="status-pill">{props.bossStage}</span> : null}
      </div>
      <p className="muted">{localizeText(props.pressure.description)}</p>
      <div className="hp-readout">
        <strong>
          {props.pressure.hp.toFixed(1)} / {props.pressure.maxHp}
        </strong>
        <span>护盾 {props.pressure.shield.toFixed(1)}</span>
      </div>
      <div className="hp-bar large" aria-label="市场压力生命">
        <div style={{ width: `${hpRatio * 100}%` }} />
      </div>
      <div className="intent-focus">
        <span>公开意图</span>
        <strong>{localizeText(props.pressure.intent.label)}</strong>
        <p>{localizeText(props.pressure.intent.description)}</p>
      </div>
      <dl className="market-matchup-row">
        <div>
          <dt>弱点</dt>
          <dd>{localizeSector(props.pressure.weaknessSector)}</dd>
        </div>
        <div>
          <dt>抗性</dt>
          <dd>{localizeSector(props.pressure.resistanceSector)}</dd>
        </div>
      </dl>
    </section>
  );
}
