import type { ChainSummary } from '../game/feedback';

export function ChainSummaryPanel(props: { summary: ChainSummary }) {
  const summary = props.summary;

  return (
    <section className="panel chain-summary-panel">
      <p className="section-label">本次连锁</p>
      <div className="compact-stats">
        <div>
          <dt>压力伤害</dt>
          <dd>{summary.pressureDamage.toFixed(1)}</dd>
        </div>
        <div>
          <dt>浮盈</dt>
          <dd>+{summary.profitGained.toFixed(1)}</dd>
        </div>
        <div>
          <dt>风险</dt>
          <dd>
            +{summary.riskGained.toFixed(1)} / -{summary.riskReduced.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt>现金获得</dt>
          <dd>+{summary.cashGained.toFixed(1)}</dd>
        </div>
        <div>
          <dt>现金花费</dt>
          <dd>-{summary.cashSpent.toFixed(1)}</dd>
        </div>
        <div>
          <dt>净现金</dt>
          <dd>
            {summary.netCash > 0 ? '+' : ''}
            {summary.netCash.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt>连击</dt>
          <dd>+{summary.comboGained}</dd>
        </div>
        <div>
          <dt>工具</dt>
          <dd>{summary.toolTriggers} 次</dd>
        </div>
      </div>
    </section>
  );
}
