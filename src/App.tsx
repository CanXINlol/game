import { evaluateCombo } from './game/comboEvaluator';
import type {
  ComboResult,
  MarketMood,
  RiskLevel,
  RunState,
  Sector,
  StockCard
} from './game/types';
import {
  getChoicePreviews,
  getSelectedCards,
  type PostSettlementChoice,
  useGameStore
} from './store/gameStore';
import './styles/app.css';

const SECTOR_LABELS: Record<Sector, string> = {
  TECH: '科技',
  CONSUMER: '消费',
  MEDICAL: '医药',
  ENERGY: '新能源',
  FINANCE: '金融'
};

const MOOD_LABELS: Record<MarketMood, string> = {
  BULL: '牛市',
  NEUTRAL: '震荡',
  BEAR: '熊市'
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
  extreme: '极高'
};

const CHOICE_LABELS: Record<PostSettlementChoice, string> = {
  cashOut: '止盈',
  hold: '继续持有',
  leverage: '加杠杆'
};

export default function App() {
  const {
    principal,
    lockedProfit,
    highestFloatingProfit,
    lastChoice,
    phase,
    run,
    lastCombo,
    lastSettlement,
    startNewRun,
    toggleCard,
    settleToday,
    chooseAfterSettlement
  } = useGameStore();

  if (!run || phase === 'start') {
    return (
      <main className="app-shell start-screen">
        <section className="start-panel" aria-labelledby="game-title">
          <p className="eyebrow">轻量 roguelike 股市牌型构筑游戏</p>
          <h1 id="game-title">《涨停之前》</h1>
          <p className="description">虚构股市牌型 roguelike 游戏</p>
          <button className="primary-action" type="button" onClick={startNewRun}>
            开始新局
          </button>
        </section>
      </main>
    );
  }

  const selectedCards = getSelectedCards(run);
  const previewCombo =
    selectedCards.length === 5 ? evaluateCombo(selectedCards) : null;
  const settledCombo = lastCombo ?? previewCombo;
  const canSettle = phase === 'selecting' && selectedCards.length === 5;
  const effectiveMaxRisk = run.maxRisk - run.temporaryMaxRiskPenalty;

  return (
    <main className="app-shell game-screen">
      <header className="top-bar">
        <div>
          <p className="eyebrow">《涨停之前》</p>
          <h1>交易日 {run.day} / 12</h1>
        </div>
        <StatusBar
          principal={principal}
          floatingProfit={run.floatingProfit}
          lockedProfit={lockedProfit}
          risk={run.risk}
          maxRisk={effectiveMaxRisk}
        />
        <button className="ghost-button" type="button" onClick={startNewRun}>
          重新开始
        </button>
      </header>

      <section className="market-panel panel">
        <div>
          <p className="section-label">今日市场</p>
          <h2>{MOOD_LABELS[run.market.mood]}</h2>
        </div>
        <dl className="market-stats">
          <div>
            <dt>热门板块</dt>
            <dd>{SECTOR_LABELS[run.market.hotSector]}</dd>
          </div>
          <div>
            <dt>弱势板块</dt>
            <dd>{SECTOR_LABELS[run.market.weakSector]}</dd>
          </div>
          <div>
            <dt>波动率</dt>
            <dd>{run.market.volatility.toFixed(2)}x</dd>
          </div>
        </dl>
        <p className="market-news">{run.market.news}</p>
      </section>

      <section className="board-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-label">手牌区</p>
              <h2>选择 5 张股票牌</h2>
            </div>
            <span className="selection-count">{selectedCards.length} / 5</span>
          </div>
          <div className="hand-grid">
            {run.hand.map((card) => (
              <StockCardButton
                key={card.id}
                card={card}
                isSelected={run.selectedCardIds.includes(card.id)}
                isDisabled={
                  phase !== 'selecting' ||
                  (!run.selectedCardIds.includes(card.id) &&
                    selectedCards.length >= 5)
                }
                onClick={() => toggleCard(card.id)}
              />
            ))}
          </div>
        </section>

        <aside className="side-stack">
          <SelectedPanel cards={selectedCards} combo={settledCombo} />
          <ActionPanel
            phase={phase}
            canSettle={canSettle}
            run={run}
            highestFloatingProfit={highestFloatingProfit}
            lastChoice={lastChoice}
            onSettle={settleToday}
            onChoose={chooseAfterSettlement}
            onRestart={startNewRun}
          />
          {lastSettlement ? (
            <SettlementPanel combo={lastCombo} settlement={lastSettlement} />
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function StatusBar(props: {
  principal: number;
  floatingProfit: number;
  lockedProfit: number;
  risk: number;
  maxRisk: number;
}) {
  return (
    <dl className="status-bar">
      <div>
        <dt>本金</dt>
        <dd>{formatMoney(props.principal)}</dd>
      </div>
      <div>
        <dt>浮盈</dt>
        <dd>{formatMoney(props.floatingProfit)}</dd>
      </div>
      <div>
        <dt>已锁定收益</dt>
        <dd>{formatMoney(props.lockedProfit)}</dd>
      </div>
      <div>
        <dt>风险 / 爆仓线</dt>
        <dd>
          {props.risk.toFixed(1)} / {props.maxRisk}
        </dd>
      </div>
    </dl>
  );
}

function StockCardButton(props: {
  card: StockCard;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`stock-card ${props.isSelected ? 'is-selected' : ''}`}
      type="button"
      disabled={props.isDisabled}
      onClick={props.onClick}
    >
      <span className="stock-card-topline">
        <strong>{props.card.name}</strong>
        <span>R{props.card.rank}</span>
      </span>
      <span className="stock-sector">{SECTOR_LABELS[props.card.sector]}</span>
      <span className={`risk-chip risk-${props.card.risk}`}>
        风险 {RISK_LABELS[props.card.risk]}
      </span>
      <span className="stock-values">
        收益 {props.card.baseReturn} / 风险 {props.card.baseRisk}
      </span>
      <span className="stock-description">{props.card.description}</span>
    </button>
  );
}

function SelectedPanel(props: {
  cards: StockCard[];
  combo: ComboResult | null;
}) {
  return (
    <section className="panel selected-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">已选组合</p>
          <h2>{props.combo ? props.combo.displayName : '等待成型'}</h2>
        </div>
        {props.combo ? (
          <span className="multiplier">x{props.combo.multiplier}</span>
        ) : null}
      </div>
      <div className="selected-list">
        {props.cards.length === 0 ? (
          <p className="muted">点击手牌开始组合买点。</p>
        ) : (
          props.cards.map((card) => (
            <span key={card.id}>
              {card.name} · R{card.rank}
            </span>
          ))
        )}
      </div>
      {props.combo ? (
        <p className="combo-description">{props.combo.description}</p>
      ) : (
        <p className="combo-description">满 5 张后自动识别牌型。</p>
      )}
    </section>
  );
}

function ActionPanel(props: {
  phase: string;
  canSettle: boolean;
  run: RunState;
  highestFloatingProfit: number;
  lastChoice: PostSettlementChoice | null;
  onSettle: () => void;
  onChoose: (choice: PostSettlementChoice) => void;
  onRestart: () => void;
}) {
  if (props.phase === 'won') {
    return (
      <section className="panel action-panel result-panel">
        <p className="section-label">通关</p>
        <h2>12 个交易日跑完了</h2>
        <p className="muted">你活到了收盘钟响，可以复盘，也可以再来一局。</p>
        <button className="primary-action" type="button" onClick={props.onRestart}>
          重新开始
        </button>
      </section>
    );
  }

  if (props.phase === 'bankrupt') {
    return (
      <section className="panel action-panel result-panel danger-panel">
        <p className="section-label">爆仓</p>
        <h2>风险线被击穿</h2>
        <p className="muted">
          最高浮盈 {formatMoney(props.highestFloatingProfit)}，最后一次选择：
          {props.lastChoice ? CHOICE_LABELS[props.lastChoice] : '无'}。
        </p>
        <button className="primary-action" type="button" onClick={props.onRestart}>
          重新开始
        </button>
      </section>
    );
  }

  if (props.phase === 'settled') {
    const previews = getChoicePreviews(props.run);

    return (
      <section className="panel action-panel">
        <p className="section-label">结算后选择</p>
        <h2>贪婪，还是落袋？</h2>
        <p className="loss-warning">
          当前浮盈 {formatMoney(props.run.floatingProfit)}。选择前请注意：最多可能失去这些未锁定浮盈。
        </p>
        <div className="choice-grid">
          {previews.map((preview) => (
            <button
              key={preview.choice}
              className="choice-card"
              type="button"
              onClick={() => props.onChoose(preview.choice)}
            >
              <strong>{preview.title}</strong>
              <span>{preview.profitText}</span>
              <span>{preview.riskText}</span>
              <em>可能失去浮盈 {formatMoney(preview.possibleLoss)}</em>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="panel action-panel">
      <p className="section-label">操作按钮</p>
      <h2>今日交易</h2>
      <button
        className="primary-action"
        type="button"
        disabled={!props.canSettle}
        onClick={props.onSettle}
      >
        结算今日
      </button>
      <p className="muted">选满 5 张后才能结算。</p>
    </section>
  );
}

function SettlementPanel(props: {
  combo: ComboResult | null;
  settlement: {
    baseReturn: number;
    comboMultiplier: number;
    marketMultiplier: number;
    toolMultiplier: number;
    leverageMultiplier: number;
    grossProfit: number;
    riskGain: number;
    newRisk: number;
    warningLevel: string;
    summaryText: string;
  };
}) {
  return (
    <section className="panel settlement-panel">
      <p className="section-label">结算面板</p>
      <h2>{props.combo?.displayName ?? '普通持仓'}</h2>
      <dl className="settlement-grid">
        <div>
          <dt>收益</dt>
          <dd>{formatMoney(props.settlement.grossProfit)}</dd>
        </div>
        <div>
          <dt>风险</dt>
          <dd>+{props.settlement.riskGain.toFixed(1)}</dd>
        </div>
        <div>
          <dt>倍率</dt>
          <dd>
            {props.settlement.comboMultiplier} / {props.settlement.marketMultiplier}
          </dd>
        </div>
        <div>
          <dt>警戒</dt>
          <dd>{props.settlement.warningLevel}</dd>
        </div>
      </dl>
      <p className="summary-text">{props.settlement.summaryText}</p>
    </section>
  );
}

function formatMoney(value: number) {
  return value.toFixed(1);
}
