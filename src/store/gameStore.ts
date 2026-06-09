import { create } from 'zustand';
import {
  createTestEventGameState,
  playCard as playEventCard,
  type EventGameState,
  type EventGamePhase
} from '../game/playCard';

export type GameStatus = 'start' | EventGamePhase;

interface GameStoreState {
  lockedProfit: number;
  gameStatus: GameStatus;
  eventState: EventGameState | null;
  startNewRun: () => void;
  playCard: (cardId: string) => void;
  resetRun: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  lockedProfit: 0,
  gameStatus: 'start',
  eventState: null,
  startNewRun: () => {
    const eventState = createTestEventGameState();

    set({
      lockedProfit: 0,
      gameStatus: eventState.phase,
      eventState
    });
  },
  playCard: (cardId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'playing') {
      return;
    }

    const nextState = playEventCard(eventState, cardId);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  resetRun: () => {
    set({
      lockedProfit: 0,
      gameStatus: 'start',
      eventState: null
    });
  }
}));

export function getFloatingProfit(state: EventGameState | null) {
  return state?.combo.currentChainProfit ?? 0;
}
