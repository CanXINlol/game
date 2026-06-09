import type { MarketIntent } from '../game/encounters';

export function MarketIntentPanel(props: { intent: MarketIntent }) {
  return (
    <section className="panel market-intent-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">Intent</p>
          <h2>{props.intent.label}</h2>
        </div>
        <span className="status-pill">{props.intent.type}</span>
      </div>
      <p>{props.intent.description}</p>
      <dl className="compact-stats">
        {props.intent.value !== undefined ? (
          <div>
            <dt>Value</dt>
            <dd>{props.intent.value}</dd>
          </div>
        ) : null}
        {props.intent.sector ? (
          <div>
            <dt>Sector</dt>
            <dd>{props.intent.sector}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
