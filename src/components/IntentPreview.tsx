import type { MarketIntent } from '../game/encounters';
import { localizeEncounterIntentType, localizeText } from '../game/localization';

export function IntentPreview(props: { intent: MarketIntent }) {
  return (
    <section className="panel intent-preview">
      <p className="section-label">敌方意图</p>
      <h2>{props.intent.label}</h2>
      <p>{localizeEncounterIntentType(props.intent.type)} · {localizeText(props.intent.description)}</p>
    </section>
  );
}
