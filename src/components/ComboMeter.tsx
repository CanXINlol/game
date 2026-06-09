import type { ComboState } from '../game/events';

export function ComboMeter(props: { combo: ComboState }) {
  return (
    <section className="panel combo-meter">
      <p className="section-label">Combo</p>
      <div className="combo-number">{props.combo.comboCount}</div>
      <dl className="compact-stats">
        <div>
          <dt>Multiplier</dt>
          <dd>x{props.combo.comboMultiplier.toFixed(2)}</dd>
        </div>
        <div>
          <dt>ChainDepth</dt>
          <dd>{props.combo.chainDepth}</dd>
        </div>
        <div>
          <dt>Today High</dt>
          <dd>{props.combo.highestComboToday}</dd>
        </div>
        <div>
          <dt>Run High</dt>
          <dd>{props.combo.highestComboThisRun}</dd>
        </div>
      </dl>
    </section>
  );
}
