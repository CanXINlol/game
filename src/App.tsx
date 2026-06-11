import { useEffect, useState } from 'react';
import { ActionPanel } from './components/ActionPanel';
import { CashMeter } from './components/CashMeter';
import { ChainSummaryPanel } from './components/ChainSummaryPanel';
import { CollapsibleEventLog } from './components/CollapsibleEventLog';
import { CombatMarketPanel } from './components/CombatMarketPanel';
import { CombatStatusBar } from './components/CombatStatusBar';
import { CombatSummaryPanel } from './components/CombatSummaryPanel';
import { CompactToolTriggerToast } from './components/CompactToolTriggerToast';
import { DayChoicePanel } from './components/DayChoicePanel';
import { DeckViewer } from './components/DeckViewer';
import { EventHistoryViewer } from './components/EventHistoryViewer';
import { HandArea } from './components/HandArea';
import { InsuranceViewer } from './components/InsuranceViewer';
import { MainCombatLayout } from './components/MainCombatLayout';
import { MarketPressurePanel } from './components/MarketPressurePanel';
import { ResourceRail, type ViewerKind } from './components/ResourceRail';
import { RestPanel } from './components/RestPanel';
import { RewardPanel } from './components/RewardPanel';
import { RiskControlPanel } from './components/RiskControlPanel';
import { RiskMeter } from './components/RiskMeter';
import { RouteEventPanel } from './components/RouteEventPanel';
import { RouteMap } from './components/RouteMap';
import { RunStatusPanel } from './components/RunStatusPanel';
import { ShopPanel } from './components/ShopPanel';
import { ToolViewer } from './components/ToolViewer';
import { TraderSelect } from './components/TraderSelect';
import { getDayChoiceLabel } from './game/dayChoices';
import { getEndTurnPreview } from './game/encounters';
import { getBossInsuranceStatus, getRouteNode } from './game/routeMap';
import { getRouteEvent } from './game/routeEvents';
import { getRiskControlOptions } from './game/shop';
import {
  getDayEndChoicePreviews,
  getFloatingProfit,
  useGameStore
} from './store/gameStore';
import './styles/app.css';

export default function App() {
  const [openViewer, setOpenViewer] = useState<ViewerKind | null>(null);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenViewer(null);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'd') setOpenViewer('deck');
      if (key === 't') setOpenViewer('tools');
      if (key === 'i') setOpenViewer('insurance');
      if (key === 'h') setOpenViewer('history');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!eventState) {
    return (
      <main className="app-shell start-screen">
        <TraderSelect onSelectTrader={startNewRun} />
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
  const bossStage =
    currentRouteNode?.type === 'BOSS'
      ? `第 ${eventState.routeMap.currentAct} 幕首领`
      : null;
  const endTurnPreview =
    gameStatus === 'PLAYER_TURN' ? getEndTurnPreview(eventState) : '';
  const handleEndTurn = () => {
    if (gameStatus === 'PLAYER_TURN') {
      const confirmed =
        typeof window === 'undefined' ? true : window.confirm(endTurnPreview);

      if (!confirmed) {
        return;
      }
    }

    endTurn();
  };

  return (
    <main className="app-shell game-screen">
      <DeckViewer
        open={openViewer === 'deck'}
        state={eventState}
        onClose={() => setOpenViewer(null)}
      />
      <ToolViewer
        open={openViewer === 'tools'}
        tools={eventState.tools}
        onClose={() => setOpenViewer(null)}
      />
      <InsuranceViewer
        open={openViewer === 'insurance'}
        insurance={eventState.consumables}
        onClose={() => setOpenViewer(null)}
      />
      <EventHistoryViewer
        open={openViewer === 'history'}
        eventLog={eventState.combo.eventLog}
        runHistory={eventState.runHistory}
        onClose={() => setOpenViewer(null)}
      />

      <header className="event-top-bar">
        <div>
          <p className="eyebrow">《涨停之前》</p>
          <h1>路线与连续出牌</h1>
        </div>
        <ActionPanel
          gameStatus={gameStatus}
          onStart={startNewRun}
          onRestart={resetRun}
          lastChoiceLabel={getDayChoiceLabel(eventState.lastDayChoice)}
        />
      </header>

      <section className={`event-layout ${showEncounterPanel ? 'combat-event-layout' : ''}`}>
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
                <CombatStatusBar
                  state={eventState}
                  gameStatus={gameStatus}
                  floatingProfit={floatingProfit}
                  routeNode={currentRouteNode ?? null}
                />
              }
              left={<ResourceRail state={eventState} onOpenViewer={setOpenViewer} />}
              center={
                <>
                  <CombatMarketPanel
                    pressure={eventState.marketPressure}
                    bossStage={bossStage}
                  />
                  <button
                    className="primary-action end-turn-action"
                    type="button"
                    onClick={handleEndTurn}
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
                    <p className="turn-preview">{endTurnPreview}</p>
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
                <CombatSummaryPanel
                  summary={eventState.lastChainSummary}
                  chainDepth={eventState.combo.chainDepth}
                />
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
            <CollapsibleEventLog eventLog={eventState.combo.eventLog} />
          </aside>
        ) : null}
      </section>
    </main>
  );
}
