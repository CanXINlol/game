import type { EventCard } from '../game/effects';

export function PlayedCardsPanel(props: { cards: EventCard[] }) {
  return (
    <section className="panel played-cards-panel">
      <p className="section-label">出牌记录</p>
      <h2>已打出的牌</h2>
      <div className="played-card-list">
        {props.cards.length === 0 ? (
          <p className="muted">本轮还没有打出任何牌。</p>
        ) : (
          props.cards.map((card) => (
            <span key={`${card.id}-${props.cards.indexOf(card)}`}>{card.name}</span>
          ))
        )}
      </div>
    </section>
  );
}
