import { ActionPanel } from './components/ActionPanel';
import { CashMeter } from './components/CashMeter';
import { ChainSummaryPanel } from './components/ChainSummaryPanel';
import { CollapsibleEventLog } from './components/CollapsibleEventLog';
import { CompactToolTriggerToast } from './components/CompactToolTriggerToast';
import { DayChoicePanel } from './components/DayChoicePanel';
import { DeckCounter } from './components/DeckCounter';
import { HandArea } from './components/HandArea';
import { IntentBanner } from './components/IntentBanner';
import { MainCombatLayout } from './components/MainCombatLayout';
import { MarketPressurePanel } from './components/MarketPressurePanel';
import { RewardPanel } from './components/RewardPanel';
import { RestPanel } from './components/RestPanel';
import { RiskControlPanel } from './components/RiskControlPanel';
import { RiskMeter } from './components/RiskMeter';
import { RouteEventPanel } from './components/RouteEventPanel';
import { RouteMap } from './components/RouteMap';
import { RunStatusPanel } from './components/RunStatusPanel';
import { ShopPanel } from './components/ShopPanel';
import { TurnSummaryPanel } from './components/TurnSummaryPanel';
import { ToolPanel } from './components/ToolPanel';
import { getEndTurnPreview } from './game/encounters';
import {
  getDayEndChoicePreviews,
  getFloatingProfit,
  useGameStore
} from './store/gameStore';
import { getDayChoiceLabel } from './game/dayChoices';
import { getBossInsuranceStatus, getRouteNode } from './game/routeMap';
import { getRouteEvent } from './game/routeEvents';
import { getRiskControlOptions } from './game/shop';
import './styles/app.css';

