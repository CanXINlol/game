import type { RewardOption } from '../game/rewards';

export function RewardPanel(props: {
  phase: 'reward' | 'postReward';
  choices: RewardOption[];
  onSelectReward: (rewardId: string) => void;
  onContinueTrading: () => void;
  onEndDay: () => void;
}) {
  if (props.phase === 'postReward') {
    return (
      <section className="panel reward-panel">
        <p className="section-label">Reward</p>
        <h2>奖励已领取</h2>
        <p className="muted">进入日终贪婪选择，决定落袋、持有、加杠杆，还是继续交易。</p>
        <div className="reward-action-row">
          <button className="primary-action" type="button" onClick={props.onEndDay}>
            进入贪婪选择
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel reward-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">Reward</p>
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
            <span>{describeRewardKind(reward.kind)}</span>
            <p>{reward.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function describeRewardKind(kind: RewardOption['kind']) {
  const labels: Record<RewardOption['kind'], string> = {
    ADD_CARD: '新牌',
    UPGRADE_CARD: '升级',
    ADD_TOOL: '工具',
    REMOVE_CARD: '删牌',
    REDUCE_RISK: '风控',
    LOCK_PROFIT: '止盈',
    INITIAL_COMBO: '连击'
  };

  return labels[kind];
}
