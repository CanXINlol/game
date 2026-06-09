import type { ChainSummary } from '../game/feedback';

export function TurnSummaryPanel(props: {
  summary: ChainSummary;
  chainDepth: number;
  turnSummary: string | null;
}) {
  return (
    <section className="panel turn-summary-panel">
      <p className="section-label">本回合摘要</p>
      <dl className="compact-stats">
        <div>
          <dt>收益</dt>
          <dd>+{props.summary.profitGained.toFixed(1)}</dd>
        </div>
        <div>
          <dt>风险</dt>
          <dd>
            +{props.summary.riskGained.toFixed(1)} / -{props.summary.riskReduced.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt>工具</dt>
          <dd>{props.summary.toolTriggers} 次</dd>
        </div>
        <div>
          <dt>击穿伤害</dt>
          <dd>{props.summary.pressureDamage.toFixed(1)}</dd>
        </div>
        <div>
          <dt>连锁层数</dt>
          <dd>{props.chainDepth}</dd>
        </div>
      </dl>
      <p className="muted">连锁收益 +{props.summary.profitGained.toFixed(1)}</p>
      {props.turnSummary ? <p className="turn-summary">{props.turnSummary}</p> : null}
    </section>
  );
}
