import { localizeText } from '../game/localization';

export function ToolTriggerToast(props: { messages: string[] }) {
  const messages = props.messages.slice(-3);

  if (messages.length === 0) {
    return null;
  }

  return (
    <section className="tool-toast-stack" aria-label="工具触发">
      {messages.map((message, index) => (
        <div className="tool-toast" key={`${message}-${index}`}>
          {localizeText(message)}
        </div>
      ))}
    </section>
  );
}
