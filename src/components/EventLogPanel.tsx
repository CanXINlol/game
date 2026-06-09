import { getKeyEventLog } from '../game/feedback';
import { localizeText } from '../game/localization';

export function EventLogPanel(props: { eventLog: string[] }) {
  const recentEvents = getKeyEventLog(props.eventLog).reverse();

  return (
    <section className="panel event-log-panel">
      <p className="section-label">事件日志</p>
      <h2>最近 5 条关键事件</h2>
      <ol className="event-log-list">
        {recentEvents.length === 0 ? (
          <li>还没有事件。打出一张牌，让市场动起来。</li>
        ) : (
          recentEvents.map((event, index) => (
            <li key={`${event}-${index}`}>{localizeText(event)}</li>
          ))
        )}
      </ol>
    </section>
  );
}
