import { create } from 'zustand';
import {
  applyDayChoice,
  getDayChoicePreviews,
  type DayChoiceId,
  type DayChoicePreview
} from '../game/dayChoices';
import {
  applyRewardChoice,
  enterDayEndAfterReward,
  skipReward as applySkipReward,
  startNextMarketPressure
} from '../game/rewards';
import { settleEncounterTurn } from '../game/encounters';
import {
  createFormalEventGameState,
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
  endTurn: () => void;
  selectReward: (rewardId: string) => void;
  skipReward: () => void;
  continueAfterReward: () => void;
  endDayAfterReward: () => void;
  chooseDayEnd: (choice: DayChoiceId) => void;
  resetRun: () => void;
}

function cloneEventState(state: EventGameState): EventGameState {
  return {
    ...state,
    hand: [...state.hand],
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    playedCardsThisTurn: [...state.playedCardsThisTurn],
    combo: {
      ...state.combo,
      eventLog: [...state.combo.eventLog]
    },
    marketPressure: { ...state.marketPressure },
    tools: [...state.tools],
    rewardChoices: [...state.rewardChoices],
    runHistory: [...state.runHistory],
    resolvedEventTypes: [...state.resolvedEventTypes],
    toolUseCounts: { ...state.toolUseCounts },
    triggeredComboMilestones: Object.fromEntries(
      Object.entries(state.triggeredComboMilestones).map(([toolId, thresholds]) => [
        toolId,
        [...thresholds]
      ])
    )
  };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  lockedProfit: 0,
  gameStatus: 'start',
  eventState: null,
  startNewRun: () => {
    const eventState = createFormalEventGameState();

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
  endTurn: () => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'playing') {
      return;
    }

    const nextState = cloneEventState(eventState);
    settleEncounterTurn(nextState);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  selectReward: (rewardId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'reward') {
      return;
    }

    const nextState = cloneEventState(eventState);
    const result = applyRewardChoice(nextState, rewardId);

    nextState.rewardChoices = [];
    nextState.phase = 'postReward';
    nextState.combo.eventLog.push(result.message);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  skipReward: () => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'reward') {
      return;
    }

    const nextState = cloneEventState(eventState);
    const result = applySkipReward(nextState);

    nextState.rewardChoices = [];
    nextState.phase = 'postReward';
    nextState.combo.eventLog.push(result.message);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  continueAfterReward: () => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'postReward') {
      return;
    }

    const nextState = cloneEventState(eventState);
    startNextMarketPressure(nextState);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  endDayAfterReward: () => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'postReward') {
      return;
    }

    const nextState = cloneEventState(eventState);
    enterDayEndAfterReward(nextState);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  chooseDayEnd: (choice) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'dayEnd') {
      return;
    }

    const nextState = cloneEventState(eventState);
    applyDayChoice(nextState, choice);

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

export function getDayEndChoicePreviews(
  state: EventGameState | null
): DayChoicePreview[] {
  return state ? getDayChoicePreviews(state) : [];
}

export type { DayChoiceId };
