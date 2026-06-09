export function DeckCounter(props: {
  drawPileCount: number;
  discardPileCount: number;
  handCount: number;
}) {
  return (
    <section className="panel deck-counter">
      <p className="section-label">牌堆</p>
      <dl className="compact-stats">
        <div>
          <dt>手牌</dt>
          <dd>{props.handCount}</dd>
        </div>
        <div>
          <dt>牌库</dt>
          <dd>{props.drawPileCount}</dd>
        </div>
        <div>
          <dt>弃牌堆</dt>
          <dd>{props.discardPileCount}</dd>
        </div>
      </dl>
    </section>
  );
}
