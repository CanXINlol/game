import type { RewardOption } from '../game/rewards';
import { localizeCardRole, localizeRewardType, localizeText } from '../game/localization';

export function RewardPanel(props: {
  choices: RewardOption[];
  onSelectReward: (rewardId: string) => void;
  onSkipReward: () => void;
}) {
  return (
    <section className="panel reward-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">奖励</p>
          <h2>市场压力已击穿，选择 1 个奖励</h2>
        </div>
        <span className="status-pill">{props.choices.length} 选 1</span>
      </div>
      <div className="reward-grid">
        {props.choices.map((reward) => (
          <button
            key={reward.id}
            className="reward-card"
            type="button"
            data-reward-id={reward.id}
            onClick={() => props.onSelectReward(reward.id)}
          >
            <strong>{reward.title}</strong>
            <span>
              {reward.cardRole && reward.cardArchetype
                ? `${localizeCardRole(reward.cardRole)} · ${reward.cardArchetype}`
                : localizeRewardType(reward.kind)}
            </span>
            <p>{localizeText(reward.description)}</p>
          </button>
        ))}
      </div>
      <button
        className="ghost-button reward-skip-button"
        type="button"
        onClick={props.onSkipReward}
      >
        跳过奖励：保持牌组纯度，获得小额止盈或降低风险
      </button>
    </section>
  );
}
