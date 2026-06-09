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
        <p className="section-label">行动</p>
        <h2>《涨停之前》</h2>
        <p className="muted">虚构股市连续 combo 卡牌游戏。</p>
        <button className="primary-action" type="button" onClick={props.onStart}>
          开始一局
        </button>
      </section>
    );
  }

  if (props.gameStatus === 'REWARD') {
    return (
      <section className="panel action-panel result-panel">
        <p className="section-label">奖励</p>
        <h2>奖励阶段</h2>
        <p className="muted">请在主区域选择或跳过奖励，然后进入日终选择。</p>
        <button className="ghost-button" type="button" onClick={props.onRestart}>
          重新开始
        </button>
      </section>
    );
  }

  if (props.gameStatus === 'RUN_LOST') {
    return (
      <section className="panel action-panel result-panel danger-panel">
        <p className="section-label">失败</p>
        <h2>风险达到最大风险，爆仓</h2>
        <p className="muted">最后一次选择：{props.lastChoiceLabel ?? '无'}。</p>
        <button className="primary-action" type="button" onClick={props.onRestart}>
          重新开始
        </button>
      </section>
    );
  }

  if (props.gameStatus === 'RUN_WON') {
    return (
      <section className="panel action-panel result-panel">
        <p className="section-label">通关</p>
        <h2>击败第三幕最终 Boss，通关</h2>
        <p className="muted">最后一次选择：{props.lastChoiceLabel ?? '无'}。</p>
        <button className="primary-action" type="button" onClick={props.onRestart}>
          再来一局
        </button>
      </section>
    );
  }

  return (
    <section className="panel action-panel">
      <p className="section-label">行动</p>
      <h2>{getActionTitle(props.gameStatus)}</h2>
      <button className="ghost-button" type="button" onClick={props.onRestart}>
        重新开始
      </button>
    </section>
  );
}

function getActionTitle(status: GameStatus) {
  if (status === 'PLAYER_TURN') {
    return '玩家回合：点击手牌打出';
  }

  if (status === 'ROUTE_SELECT') {
    return '路线选择：选择一个可达节点';
  }

  if (status === 'ENEMY_INTENT') {
    return '敌方意图：只能结算一次';
  }

  if (status === 'SHOP') {
    return '商店节点：使用现金规划构筑';
  }

  if (status === 'REST') {
    return '休整节点：升级或降低风险';
  }

  if (status === 'DAY_END') {
    return '日终选择';
  }

  return '等待下一步';
}
