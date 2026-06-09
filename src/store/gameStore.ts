import { create } from 'zustand';
import {
  DRAW_COUNT,
  INITIAL_FLOATING_PROFIT,
  INITIAL_RISK,
  MAX_RISK,
  MAX_TRADING_DAYS
} from '../game/constants';
import {
  createStartingDeck,
  drawCards,
  selectCard,
  unselectCard,
  type DeckState
} from '../game/deck';
import { evaluateCombo } from '../game/comboEvaluator';
import { generateMarketForDay } from '../game/market';
import { settleTradingDay } from '../game/settlement';
import {
  createInitialToolState,
  createStartingTools,
  getHoldCarryMultiplier
} from '../game/tools';
import type {
  ComboResult,
  LeverageLevel,
  RunState,
  SettlementResult
} from '../game/types';

export type GamePhase = 'start' | 'selecting' | 'settled' | 'won' | 'bankrupt';
export type PostSettlementChoice = 'cashOut' | 'hold' | 'leverage';

export interface ChoicePreview {
  choice: PostSettlementChoice;
  title: string;
  profitText: string;
  riskText: string;
  possibleLoss: number;
}

interface GameStoreState {
  principal: number;
  lockedProfit: number;
  highestFloatingProfit: number;
  lastChoice: PostSettlementChoice | null;
  phase: GamePhase;
  run: RunState | null;
  lastCombo: ComboResult | null;
  lastSettlement: SettlementResult | null;
  startNewRun: () => void;
  toggleCard: (cardId: string) => void;
  settleToday: () => void;
  chooseAfterSettlement: (choice: PostSettlementChoice) => void;
}

const INITIAL_PRINCIPAL = 100;
const CASH_OUT_LOCK_RATIO = 0.7;
const CASH_OUT_RISK_REDUCTION = 20;
const HOLD_CARRY_MULTIPLIER = 1.5;
const HOLD_RISK_GAIN = 10;
const LEVERAGE_NEXT_MULTIPLIER = 2;
const LEVERAGE_RISK_GAIN = 25;
const LEVERAGE_MAX_RISK_PENALTY = 10;

export const useGameStore = create<GameStoreState>((set, get) => ({
  principal: INITIAL_PRINCIPAL,
  lockedProfit: 0,
  highestFloatingProfit: 0,
  lastChoice: null,
  phase: 'start',
  run: null,
  lastCombo: null,
  lastSettlement: null,
  startNewRun: () => {
    const seed = `run-${Date.now()}`;
    const run = createRun(seed);

    set({
      principal: INITIAL_PRINCIPAL,
      lockedProfit: 0,
      highestFloatingProfit: 0,
      lastChoice: null,
      phase: 'selecting',
      run,
      lastCombo: null,
      lastSettlement: null
    });
  },
  toggleCard: (cardId) => {
    const { phase, run } = get();

    if (phase !== 'selecting' || !run) {
      return;
    }

    const nextRun = run.selectedCardIds.includes(cardId)
      ? unselectCard(run, cardId)
      : selectCard(run, cardId);

    set({ run: nextRun });
  },
  settleToday: () => {
    const { phase, run } = get();

    if (phase !== 'selecting' || !run || run.selectedCardIds.length !== 5) {
      return;
    }

    const selectedCards = getSelectedCards(run);
    const combo = evaluateCombo(selectedCards);
    const settlement = settleTradingDay(
      selectedCards,
      combo,
      run.market,
      run,
      normalizeLeverage(run.leverage)
    );
    const highestFloatingProfit = Math.max(
      get().highestFloatingProfit,
      settlement.newFloatingProfit
    );
    const nextRun: RunState = {
      ...run,
      floatingProfit: settlement.newFloatingProfit,
      floatingProfitCarryMultiplier: 1,
      nextSettlementMultiplier: 1,
      temporaryMaxRiskPenalty: 0,
      toolState: settlement.updatedToolState,
      risk: settlement.newRisk,
      settlements: [...run.settlements, settlement],
      status: settlement.isBankrupt ? 'lost' : run.status
    };

    set({
      principal: settlement.principalOverride ?? get().principal,
      lockedProfit: roundToTwoDecimals(
        get().lockedProfit + settlement.toolLockedProfit
      ),
      highestFloatingProfit,
      run: nextRun,
      phase: settlement.isBankrupt ? 'bankrupt' : 'settled',
      lastCombo: combo,
      lastSettlement: settlement
    });
  },
  chooseAfterSettlement: (choice) => {
    const { phase, run } = get();

    if (phase !== 'settled' || !run) {
      return;
    }

    const choiceResult = applyPostSettlementChoice(run, choice, get().lockedProfit);
    const effectiveMaxRisk =
      choiceResult.run.maxRisk - choiceResult.run.temporaryMaxRiskPenalty;
    const isBankrupt = choiceResult.run.risk >= effectiveMaxRisk;

    if (isBankrupt) {
      set({
        lockedProfit: choiceResult.lockedProfit,
        highestFloatingProfit: Math.max(
          get().highestFloatingProfit,
          choiceResult.run.floatingProfit
        ),
        lastChoice: choice,
        run: {
          ...choiceResult.run,
          status: 'lost'
        },
        phase: 'bankrupt'
      });
      return;
    }

    if (run.day >= MAX_TRADING_DAYS) {
      set({
        lockedProfit: choiceResult.lockedProfit,
        highestFloatingProfit: Math.max(
          get().highestFloatingProfit,
          choiceResult.run.floatingProfit
        ),
        lastChoice: choice,
        run: {
          ...choiceResult.run,
          hand: [],
          discardPile: [...choiceResult.run.discardPile, ...choiceResult.run.hand],
          selectedCardIds: [],
          status: 'won'
        },
        phase: 'won'
      });
      return;
    }

    const nextDay = run.day + 1;
    const preparedDeckState = drawCards(
      {
        ...choiceResult.run,
        day: nextDay,
        deck: choiceResult.run.deck,
        hand: [],
        discardPile: [...choiceResult.run.discardPile, ...choiceResult.run.hand],
        selectedCardIds: [],
        market: generateMarketForDay(nextDay, run.seed)
      },
      DRAW_COUNT
    );

    set({
      lockedProfit: choiceResult.lockedProfit,
      highestFloatingProfit: Math.max(
        get().highestFloatingProfit,
        preparedDeckState.floatingProfit
      ),
      lastChoice: choice,
      run: preparedDeckState,
      phase: 'selecting',
      lastCombo: null,
      lastSettlement: null
    });
  }
}));

