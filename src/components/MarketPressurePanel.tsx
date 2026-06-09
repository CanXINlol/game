import type { MarketPressure } from '../game/marketPressure';

export function MarketPressurePanel(props: { pressure: MarketPressure }) {
  const hpRatio = Math.max(0, props.pressure.hp / props.pressure.maxHp);

  return (
    <section className="panel market-pressure-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">MarketPressure</p>
          <h2>{props.pressure.name}</h2>
        </div>
        <span className="status-pill">{props.pressure.intent}</span>
      </div>
      <p className="muted">{props.pressure.description}</p>
      <div className="hp-bar" aria-label="MarketPressure HP">
        <div style={{ width: `${hpRatio * 100}%` }} />
      </div>
      <dl className="compact-stats">
        <div>
          <dt>HP / MaxHP</dt>
          <dd>
            {props.pressure.hp.toFixed(1)} / {props.pressure.maxHp}
          </dd>
        </div>
        <div>
          <dt>Shield</dt>
          <dd>{props.pressure.shield.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Weakness</dt>
          <dd>{props.pressure.weaknessSector}</dd>
        </div>
        <div>
          <dt>Resistance</dt>
          <dd>{props.pressure.resistanceSector}</dd>
        </div>
      </dl>
    </section>
  );
}
