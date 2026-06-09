import type { GameStatus } from '../store/gameStore';

export function ActionPanel(props: {
  gameStatus: GameStatus;
  onStart: () => void;
  onRestart: () => void;
  lastChoiceLabel?: string;
}) {
  if (props.gameStatus === 'start') {
    return (
      <section className="panel action-panel">
        <p className="section-label">Action</p>
        <h2>《涨停之前》</h2>
        <p className="muted">虚构股市连续 combo 卡牌游戏。</p>
        <button className="primary-action" type="button" onClick={props.onStart}>
          开始一局
        </button>
      </section>
    );
  }

  if (props.gameStatus === 'reward' || props.gameStatus === 'postReward') {
    return (
      <section className="panel action-panel result-panel">
        <p className="section-label">Reward</p>
        <h2>奖励阶段</h2>
        <p className="muted">请在主区域选择奖励，然后进入日终贪婪选择。</p>
        <button className="ghost-button" type="button" onClick={props.onRestart}>
          重新开始
        </button>
      </section>
    );
  }

  if (props.gameStatus === 'bankrupt') {
    return (
      <section className="panel action-panel result-panel danger-panel">
        <p className="section-label">Bankrupt</p>
        <h2>Risk 达到 maxRisk，爆仓</h2>
        <p className="muted">最后一次选择：{props.lastChoiceLabel ?? '无'}。</p>
        <button className="primary-action" type="button" onClick={props.onRestart}>
          重新开始
        </button>
      </section>
    );
  }

  return (
    <section className="panel action-panel">
      <p className="section-label">Action</p>
      <h2>{props.gameStatus === 'playing' ? '点击手牌打出' : '交易已结束'}</h2>
      <button className="ghost-button" type="button" onClick={props.onRestart}>
        重新开始
      </button>
    </section>
  );
}