export function getSelectedCards(run: Pick<RunState, 'hand' | 'selectedCardIds'>) {
  const selectedIds = new Set(run.selectedCardIds);

  return run.hand.filter((card) => selectedIds.has(card.id));
}

export function getChoicePreviews(run: RunState): ChoicePreview[] {
  return [
    {
      choice: 'cashOut',
      title: '止盈',
      profitText: `锁定 ${formatNumber(run.floatingProfit * CASH_OUT_LOCK_RATIO)}，剩余浮盈继续承担波动`,
      riskText: `风险 -${CASH_OUT_RISK_REDUCTION}`,
      possibleLoss: run.floatingProfit * (1 - CASH_OUT_LOCK_RATIO)
    },
    {
      choice: 'hold',
      title: '继续持有',
      profitText: `浮盈保留，明日浮盈延续倍率 x${HOLD_CARRY_MULTIPLIER}`,
      riskText: `风险 +${HOLD_RISK_GAIN}`,
      possibleLoss: run.floatingProfit
    },
    {
      choice: 'leverage',
      title: '加杠杆',
      profitText: `明日结算收益额外 x${LEVERAGE_NEXT_MULTIPLIER}`,
      riskText: `风险 +${LEVERAGE_RISK_GAIN}，爆仓线临时 -${LEVERAGE_MAX_RISK_PENALTY}`,
      possibleLoss: run.floatingProfit
    }
  ];
}

function createRun(seed: string): RunState {
  const deckState = drawCards(
    {
      seed,
      deck: createStartingDeck(seed),
      hand: [],
      discardPile: [],
      selectedCardIds: [],
      reshuffleCount: 0
    } satisfies DeckState,
    DRAW_COUNT
  );

  return {
    ...deckState,
    day: 1,
    tools: createStartingTools(seed),
    market: generateMarketForDay(1, seed),
    toolState: createInitialToolState(),
    floatingProfit: INITIAL_FLOATING_PROFIT,
    floatingProfitCarryMultiplier: 1,
    nextSettlementMultiplier: 1,
    temporaryMaxRiskPenalty: 0,
    leverage: 0,
    risk: INITIAL_RISK,
    maxRisk: MAX_RISK,
    settlements: [],
    status: 'running'
  };
}

function applyPostSettlementChoice(
  run: RunState,
  choice: PostSettlementChoice,
  lockedProfit: number
) {
  if (choice === 'cashOut') {
    const lockedGain = roundToTwoDecimals(run.floatingProfit * CASH_OUT_LOCK_RATIO);

    return {
      lockedProfit: roundToTwoDecimals(lockedProfit + lockedGain),
      run: {
        ...run,
        floatingProfit: roundToTwoDecimals(run.floatingProfit - lockedGain),
        floatingProfitCarryMultiplier: 1,
        nextSettlementMultiplier: 1,
        temporaryMaxRiskPenalty: 0,
        leverage: 0,
        risk: Math.max(0, roundToTwoDecimals(run.risk - CASH_OUT_RISK_REDUCTION))
      }
    };
  }

  if (choice === 'hold') {
    return {
      lockedProfit,
      run: {
        ...run,
        floatingProfitCarryMultiplier: getHoldCarryMultiplier(
          run.tools,
          HOLD_CARRY_MULTIPLIER
        ),
        nextSettlementMultiplier: 1,
        temporaryMaxRiskPenalty: 0,
        risk: roundToTwoDecimals(run.risk + HOLD_RISK_GAIN)
      }
    };
  }

  return {
    lockedProfit,
    run: {
      ...run,
      floatingProfitCarryMultiplier: 1,
      nextSettlementMultiplier: LEVERAGE_NEXT_MULTIPLIER,
      temporaryMaxRiskPenalty: LEVERAGE_MAX_RISK_PENALTY,
      leverage: 0,
      risk: roundToTwoDecimals(run.risk + LEVERAGE_RISK_GAIN)
    }
  };
}

function normalizeLeverage(leverage: number): LeverageLevel {
  if (leverage <= 0) {
    return 0;
  }

  if (leverage >= 2) {
    return 2;
  }

  return 1;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number) {
  return roundToTwoDecimals(value).toFixed(1);
}
