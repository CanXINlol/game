import { create } from 'zustand';
import {
  applyGreedChoice,
  createNewRun,
  endTurn,
  finishEncounterReward,
  refreshTradeChainPreview
} from '../game/encounters';
import { completeRouteNode, selectRouteNode } from '../game/routeMap';
import { applyEventChoice } from '../game/routeEvents';
import { applyRiskControlChoice, type RiskControlChoice } from '../game/riskControl';
import { applyRestChoice, type RestChoice } from '../game/restSite';
import { buyShopItem } from '../game/shop';
import { canAddCardToChain, executeTradeChain } from '../game/playCard';
import type { GreedChoice, Run } from '../game/types';

interface GameStoreState {
  run: Run | null;
  selectedTraderId: string;
  startNewRun: (traderId?: string) => void;
  selectRouteNode: (nodeId: string) => void;
  completeRouteNode: () => void;
  addCardToChain: (cardId: string) => void;
  removeCardFromChain: (index: number) => void;
  executeChain: () => void;
  endTurn: () => void;
  chooseGreed: (choice: GreedChoice) => void;
  buyShopItem: (itemId: string, cardId?: string) => void;
  applyRestChoice: (choice: RestChoice, cardId?: string) => void;
  applyRiskControlChoice: (choice: RiskControlChoice, cardId?: string, insuranceId?: string) => void;
  applyEventChoice: (choiceId: string) => void;
  leaveNode: () => void;
}

function withReward(run: Run): Run {
  if (run.status === 'REWARD') {
    return finishEncounterReward(run);
  }
  return run;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  run: null,
  selectedTraderId: 'old-hand',
  startNewRun: (traderId = 'old-hand') => {
    set({ run: createNewRun(traderId), selectedTraderId: traderId });
  },
  selectRouteNode: (nodeId) => {
    const { run } = get();
    if (!run) return;
    set({ run: selectRouteNode(run, nodeId) });
  },
  completeRouteNode: () => {
    const { run } = get();
    if (!run) return;
    set({ run: completeRouteNode(run) });
  },
  addCardToChain: (cardId) => {
    const { run } = get();
    if (!run || run.status !== 'PLAYER_TURN' || !run.currentEncounter || !run.hand.includes(cardId)) return;
    if (!canAddCardToChain(run.tradeChain.selectedCardIds)) return;
    const handCopies = run.hand.filter((item) => item === cardId).length;
    const selectedCopies = run.tradeChain.selectedCardIds.filter((item) => item === cardId).length;
    if (selectedCopies >= handCopies) return;
    const selectedCardIds = [...run.tradeChain.selectedCardIds, cardId];
    set({ run: refreshTradeChainPreview(run, selectedCardIds) });
  },
  removeCardFromChain: (index) => {
    const { run } = get();
    if (!run) return;
    const selectedCardIds = run.tradeChain.selectedCardIds.filter((_, i) => i !== index);
    set({ run: refreshTradeChainPreview(run, selectedCardIds) });
  },
  executeChain: () => {
    const { run } = get();
    if (!run) return;
    set({ run: withReward(executeTradeChain(run)) });
  },
  endTurn: () => {
    const { run } = get();
    if (!run) return;
    set({ run: endTurn(run) });
  },
  chooseGreed: (choice) => {
    const { run } = get();
    if (!run) return;
    set({ run: withReward(applyGreedChoice(run, choice)) });
  },
  buyShopItem: (itemId, cardId) => {
    const { run } = get();
    if (!run) return;
    set({ run: buyShopItem(run, itemId, cardId) });
  },
  applyRestChoice: (choice, cardId) => {
    const { run } = get();
    if (!run) return;
    set({ run: applyRestChoice(run, choice, cardId) });
  },
  applyRiskControlChoice: (choice, cardId, insuranceId) => {
    const { run } = get();
    if (!run) return;
    set({ run: applyRiskControlChoice(run, choice, cardId, insuranceId) });
  },
  applyEventChoice: (choiceId) => {
    const { run } = get();
    if (!run) return;
    set({ run: applyEventChoice(run, choiceId) });
  },
  leaveNode: () => {
    const { run } = get();
    if (!run) return;
    set({ run: completeRouteNode(run) });
  }
}));


