import type { ComboState } from '../game/events';

export function ComboMeter(props: { combo: ComboState }) {
  return (
    <section className="panel combo-meter">
      <p className="section-label">连击</p>
      <div className="combo-number">{props.combo.comboCount}</div>
      <dl className="compact-stats">
        <div>
          <dt>倍率</dt>
          <dd>x{props.combo.comboMultiplier.toFixed(2)}</dd>
        </div>
        <div>
          <dt>连锁深度</dt>
          <dd>{props.combo.chainDepth}</dd>
        </div>
        <div>
          <dt>今日最高</dt>
          <dd>{props.combo.highestComboToday}</dd>
        </div>
        <div>
          <dt>本局最高</dt>
          <dd>{props.combo.highestComboThisRun}</dd>
        </div>
      </dl>
    </section>
  );
}
