import { localizeText } from '../game/localization';

export function CompactToolTriggerToast(props: { messages: string[] }) {
  const message = props.messages.at(-1);

  if (!message) {
    return null;
  }

  return (
    <div className="compact-tool-toast" aria-label="工具触发提示">
      {localizeText(shortenToolMessage(message))}
    </div>
  );
}

function shortenToolMessage(message: string) {
  return message
    .replace(' 被触发。', '：已触发')
    .replace('获得 ', '收益 +')
    .replace('combo', '连锁');
}
