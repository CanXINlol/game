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
import { applyRestChoice, type RestChoiceId } from '../game/restSite';
import { applyRouteEventChoice } from '../game/routeEvents';
import { endEncounterTurn, settleEncounterTurn } from '../game/encounters';
import { aggregateChainSummary } from '../game/feedback';
import { completeCurrentRouteNode, selectRouteNode } from '../game/routeMap';
import {
  applyRiskControlAction,
  buyShopItem,
  refreshShop,
  type RiskControlAction
} from '../game/shop';
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
  selectRouteNode: (nodeId: string) => void;
  completeRouteNode: () => void;
  playCard: (cardId: string) => void;
  endTurn: () => void;
  buyShopItem: (itemId: string) => void;
  refreshShop: () => void;
  applyRiskControlAction: (action: RiskControlAction, cardId?: string) => void;
  applyRestChoice: (choice: RestChoiceId, cardId?: string) => void;
  applyRouteEventChoice: (choiceId: string) => void;
  selectReward: (rewardId: string) => void;
  skipReward: () => void;
  continueAfterReward: () => void;
  endDayAfterReward: () => void;
  chooseDayEnd: (choice: DayChoiceId) => void;
  resetRun: () => void;
}

function resetActionFeedback(state: EventGameState) {
  state.resolvedEventsThisAction = [];
  state.cashTransactionsThisAction = [];
  state.lastChainSummary = aggregateChainSummary([]);
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
    routeMap: {
      ...state.routeMap,
      acts: state.routeMap.acts.map((act) => ({
        ...act,
        nodes: act.nodes.map((node) => ({
          ...node,
          nextNodeIds: [...node.nextNodeIds]
        }))
      })),
      completedNodeIds: [...state.routeMap.completedNodeIds],
      availableNodeIds: [...state.routeMap.availableNodeIds]
    },
    shop: {
      ...state.shop,
      sections: {
        cards: state.shop.sections.cards.map((item) => ({ ...item })),
        tools: state.shop.sections.tools.map((item) => ({ ...item })),
        insurance: state.shop.sections.insurance.map((item) => ({ ...item })),
        services: state.shop.sections.services.map((item) => ({ ...item }))
      },
      items: state.shop.items.map((item) => ({ ...item }))
    },
    tools: [...state.tools],
    consumables: [...state.consumables],
    rewardChoices: [...state.rewardChoices],
    runHistory: [...state.runHistory],
    resolvedEventTypes: [...state.resolvedEventTypes],
    resolvedEventsThisAction: [...state.resolvedEventsThisAction],
    cashTransactions: [...state.cashTransactions],
    cashTransactionsThisAction: [...state.cashTransactionsThisAction],
    lastChainSummary: {
      ...state.lastChainSummary,
      keyEvents: [...state.lastChainSummary.keyEvents]
    },
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
    const eventState = createFormalEventGameState({
      phase: 'ROUTE_SELECT',
      encounterStatus: 'ACTIVE'
    });

    set({
      lockedProfit: 0,
      gameStatus: eventState.phase,
      eventState
    });
  },
  selectRouteNode: (nodeId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'ROUTE_SELECT') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = selectRouteNode(nextState, nodeId);
    nextState.combo.eventLog.push(result.message);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  completeRouteNode: () => {
    const { eventState, gameStatus } = get();

    if (
      !eventState ||
      !['SHOP', 'REST', 'DAY_END', 'REWARD'].includes(gameStatus)
    ) {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = completeCurrentRouteNode(nextState);
    nextState.combo.eventLog.push(result.message);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  playCard: (cardId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'PLAYER_TURN') {
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

    if (!eventState) {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    if (gameStatus === 'PLAYER_TURN') {
      endEncounterTurn(nextState);
    } else if (gameStatus === 'ENEMY_INTENT') {
      settleEncounterTurn(nextState);
    } else {
      return;
    }

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  buyShopItem: (itemId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'SHOP') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = buyShopItem(nextState, itemId);
    nextState.combo.eventLog.push(result.message);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  refreshShop: () => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'SHOP') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = refreshShop(nextState);
    nextState.combo.eventLog.push(result.message);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  applyRiskControlAction: (action, cardId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'REST') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = applyRiskControlAction(nextState, action, cardId);
    nextState.combo.eventLog.push(result.message);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  applyRestChoice: (choice, cardId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'REST') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = applyRestChoice(nextState, choice, cardId);
    nextState.combo.eventLog.push(result.message);

    if (result.success) {
      completeCurrentRouteNode(nextState);
    }

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  applyRouteEventChoice: (choiceId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'DAY_END') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = applyRouteEventChoice(nextState, choiceId);
    nextState.combo.eventLog.push(result.message);

    if (result.success) {
      completeCurrentRouteNode(nextState);
    }

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  selectReward: (rewardId) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'REWARD') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = applyRewardChoice(nextState, rewardId);

    nextState.combo.eventLog.push(result.message);
    if (nextState.routeMap.currentNodeId) {
      completeCurrentRouteNode(nextState);
    } else {
      enterDayEndAfterReward(nextState);
    }

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  skipReward: () => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'REWARD') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    const result = applySkipReward(nextState);

    nextState.combo.eventLog.push(result.message);
    if (nextState.routeMap.currentNodeId) {
      completeCurrentRouteNode(nextState);
    } else {
      enterDayEndAfterReward(nextState);
    }

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  continueAfterReward: () => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'REWARD') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    startNextMarketPressure(nextState);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  endDayAfterReward: () => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'REWARD') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
    enterDayEndAfterReward(nextState);

    set({
      eventState: nextState,
      gameStatus: nextState.phase,
      lockedProfit: nextState.lockedProfit
    });
  },
  chooseDayEnd: (choice) => {
    const { eventState, gameStatus } = get();

    if (!eventState || gameStatus !== 'DAY_END') {
      return;
    }

    const nextState = cloneEventState(eventState);
    resetActionFeedback(nextState);
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

export type { DayChoiceId, RestChoiceId, RiskControlAction };
