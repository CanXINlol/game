import type { EventGameState } from '../game/playCard';

export type ViewerKind = 'deck' | 'tools' | 'insurance' | 'history';

export function ResourceRail(props: {
  state: EventGameState;
  onOpenViewer: (viewer: ViewerKind) => void;
}) {
  return (
    <section className="panel combat-resource-rail" aria-label="资源栏">
      <p className="section-label">资源</p>
      <dl>
        <div>
          <dt>行动点</dt>
          <dd>
            {props.state.ap} / {props.state.maxAp}
          </dd>
        </div>
        <div>
          <dt>抽牌堆</dt>
          <dd>{props.state.drawPile.length}</dd>
        </div>
        <div>
          <dt>弃牌堆</dt>
          <dd>{props.state.discardPile.length}</dd>
        </div>
        <div>
          <dt>已移除牌</dt>
          <dd>{props.state.removedCards.length}</dd>
        </div>
        <div>
          <dt>工具</dt>
          <dd>{props.state.tools.length}</dd>
        </div>
        <div>
          <dt>保险</dt>
          <dd>{props.state.consumables.length}</dd>
        </div>
      </dl>
      <div className="viewer-button-grid">
        <button type="button" onClick={() => props.onOpenViewer('deck')}>
          牌组 D
        </button>
        <button type="button" onClick={() => props.onOpenViewer('tools')}>
          工具 T
        </button>
        <button type="button" onClick={() => props.onOpenViewer('insurance')}>
          保险 I
        </button>
        <button type="button" onClick={() => props.onOpenViewer('history')}>
          历史 H
        </button>
      </div>
    </section>
  );
}
