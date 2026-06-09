import type { ChainSummary } from '../game/feedback';

export function CombatSummaryPanel(props: {
  summary: ChainSummary;
  chainDepth: number;
}) {
  const latestKeyEvent = props.summary.keyEvents.at(-1) ?? '暂无关键触发';

  return (
    <section className="panel combat-summary-panel" aria-label="本回合摘要">
      <p className="section-label">本回合摘要</p>
      <dl>
        <div>
          <dt>收益</dt>
          <dd>+{props.summary.profitGained.toFixed(1)}</dd>
        </div>
        <div>
          <dt>风险变化</dt>
          <dd>
            +{props.summary.riskGained.toFixed(1)} / -{props.summary.riskReduced.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt>压力伤害</dt>
          <dd>{props.summary.pressureDamage.toFixed(1)}</dd>
        </div>
        <div>
          <dt>工具触发</dt>
          <dd>{props.summary.toolTriggers}</dd>
        </div>
        <div>
          <dt>连锁深度</dt>
          <dd>{props.chainDepth}</dd>
        </div>
      </dl>
      <div className="latest-key-trigger">
        <span>最近关键触发</span>
        <strong>{latestKeyEvent}</strong>
      </div>
    </section>
  );
}
