import type { DayChoiceId } from '../store/gameStore';
import type { DayChoicePreview } from '../game/dayChoices';

export function DayChoicePanel(props: {
  floatingProfit: number;
  risk: number;
  maxRisk: number;
  previews: DayChoicePreview[];
  onChoose: (choice: DayChoiceId) => void;
}) {
  return (
    <section className="panel day-choice-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">Day End</p>
          <h2>现在走，还是继续贪？</h2>
        </div>
        <span className="status-pill">
          Risk {props.risk.toFixed(1)} / {props.maxRisk}
        </span>
      </div>
      <p className="loss-warning">
        当前浮盈 {props.floatingProfit.toFixed(1)}。选择前请确认：未锁定浮盈会继续承担下一轮风险。
      </p>
      <div className="choice-grid day-choice-grid">
        {props.previews.map((preview) => (
          <button
            key={preview.id}
            className={`choice-card day-choice-card ${
              preview.id === 'continueTrading' ? 'greedy-choice-card' : ''
            }`}
            type="button"
            data-day-choice-id={preview.id}
            onClick={() => props.onChoose(preview.id)}
          >
            <strong>{preview.title}</strong>
            <span>{preview.profitText}</span>
            <span>{preview.riskText}</span>
            <span>{preview.nextDayText}</span>
            <em>{preview.warningText}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
