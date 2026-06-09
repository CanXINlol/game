import { getKeyEventLog } from '../game/feedback';
import { localizeText } from '../game/localization';

export function CollapsibleEventLog(props: { eventLog: string[] }) {
  const keyEvents = getKeyEventLog(props.eventLog).slice(-3).reverse();
  const fullEvents = props.eventLog.slice(-20).reverse();

  return (
    <section className="panel event-log-panel compact">
      <p className="section-label">关键事件</p>
      <ol className="event-log-list">
        {keyEvents.length === 0 ? (
          <li>暂无关键事件。</li>
        ) : (
          keyEvents.map((event, index) => (
            <li key={`${event}-${index}`}>{localizeText(event)}</li>
          ))
        )}
      </ol>
      <details className="collapsible-log">
        <summary>查看详细日志</summary>
        <ol className="event-log-list detailed">
          {fullEvents.map((event, index) => (
            <li key={`${event}-full-${index}`}>{localizeText(event)}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}
