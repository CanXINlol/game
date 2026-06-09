import { ActionPanel } from './components/ActionPanel';
import { ComboMeter } from './components/ComboMeter';
import { EventLogPanel } from './components/EventLogPanel';
import { HandArea } from './components/HandArea';
import { MarketPressurePanel } from './components/MarketPressurePanel';
import { PlayedCardsPanel } from './components/PlayedCardsPanel';
import { RunStatusPanel } from './components/RunStatusPanel';
import { ToolPanel } from './components/ToolPanel';
import { getFloatingProfit, useGameStore } from './store/gameStore';
import './styles/app.css';

export default function App() {
  const {
    gameStatus,
    eventState,
    lockedProfit,
    startNewRun,
    playCard,
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
        />
      </header>

      <section className="event-layout">
        <div className="event-main-stack">
          <RunStatusPanel
            gameStatus={gameStatus}
            floatingProfit={floatingProfit}
            lockedProfit={lockedProfit}
            risk={eventState.risk}
            maxRisk={eventState.maxRisk}
            ap={eventState.ap}
            maxAp={eventState.maxAp}
          />
          <MarketPressurePanel pressure={eventState.marketPressure} />
          <HandArea
            hand={eventState.hand}
            canPlay={gameStatus === 'playing'}
            onPlayCard={playCard}
          />
          <PlayedCardsPanel cards={eventState.playedCardsThisTurn} />
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
