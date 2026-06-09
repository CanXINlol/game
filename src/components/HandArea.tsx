import type { EventCard } from '../game/effects';

export function HandArea(props: {
  hand: EventCard[];
  canPlay: boolean;
  onPlayCard: (cardId: string) => void;
}) {
  return (
    <section className="panel hand-area">
      <div className="section-heading">
        <div>
          <p className="section-label">Hand</p>
          <h2>当前手牌</h2>
        </div>
        <span className="status-pill">{props.hand.length} 张</span>
      </div>
      <div className="event-card-grid">
        {props.hand.map((card) => (
          <button
            key={card.id}
            data-card-id={card.id}
            className="event-card"
            type="button"
            disabled={!props.canPlay}
            onClick={() => props.onPlayCard(card.id)}
          >
            <strong>{card.name}</strong>
            <span>
              {card.sector} · R{card.rank}
            </span>
            <p>{describeCard(card.id)}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function describeCard(cardId: string) {
  const descriptions: Record<string, string> = {
    'test-card-tech-buy': '获得 20 收益，并触发 TECH 板块。',
    'test-card-limit-chase': '已有收益时触发 LIMIT_UP，获得收益并增加 combo。',
    'test-card-margin-add': '获得 40 收益，但增加 20 Risk。',
    'test-card-quant-copy': '复制上一张牌的基础效果。',
    'test-card-closeout': '根据 comboCount 获得爆发收益，并结束交易。'
  };

  return descriptions[cardId] ?? '测试牌。';
}
