import type { RouteEventDefinition } from '../game/routeEvents';

export function RouteEventPanel(props: {
  event: RouteEventDefinition;
  onChoose: (choiceId: string) => void;
}) {
  return (
    <section className="panel route-event-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">事件</p>
          <h2>{props.event.title}</h2>
        </div>
        <span className="status-pill">选择后结束节点</span>
      </div>
      <p className="route-event-description">{props.event.description}</p>
      <div className="shop-grid">
        {props.event.choices.map((choice) => (
          <button
            key={choice.id}
            className="shop-card"
            type="button"
            disabled={Boolean(choice.disabledReason)}
            onClick={() => props.onChoose(choice.id)}
          >
            <strong>{choice.label}</strong>
            <span>收益：{choice.rewardText}</span>
            <p>代价：{choice.costText}</p>
            <em>{choice.disabledReason ?? '选择后继续路线'}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
