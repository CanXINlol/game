import { useState } from 'react';
import { TRADERS } from './data/traders';
import { INSURANCES } from './data/insurance';
import { STOCK_CARD_BY_ID } from './data/stockCards';
import { getNodesForAct } from './data/routeNodes';
import {
  CARD_ARCHETYPE_LABELS,
  CARD_RARITY_LABELS,
  CARD_ROLE_LABELS,
  RUN_STATUS_LABELS
} from './game/localization';
import type { RouteNode, TradeCard } from './game/types';
import { useGameStore } from './store/gameStore';
import './styles/app.css';

export default function App() {
  const store = useGameStore();
  const run = store.run;
  const [detailCard, setDetailCard] = useState<TradeCard | null>(null);

  if (!run) {
    return (
      <main className="app-shell terminal-shell start-screen">
        <section className="panel trader-select-panel">
          <p className="eyebrow">《涨停之前》</p>
          <h1>选择交易员，开始暴富终端</h1>
          <div className="trader-grid">
            {TRADERS.map((trader) => (
              <button key={trader.id} type="button" className="trader-card" onClick={() => store.startNewRun(trader.id)}>
                <strong>{trader.name}</strong>
                <span>{trader.title}</span>
                <p>{playerText(trader.description)}</p>
                <small>{playerText(trader.passive)}</small>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (run.status === 'RUN_WON') {
    return (
      <main className="app-shell terminal-shell start-screen">
        <section className="panel result-panel">
          <h1>通关</h1>
          <p>你拿下了最后一根阳线。峰值浮盈 {run.telemetry.peakFloatingProfit}。</p>
          <button type="button" className="primary-action" onClick={() => store.startNewRun(run.trader.id)}>再来一局</button>
        </section>
      </main>
    );
  }

  if (run.status === 'RUN_LOST') {
    return (
      <main className="app-shell terminal-shell start-screen">
        <section className="panel result-panel danger-panel">
          <h1>爆仓</h1>
          <p>{playerText(run.telemetry.bankruptcyReason ?? '风险触顶，浮盈归零。')}</p>
          <p>本次爆仓优先损失未锁定浮盈；最后一次选择会记录在失败原因里。</p>
          <button type="button" className="primary-action" onClick={() => store.startNewRun(run.trader.id)}>重新开局</button>
        </section>
      </main>
    );
  }

  if (run.status === 'ROUTE_SELECT') {
    const actNodes = getNodesForAct(run.routeMap.nodes, run.routeMap.act);
    return (
      <main className="app-shell terminal-shell">
        <header className="terminal-header">
          <div>
            <p className="eyebrow">第 {run.routeMap.act} 幕 · 路线选择</p>
            <h1>暴富终端</h1>
          </div>
          <StatCard label="现金" value={run.cash} compact />
        </header>
        <section className="panel route-map-panel">
          <p className="section-label">分支路线图</p>
          <h2>从底部向上选择相连节点</h2>
          <RouteMapView
            nodes={actNodes}
            availableNodeIds={run.routeMap.availableNodeIds}
            completedNodeIds={run.routeMap.completedNodeIds}
            onSelect={store.selectRouteNode}
          />
        </section>
      </main>
    );
  }

  if (run.status === 'SHOP') {
    return (
      <ShopScreen
        run={run}
        onBuy={(id, cardId) => store.buyShopItem(id, cardId)}
        onLeave={() => store.leaveNode()}
        onDetail={setDetailCard}
      />
    );
  }

  if (run.status === 'REST') {
    return (
      <main className="app-shell terminal-shell">
        <section className="panel">
          <h2>休整点</h2>
          <div className="greed-grid">
            <button type="button" onClick={() => { store.applyRestChoice('UPGRADE', run.deck[0]); store.leaveNode(); }}>升级一张牌</button>
            <button type="button" onClick={() => { store.applyRestChoice('REDUCE_RISK'); store.leaveNode(); }}>风险 -15</button>
            <button type="button" onClick={() => { store.applyRestChoice('BONUS_AP'); store.leaveNode(); }}>下场 AP +1，风险 +10</button>
          </div>
        </section>
      </main>
    );
  }

  if (run.status === 'RISK_CONTROL') {
    return (
      <main className="app-shell terminal-shell">
        <section className="panel">
          <h2>风控室</h2>
          <div className="greed-grid">
            <button type="button" onClick={() => { store.applyRiskControlChoice('REDUCE_RISK'); store.leaveNode(); }}>风险 -25</button>
            <button type="button" onClick={() => { store.applyRiskControlChoice('REMOVE_CARD', run.deck[0]); store.leaveNode(); }}>支付 80 删牌</button>
            <button type="button" onClick={() => { store.applyRiskControlChoice('LOCK_PROFIT'); store.leaveNode(); }}>锁定 30% 浮盈</button>
            <button type="button" onClick={() => { store.applyRiskControlChoice('BUY_INSURANCE', undefined, INSURANCES[0].id); store.leaveNode(); }}>购买折扣保险</button>
          </div>
        </section>
      </main>
    );
  }

  if (run.status === 'EVENT' && run.currentEvent) {
    return (
      <main className="app-shell terminal-shell">
        <section className="panel">
          <h2>{run.currentEvent.title}</h2>
          <p>{playerText(run.currentEvent.description)}</p>
          <div className="greed-grid">
            {run.currentEvent.choices.map((choice) => (
              <button key={choice.id} type="button" onClick={() => { store.applyEventChoice(choice.id); store.leaveNode(); }}>
                <strong>{choice.label}</strong>
                <span>{playerText(choice.description)}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (run.status === 'REWARD') {
    return (
      <main className="app-shell terminal-shell start-screen">
        <section className="panel greed-panel">
          <h2>行情结束</h2>
          <p>获得奖励，选择下一路线。</p>
          <button type="button" className="primary-action" onClick={() => store.completeRouteNode()}>继续选路</button>
        </section>
      </main>
    );
  }

  const encounter = run.currentEncounter;
  if (!encounter) return null;

  const preview = run.tradeChain.previewResult;
  const progress = Math.min(100, Math.round((encounter.floatingProfit / encounter.targetProfit) * 100));
  const selectedCards = run.tradeChain.selectedCardIds.map((id) => STOCK_CARD_BY_ID[id]);
  const canExecute = Boolean(
    run.status === 'PLAYER_TURN' &&
      run.tradeChain.selectedCardIds.length > 0 &&
      run.tradeChain.totalCost <= run.ap
  );

  return (
    <main className="app-shell terminal-shell">
      <header className="terminal-header">
        <div>
          <p className="eyebrow">《涨停之前》· 第 {run.act} 幕</p>
          <h1>暴富终端</h1>
        </div>
        <button type="button" className="ghost-button" onClick={() => store.startNewRun(run.trader.id)}>新局</button>
      </header>

      <section className="resource-bar">
        <StatCard label="现金" value={run.cash} />
        <StatCard label="浮盈" value={encounter.floatingProfit} highlight />
        <StatCard label="已锁定" value={encounter.lockedProfit} />
        <StatCard label="风险" value={`${encounter.risk}/${encounter.maxRisk}`} danger={encounter.risk >= 70} />
      </section>

      {encounter.boss ? (
        <section className="panel boss-phase-panel">
          <p className="section-label">Boss 阶段</p>
          <strong>{encounter.marketIntent.title}</strong>
          <p>{encounter.marketIntent.description}</p>
          <div className="profit-bar"><div style={{ width: `${encounter.boss.hp}%` }} /></div>
        </section>
      ) : null}

      <section className="terminal-grid">
        <aside className="panel side-panel">
          <StatCard label="AP" value={`${run.ap}/${run.maxAP}`} compact />
          <StatCard label="抽牌堆" value={run.drawPile.length} compact />
          <StatCard label="弃牌堆" value={run.discardPile.length} compact />
          <StatCard label="当前状态" value={RUN_STATUS_LABELS[run.status]} compact />
          <StatCard label="工具" value={run.tools.length} compact />
        </aside>

        <section className="center-stack">
          <MarketPanel
            name={encounter.name}
            intentTitle={encounter.marketIntent.title}
            intentDescription={playerText(encounter.marketIntent.description)}
            floatingProfit={encounter.floatingProfit}
            targetProfit={encounter.targetProfit + encounter.targetProfitBonus}
            progress={progress}
            turnCount={encounter.turnCount}
          />

          {run.status === 'GREED_CHOICE' ? (
            <section className="panel greed-panel" data-testid="greed-choice">
              <h2>目标已达成 — 现在可以走，也可以继续贪</h2>
              <p className="risk-copy">当前冒险金额：{encounter.floatingProfit} 浮盈</p>
              <div className="greed-grid">
                <button type="button" onClick={() => store.chooseGreed('TAKE_PROFIT')}>
                  止盈离场：获得 {Math.floor(encounter.floatingProfit * 0.7)} 现金，风险 -15。
                </button>
                <button type="button" onClick={() => store.chooseGreed('HOLD')}>
                  继续持有：奖励倍率 +50%，风险 +15。你正在拿 {encounter.floatingProfit} 浮盈冒险。
                </button>
                <button type="button" onClick={() => store.chooseGreed('LEVERAGE')}>
                  加杠杆：下回合收益 x2，风险 +30。爆仓将损失 {encounter.floatingProfit} 浮盈。
                </button>
              </div>
            </section>
          ) : null}

          <ChainPanel
            run={run}
            selectedCards={selectedCards}
            canExecute={canExecute}
            onRemove={store.removeCardFromChain}
            onExecute={() => store.executeChain()}
            onEndTurn={() => store.endTurn()}
          />

          <section className="panel hand-panel">
            <h2>手牌区</h2>
            <div className="hand-grid">
              {run.hand.map((cardId, index) => (
                <TradeCardButton
                  key={`${cardId}-${index}`}
                  card={STOCK_CARD_BY_ID[cardId]}
                  disabled={run.status !== 'PLAYER_TURN' || run.tradeChain.selectedCardIds.length >= 3}
                  onAdd={() => store.addCardToChain(cardId)}
                  onDetail={() => setDetailCard(STOCK_CARD_BY_ID[cardId])}
                />
              ))}
            </div>
          </section>
        </section>

        <aside className="panel preview-panel">
          <p className="section-label">交易链预览</p>
          {preview ? (
            <>
              <PreviewLine label="预计浮盈" value={formatDelta(preview.floatingProfitDelta)} />
              <PreviewLine label="预计风险" value={formatDelta(preview.riskDelta)} />
              <PreviewLine label="目标线" value={preview.reachedTarget ? '会达到' : '未达到'} />
              <ol className="step-list">
                {preview.steps.map((step) => (
                  <li key={step.cardId}>
                    <strong>{playerText(step.cardName)}</strong>
                    <span>基础 {step.baseFloatingProfit}，倍率 x{formatMultiplier(step.multiplier)}，风险 {formatDelta(step.riskDelta)}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="muted">把手牌放进交易链后预览结果。</p>
          )}
          <div className="summary-box">
            {run.turnSummary.map((line) => <p key={line}>{playerText(line)}</p>)}
          </div>
        </aside>
      </section>

      {detailCard ? <CardDetail card={detailCard} onClose={() => setDetailCard(null)} /> : null}
    </main>
  );
}

function ShopScreen(props: {
  run: import('./game/types').Run;
  onBuy: (id: string, cardId?: string) => void;
  onLeave: () => void;
  onDetail: (card: TradeCard) => void;
}) {
  const sections = ['cards', 'tools', 'insurance', 'services'] as const;
  return (
    <main className="app-shell terminal-shell">
      <header className="terminal-header">
        <h1>地下交易所</h1>
        <StatCard label="现金" value={props.run.cash} compact />
      </header>
      {sections.map((section) => (
        <section key={section} className="panel shop-section">
          <h2>{section === 'cards' ? '卡牌区' : section === 'tools' ? '工具区' : section === 'insurance' ? '保险区' : '服务区'}</h2>
          <div className="hand-grid">
            {props.run.shop.items.filter((i) => i.section === section).map((item) => (
              <button key={item.id} type="button" className="shop-card" disabled={item.sold || props.run.cash < item.price} onClick={() => props.onBuy(item.id, props.run.deck[0])}>
                <strong>{playerText(item.name)}</strong>
                <span>{item.price} 现金</span>
                <p>{playerText(item.description)}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="primary-action" onClick={props.onLeave}>离开商店</button>
    </main>
  );
}

function RouteMapView(props: {
  nodes: RouteNode[];
  availableNodeIds: string[];
  completedNodeIds: string[];
  onSelect: (nodeId: string) => void;
}) {
  const nodeById = new Map(props.nodes.map((node) => [node.id, node]));

  return (
    <div className="route-map-canvas">
      <svg className="route-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {props.nodes.flatMap((node) =>
          node.nextNodeIds
            .map((id) => nodeById.get(id))
            .filter((target): target is RouteNode => Boolean(target))
            .map((target) => (
              <line
                key={`${node.id}-${target.id}`}
                className={
                  props.completedNodeIds.includes(node.id) ||
                  props.availableNodeIds.includes(target.id)
                    ? 'route-edge active'
                    : 'route-edge'
                }
                x1={node.x}
                y1={100 - node.y}
                x2={target.x}
                y2={100 - target.y}
              />
            ))
        )}
      </svg>
      {props.nodes.map((node) => {
        const available = props.availableNodeIds.includes(node.id);
        const completed = props.completedNodeIds.includes(node.id);
        return (
          <button
            key={node.id}
            type="button"
            className={[
              'route-node',
              `route-node-type-${node.type.toLowerCase()}`,
              available ? 'route-node-available' : '',
              completed ? 'route-node-completed' : ''
            ].filter(Boolean).join(' ')}
            style={{ left: `${node.x}%`, bottom: `${node.y}%` }}
            disabled={!available}
            onClick={() => props.onSelect(node.id)}
          >
            <strong>{completed ? '✓ ' : ''}{node.name}</strong>
            <span>{getRouteTypeLabel(node.type)} · {getRiskLabel(node.riskLevel)}</span>
            <small>{node.rewardSummary}</small>
            <em>{node.greedHint}</em>
          </button>
        );
      })}
    </div>
  );
}

function ChainPanel(props: {
  run: import('./game/types').Run;
  selectedCards: TradeCard[];
  canExecute: boolean;
  onRemove: (i: number) => void;
  onExecute: () => void;
  onEndTurn: () => void;
}) {
  return (
    <section className="panel chain-panel">
      <div className="chain-slots">
        {Array.from({ length: 3 }, (_, index) => {
          const card = props.selectedCards[index];
          return (
            <button key={index} type="button" className={card ? 'chain-slot filled' : 'chain-slot'} onClick={() => card && props.onRemove(index)} disabled={!card}>
              {card ? <strong>{playerText(card.name)}</strong> : <span>空槽位</span>}
            </button>
          );
        })}
      </div>
      <div className="action-row">
        <button type="button" className="primary-action" disabled={!props.canExecute} onClick={props.onExecute}>执行交易链</button>
        <button type="button" className="ghost-button" disabled={props.run.status !== 'PLAYER_TURN'} onClick={props.onEndTurn}>结束回合</button>
      </div>
    </section>
  );
}

function StatCard(props: { label: string; value: string | number; highlight?: boolean; danger?: boolean; compact?: boolean }) {
  const className = ['stat-card', props.highlight ? 'highlight' : '', props.danger ? 'danger' : '', props.compact ? 'compact' : ''].filter(Boolean).join(' ');
  return <div className={className}><span>{props.label}</span><strong>{props.value}</strong></div>;
}

function MarketPanel(props: { name: string; intentTitle: string; intentDescription: string; floatingProfit: number; targetProfit: number; progress: number; turnCount: number }) {
  return (
    <section className="panel market-panel">
      <h2>{props.name}</h2>
      <div className="profit-readout"><strong>{props.floatingProfit}</strong><span>/ {props.targetProfit} 目标浮盈</span></div>
      <div className="profit-bar"><div style={{ width: `${props.progress}%` }} /></div>
      <div className="intent-box"><strong>{props.intentTitle}</strong><p>{props.intentDescription}</p></div>
      <span className="cost-pill">第 {props.turnCount} 回合</span>
    </section>
  );
}

function TradeCardButton(props: { card: TradeCard; disabled: boolean; onAdd: () => void; onDetail: () => void }) {
  return (
    <article className="trade-card" title={playerText(props.card.shortText)}>
      <button type="button" className="detail-button" onClick={props.onDetail}>详情</button>
      <button type="button" className="trade-card-main" onClick={props.onAdd} disabled={props.disabled}>
        <strong>{playerText(props.card.name)}</strong>
        <p>{playerText(props.card.shortText)}</p>
        <small>{CARD_ARCHETYPE_LABELS[props.card.archetype]} / 费用 {props.card.cost}</small>
      </button>
    </article>
  );
}

function CardDetail(props: { card: TradeCard; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <article className="panel card-detail-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{playerText(props.card.name)}</h2>
        <div className="detail-meta">
          <span>{CARD_RARITY_LABELS[props.card.rarity]}</span>
          <span>{CARD_ROLE_LABELS[props.card.role]}</span>
        </div>
        {props.card.detailText.split('\n').map((line) => <p key={line}>{playerText(line)}</p>)}
        <button type="button" onClick={props.onClose}>关闭</button>
      </article>
    </div>
  );
}

function PreviewLine(props: { label: string; value: string }) {
  return <div className="preview-stats"><span>{props.label}</span><strong>{props.value}</strong></div>;
}

function formatDelta(value: number) { return value >= 0 ? `+${value}` : `${value}`; }
function formatMultiplier(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function playerText(text: string) {
  return text
    .replaceAll('floatingProfit', '浮盈')
    .replaceAll('cash', '现金')
    .replaceAll('Risk', '风险')
    .replaceAll('Cost', '费用');
}
function getRiskLabel(level: RouteNode['riskLevel']) {
  if (level === 'LOW') return '低风险';
  if (level === 'MEDIUM') return '中风险';
  return '高风险';
}
function getRouteTypeLabel(type: RouteNode['type']) {
  if (type === 'NORMAL') return '普通行情';
  if (type === 'ELITE') return '高危行情';
  if (type === 'SHOP') return '商店';
  if (type === 'RISK_CONTROL') return '风控室';
  if (type === 'REST') return '休整点';
  if (type === 'EVENT') return '事件';
  return 'Boss';
}




