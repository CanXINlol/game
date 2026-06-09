import type { GameStatus } from '../store/gameStore';

export function RunStatusPanel(props: {
  gameStatus: GameStatus;
  floatingProfit: number;
  lockedProfit: number;
  risk: number;
  maxRisk: number;
  ap: number;
  maxAp: number;
}) {
  return (
    <section className="panel run-status-panel">
      <p className="section-label">RunStatus</p>
      <dl className="status-bar event-status-bar">
        <div>
          <dt>Status</dt>
          <dd>{formatStatus(props.gameStatus)}</dd>
        </div>
        <div>
          <dt>AP</dt>
          <dd>
            {props.ap} / {props.maxAp}
          </dd>
        </div>
        <div>
          <dt>FloatingProfit</dt>
          <dd>{props.floatingProfit.toFixed(1)}</dd>
        </div>
        <div>
          <dt>LockedProfit</dt>
          <dd>{props.lockedProfit.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Risk / MaxRisk</dt>
          <dd>
            {props.risk.toFixed(1)} / {props.maxRisk}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function formatStatus(status: GameStatus) {
  const labels: Record<GameStatus, string> = {
    start: '等待开局',
    playing: '连续打牌中',
    dayEnd: '交易结束',
    reward: '选择奖励',
    postReward: '奖励已领取，等待下一步',
    bankrupt: '爆仓'
  };

  return labels[status];
}
