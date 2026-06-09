import type { GameStatus } from '../store/gameStore';
import { localizeGamePhase } from '../game/localization';

export function RunStatusPanel(props: {
  gameStatus: GameStatus;
  day: number;
  floatingProfit: number;
  lockedProfit: number;
  cash: number;
  bossInsuranceStatus: string;
  act: number;
  routeNodeCount: number;
  profitMultiplier: number;
  risk: number;
  maxRisk: number;
  ap: number;
  maxAp: number;
}) {
  return (
    <section className="panel run-status-panel">
      <p className="section-label">局内状态</p>
      <dl className="status-bar event-status-bar">
        <div>
          <dt>阶段</dt>
          <dd>{formatStatus(props.gameStatus)}</dd>
        </div>
        <div>
          <dt>交易日</dt>
          <dd>{props.day}</dd>
        </div>
        <div>
          <dt>幕 / 进度</dt>
          <dd>
            第 {props.act} 幕 / 已过 {props.routeNodeCount} 节点
          </dd>
        </div>
        <div>
          <dt>现金</dt>
          <dd>{props.cash.toFixed(1)}</dd>
        </div>
        <div>
          <dt>首领保险</dt>
          <dd>{props.bossInsuranceStatus}</dd>
        </div>
        <div>
          <dt>行动点</dt>
          <dd>
            {props.ap} / {props.maxAp}
          </dd>
        </div>
        <div>
          <dt>浮盈</dt>
          <dd>{props.floatingProfit.toFixed(1)}</dd>
        </div>
        <div>
          <dt>锁定收益</dt>
          <dd>{props.lockedProfit.toFixed(1)}</dd>
        </div>
        <div>
          <dt>收益倍率</dt>
          <dd>x{props.profitMultiplier.toFixed(2)}</dd>
        </div>
        <div>
          <dt>风险 / 最大风险</dt>
          <dd>
            {props.risk.toFixed(1)} / {props.maxRisk}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function formatStatus(status: GameStatus) {
  return localizeGamePhase(status);
}
