import type { ConsumableInsurance } from '../game/playCard';
import { localizeText } from '../game/localization';
import { ViewOverlay } from './ViewOverlay';

export function InsuranceViewer(props: {
  open: boolean;
  insurance: ConsumableInsurance[];
  onClose: () => void;
}) {
  return (
    <ViewOverlay
      open={props.open}
      title="保险查看器"
      hint="快捷键 I。保险是一次性消耗品。"
      onClose={props.onClose}
    >
      <div className="viewer-card-grid">
        {props.insurance.map((item) => (
          <article key={item.id} className="viewer-card">
            <strong>{item.name}</strong>
            <p>{localizeText(item.description)}</p>
          </article>
        ))}
        {props.insurance.length === 0 ? <p className="viewer-empty">当前没有保险。</p> : null}
      </div>
    </ViewOverlay>
  );
}
