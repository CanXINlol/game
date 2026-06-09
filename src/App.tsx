import { ActionPanel } from './components/ActionPanel';
import { ComboMeter } from './components/ComboMeter';
import { DayChoicePanel } from './components/DayChoicePanel';
import { EventLogPanel } from './components/EventLogPanel';
import { HandArea } from './components/HandArea';
import { MarketPressurePanel } from './components/MarketPressurePanel';
import { MarketIntentPanel } from './components/MarketIntentPanel';
import { PlayedCardsPanel } from './components/PlayedCardsPanel';
import { RewardPanel } from './components/RewardPanel';
import { RunStatusPanel } from './components/RunStatusPanel';
import { ToolPanel } from './components/ToolPanel';
import {
  getDayEndChoicePreviews,
  getFloatingProfit,
  useGameStore
} from './store/gameStore';
import { getDayChoiceLabel } from './game/dayChoices';
import './styles/app.css';

export default function App() {
  const {
    gameStatus,
    eventState,
    lockedProfit,
    startNewRun,
    playCard,
    endTurn,
    selectReward,
    skipReward,
    continueAfterReward,
    endDayAfterReward,
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
  const showRewardPanel = gameStatus === 'reward' || gameStatus === 'postReward';

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
          <RunStatusPanel
            gameStatus={gameStatus}
            day={eventState.day}
            floatingProfit={floatingProfit}
            lockedProfit={lockedProfit}
            profitMultiplier={eventState.profitMultiplier}
            risk={eventState.risk}
            maxRisk={eventState.maxRisk}
            ap={eventState.ap}
            maxAp={eventState.maxAp}
          />
          {showRewardPanel ? (
            <RewardPanel
              phase={gameStatus === 'postReward' ? 'postReward' : 'reward'}
              choices={eventState.rewardChoices}
              onSelectReward={selectReward}
              onSkipReward={skipReward}
              onContinueTrading={continueAfterReward}
              onEndDay={endDayAfterReward}
            />
          ) : gameStatus === 'dayEnd' ? (
            <DayChoicePanel
              floatingProfit={floatingProfit}
              risk={eventState.risk}
              maxRisk={eventState.maxRisk}
              previews={getDayEndChoicePreviews(eventState)}
              onChoose={chooseDayEnd}
            />
          ) : (
            <>
              <MarketPressurePanel pressure={eventState.marketPressure} />
              <MarketIntentPanel intent={eventState.marketPressure.intent} />
              <HandArea
                hand={eventState.hand}
                canPlay={gameStatus === 'playing'}
                onPlayCard={playCard}
              />
              <button className="primary-action" type="button" onClick={endTurn}>
                收盘整理：结算公开意图
              </button>
              <PlayedCardsPanel cards={eventState.playedCardsThisTurn} />
            </>
          )}
        </div>

        <aside className="event-side-stack">
          <ComboMeter combo={eventState.combo} />
          <ToolPanel tools={eventState.tools} />
          <EventLogPanel eventLog={eventState.combo.eventLog} />
        </aside>
      </section>
    </main>
  );
}
