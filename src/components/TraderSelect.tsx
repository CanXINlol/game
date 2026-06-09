import { TRADERS } from '../data/traders';

export function TraderSelect(props: { onSelectTrader: (traderId: string) => void }) {
  return (
    <section className="trader-select-panel">
      <div className="trader-select-header">
        <p className="eyebrow">《涨停之前》</p>
        <h1>选择交易员</h1>
        <p className="muted">每位交易员会改变起始牌组、现金、工具和本局打法倾向。</p>
      </div>

      <div className="trader-grid">
        {TRADERS.map((trader) => (
          <button
            className="trader-card"
            type="button"
            key={trader.id}
            onClick={() => props.onSelectTrader(trader.id)}
          >
            <span className="trader-card-topline">
              <strong>{trader.name}</strong>
              <em>{trader.difficulty}</em>
            </span>
            <span className="trader-title">{trader.title}</span>
            <span className="trader-description">{trader.description}</span>
            <span className="trader-stats">
              现金 {trader.startingCash} · 起始牌组 {trader.startingDeckIds.length} 张 ·
              初始工具 {trader.startingToolIds.length} 个
            </span>
            <span className="trader-rule">{trader.passive}</span>
            <span className="trader-rule">{trader.riskRule}</span>
            <span className="trader-reward">奖励倾向：{trader.rewardBias}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
