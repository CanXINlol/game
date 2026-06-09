import type { RouteNode } from '../game/routeMap';
import type { EventGameState, EventGamePhase } from '../game/playCard';
import { localizeGamePhase } from '../game/localization';

export function CombatStatusBar(props: {
  state: EventGameState;
  gameStatus: EventGamePhase;
  floatingProfit: number;
  routeNode: RouteNode | null;
}) {
  return (
    <section className="panel combat-status-bar" aria-label="顶部状态栏">
      <div>
        <span>交易员</span>
        <strong>{props.state.traderName ?? '未选择'}</strong>
      </div>
      <div>
        <span>位置</span>
        <strong>
          第 {props.state.routeMap.currentAct} 幕 · {props.routeNode?.title ?? localizeGamePhase(props.gameStatus)}
        </strong>
      </div>
      <div>
        <span>现金</span>
        <strong>{props.state.cash.toFixed(1)}</strong>
      </div>
      <div>
        <span>浮盈</span>
        <strong>{props.floatingProfit.toFixed(1)}</strong>
      </div>
      <div>
        <span>锁定收益</span>
        <strong>{props.state.lockedProfit.toFixed(1)}</strong>
      </div>
      <div className={props.state.risk >= props.state.maxRisk * 0.75 ? 'danger-stat' : ''}>
        <span>风险</span>
        <strong>
          {props.state.risk.toFixed(1)} / {props.state.maxRisk}
        </strong>
      </div>
    </section>
  );
}
