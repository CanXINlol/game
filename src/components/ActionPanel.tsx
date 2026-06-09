import type { GameStatus } from '../store/gameStore';

export function ActionPanel(props: {
  gameStatus: GameStatus;
  onStart: () => void;
  onRestart: () => void;
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

  if (props.gameStatus === 'reward') {
    return (
      <section className="panel action-panel result-panel">
        <p className="section-label">Reward</p>
        <h2>市场压力已击穿 / 奖励掉落</h2>
        <p className="muted">最小闭环已完成：打牌、触发、连锁、击穿。</p>
        <button className="primary-action" type="button" onClick={props.onRestart}>
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
