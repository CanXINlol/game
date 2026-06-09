export function EventLogPanel(props: { eventLog: string[] }) {
  const recentEvents = props.eventLog.slice(-10).reverse();

  return (
    <section className="panel event-log-panel">
      <p className="section-label">EventLog</p>
      <h2>最近 10 条事件</h2>
      <ol className="event-log-list">
        {recentEvents.length === 0 ? (
          <li>还没有事件。打出一张牌，让市场动起来。</li>
        ) : (
          recentEvents.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)
        )}
      </ol>
    </section>
  );
}
