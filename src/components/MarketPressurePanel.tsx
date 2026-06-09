import type { MarketPressure } from '../game/marketPressure';
import { localizeSector } from '../game/localization';

export function MarketPressurePanel(props: { pressure: MarketPressure }) {
  const hpRatio = Math.max(0, props.pressure.hp / props.pressure.maxHp);

  return (
    <section className="panel market-pressure-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">市场压力</p>
          <h2>{props.pressure.name}</h2>
        </div>
        <span className="status-pill">{props.pressure.intent.label}</span>
      </div>
      <p className="muted">{props.pressure.description}</p>
      <div className="hp-bar" aria-label="市场压力生命">
        <div style={{ width: `${hpRatio * 100}%` }} />
      </div>
      <dl className="compact-stats">
        <div>
          <dt>生命 / 最大生命</dt>
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
    </section>
  );
}
