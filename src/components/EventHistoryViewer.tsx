import { localizeText } from '../game/localization';
import { ViewOverlay } from './ViewOverlay';

export function EventHistoryViewer(props: {
  open: boolean;
  eventLog: string[];
  runHistory: string[];
  onClose: () => void;
}) {
  const events = props.eventLog.slice().reverse();
  const history = props.runHistory.slice().reverse();

  return (
    <ViewOverlay
      open={props.open}
      title="事件历史"
      hint="快捷键 H。这里保留完整事件日志和路线历史。"
      onClose={props.onClose}
    >
      <div className="history-columns">
        <section>
          <h3>事件日志</h3>
          <ol className="viewer-log-list">
            {events.map((message, index) => (
              <li key={`${message}-${index}`}>{localizeText(message)}</li>
            ))}
          </ol>
        </section>
        <section>
          <h3>本局历史</h3>
          <ol className="viewer-log-list">
            {history.map((message, index) => (
              <li key={`${message}-${index}`}>{localizeText(message)}</li>
            ))}
          </ol>
        </section>
      </div>
    </ViewOverlay>
  );
}