export default function App() {
  const {
    gameStatus,
    eventState,
    lockedProfit,
    startNewRun,
    selectRouteNode,
    completeRouteNode,
    playCard,
    endTurn,
    buyShopItem,
    refreshShop,
    applyRiskControlAction,
    applyRestChoice,
    applyRouteEventChoice,
    selectReward,
    skipReward,
    chooseDayEnd,
    resetRun
  } = useGameStore();

  if (!eventState) {
    return (
      <main className="app-shell start-screen">
        <ActionPanel
          gameStatus={gameStatus}
          onStart={startNewRun}
          onRestart={resetRun}
        />
      </main>
    );
  }

  const floatingProfit = getFloatingProfit(eventState);
  const showRewardPanel = gameStatus === 'REWARD';
  const showRouteMap =
    gameStatus === 'ROUTE_SELECT' ||
    gameStatus === 'SHOP' ||
    gameStatus === 'REST' ||
    (gameStatus === 'DAY_END' && eventState.routeMap.currentNodeId !== null);
  const showEncounterPanel =
    gameStatus === 'PLAYER_TURN' || gameStatus === 'ENEMY_INTENT';
  const currentRouteNode = eventState.routeMap.currentNodeId
    ? getRouteNode(eventState.routeMap, eventState.routeMap.currentNodeId)
    : null;

  return (
    <main className="app-shell game-screen">
      <header className="event-top-bar">
        <div>
          <p className="eyebrow">《涨停之前》</p>
          <h1>事件驱动连续 combo 内核</h1>
        </div>
        <ActionPanel
          gameStatus={gameStatus}
          onStart={startNewRun}
          onRestart={resetRun}
          lastChoiceLabel={getDayChoiceLabel(eventState.lastDayChoice)}
        />
      </header>

      <section className="event-layout">
        <div className="event-main-stack">
          {!showEncounterPanel ? (
            <RunStatusPanel
              gameStatus={gameStatus}
              day={eventState.day}
              floatingProfit={floatingProfit}
              lockedProfit={lockedProfit}
              cash={eventState.cash}
              bossInsuranceStatus={getBossInsuranceStatus(eventState)}
              act={eventState.routeMap.currentAct}
              routeNodeCount={eventState.routeMap.completedNodeIds.length}
              profitMultiplier={eventState.profitMultiplier}
              risk={eventState.risk}
              maxRisk={eventState.maxRisk}
              ap={eventState.ap}
              maxAp={eventState.maxAp}
            />
          ) : null}
          {gameStatus === 'SHOP' ? (
            <ShopPanel
              cash={eventState.cash}
              shop={eventState.shop}
              onBuyItem={buyShopItem}
              onRefreshShop={refreshShop}
              onCompleteNode={completeRouteNode}
            />
          ) : gameStatus === 'REST' && currentRouteNode?.type === 'RISK_CONTROL' ? (
            <RiskControlPanel
              state={eventState}
              options={getRiskControlOptions(eventState)}
              onApply={applyRiskControlAction}
              onCompleteNode={completeRouteNode}
            />
          ) : gameStatus === 'REST' && currentRouteNode?.type === 'REST' ? (
            <RestPanel state={eventState} onChoose={applyRestChoice} />
          ) : gameStatus === 'DAY_END' && currentRouteNode?.type === 'EVENT' ? (
            <RouteEventPanel
              event={getRouteEvent(eventState)}
              onChoose={applyRouteEventChoice}
            />
          ) : showRouteMap ? (
            <RouteMap
              routeMap={eventState.routeMap}
              onSelectNode={selectRouteNode}
              onCompleteNode={completeRouteNode}
            />
          ) : showRewardPanel ? (
            <RewardPanel
              choices={eventState.rewardChoices}
              onSelectReward={selectReward}
              onSkipReward={skipReward}
            />
          ) : gameStatus === 'DAY_END' ? (
            <DayChoicePanel
              floatingProfit={floatingProfit}
              risk={eventState.risk}
              maxRisk={eventState.maxRisk}
              previews={getDayEndChoicePreviews(eventState)}
              onChoose={chooseDayEnd}
            />
          ) : showEncounterPanel ? (
            <MainCombatLayout
              top={
                <div className="combat-route-strip">
                  <span>第 {eventState.routeMap.currentAct} 幕</span>
                  <strong>{currentRouteNode?.title ?? '路线遭遇'}</strong>
                  <span>第 {eventState.currentTurn} 回合</span>
                </div>
              }
              left={
                <>
                  <CashMeter
                    cash={eventState.cash}
                    netCash={eventState.lastChainSummary.netCash}
                  />
                  <RiskMeter risk={eventState.risk} maxRisk={eventState.maxRisk} />
                  <section className="panel compact-resource-panel">
                    <p className="section-label">行动点</p>
                    <strong>
                      {eventState.ap} / {eventState.maxAp}
                    </strong>
                  </section>
                  <DeckCounter
                    handCount={eventState.hand.length}
                    drawPileCount={eventState.drawPile.length}
                    discardPileCount={eventState.discardPile.length}
                  />
                </>
              }
              center={
                <>
                  <IntentBanner
                    pressure={eventState.marketPressure}
                    intent={eventState.marketPressure.intent}
                    damage={eventState.lastChainSummary.pressureDamage}
                  />
                  <button
                    className="primary-action"
                    type="button"
                    onClick={endTurn}
                    disabled={
                      gameStatus === 'ENEMY_INTENT' && !eventState.canResolveIntent
                    }
                  >
                    {gameStatus === 'PLAYER_TURN'
                      ? '结束玩家回合'
                      : eventState.canResolveIntent
                        ? '结算公开意图'
                        : '本回合意图已结算'}
                  </button>
                  {gameStatus === 'PLAYER_TURN' ? (
                    <p className="turn-preview">{getEndTurnPreview(eventState)}</p>
                  ) : null}
                </>
              }
              hand={
                <HandArea
                  hand={eventState.hand}
                  state={eventState}
                  canPlay={gameStatus === 'PLAYER_TURN'}
                  onPlayCard={playCard}
                />
              }
              right={
                <>
                  <TurnSummaryPanel
                    summary={eventState.lastChainSummary}
                    chainDepth={eventState.combo.chainDepth}
                    turnSummary={eventState.lastTurnSummary}
                  />
                  <CompactToolTriggerToast
                    messages={eventState.lastChainSummary.keyEvents.filter((message) =>
                      message.includes('被触发')
                    )}
                  />
                  <ToolPanel tools={eventState.tools} compact />
                  <CollapsibleEventLog eventLog={eventState.combo.eventLog} />
                </>
              }
            />
          ) : (
            <MarketPressurePanel pressure={eventState.marketPressure} />
          )}
        </div>

        {!showEncounterPanel ? (
          <aside className="event-side-stack">
          <CashMeter
            cash={eventState.cash}
            netCash={eventState.lastChainSummary.netCash}
          />
          <RiskMeter risk={eventState.risk} maxRisk={eventState.maxRisk} />
          <ChainSummaryPanel summary={eventState.lastChainSummary} />
          <CompactToolTriggerToast
            messages={eventState.lastChainSummary.keyEvents.filter((message) =>
              message.includes('被触发')
            )}
          />
          <ToolPanel tools={eventState.tools} compact />
          <CollapsibleEventLog eventLog={eventState.combo.eventLog} />
          </aside>
        ) : null}
      </section>
    </main>
  );
}
