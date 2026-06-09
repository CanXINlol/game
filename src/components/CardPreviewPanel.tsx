import type { CardPreviewInfo } from '../game/preview';

export function CardPreviewPanel(props: { preview: CardPreviewInfo | null }) {
  if (!props.preview) {
    return (
      <aside className="card-preview empty">
        <p>悬停或选择一张牌，查看主要效果。</p>
      </aside>
    );
  }

  const preview = props.preview;

  return (
    <aside className="card-preview">
      <p className="section-label">卡牌预览</p>
      <h3>{preview.cardName}</h3>
      <dl className="compact-stats">
        <div>
          <dt>消耗</dt>
          <dd>{preview.cost}</dd>
        </div>
        <div>
          <dt>角色</dt>
          <dd>{preview.role}</dd>
        </div>
        <div>
          <dt>流派</dt>
          <dd>{preview.archetype}</dd>
        </div>
        <div>
          <dt>收益</dt>
          <dd>+{preview.baseProfit.toFixed(1)}</dd>
        </div>
        <div>
          <dt>风险</dt>
          <dd>+{preview.baseRisk.toFixed(1)}</dd>
        </div>
      </dl>
      <p>主要效果：{preview.mainEffect || preview.possibleEvents.join('、') || '稳定过牌'}</p>
      {preview.timingHint ? <p>更强时机：{preview.timingHint}</p> : null}
      <p>风险/代价：{preview.riskText}</p>
      <p>可能触发：{preview.possibleTools.join('、') || '无'}</p>
      {preview.notes.length > 0 ? <p>{preview.notes.join('；')}</p> : null}
      {!preview.playable ? <em>{preview.reason}</em> : null}
    </aside>
  );
}
