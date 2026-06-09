import { discardContinuousTurn, drawFromContinuousDeck } from './deck';
import type { EventCard } from './effects';
import type { EventGameState } from './playCard';

export type MarketIntentType =
  | 'RISK_ATTACK'
  | 'SHIELD_UP'
  | 'WEAKEN_SECTOR'
  | 'TAX_PROFIT'
  | 'LOCK_HAND'
  | 'VOLATILITY_SPIKE'
  | 'SUMMON_NOISE';

export interface MarketIntent {
  type: MarketIntentType;
  label: string;
  description: string;
  value?: number;
  sector?: string;
}

const EVENT_HAND_SIZE = 5;
const INTENT_SEQUENCE: MarketIntent[] = [
  {
    type: 'RISK_ATTACK',
    label: '风险打击',
    description: '下回合结算时 risk +12。',
    value: 12
  },
  {
    type: 'SHIELD_UP',
    label: '加厚护盾',
    description: '下回合结算时 MarketPressure 获得 18 shield。',
    value: 18
  },
  {
    type: 'WEAKEN_SECTOR',
    label: '削弱科技',
    description: '下回合 TECH 收益降低，最好换板块或打穿。',
    sector: 'TECH'
  },
  {
    type: 'TAX_PROFIT',
    label: '浮盈征税',
    description: '下回合结算时扣除 20% 当前浮盈。',
    value: 0.2
  },
  {
    type: 'LOCK_HAND',
    label: '锁手提费',
    description: '下回合抽牌后，低费手牌 cost +1。',
    value: 1
  },
  {
    type: 'VOLATILITY_SPIKE',
    label: '波动尖刺',
    description: '下回合收益 x1.25，risk 事件也 x1.25。',
    value: 1.25
  },
  {
    type: 'SUMMON_NOISE',
    label: '噪音入场',
    description: '下回合结算时往弃牌堆加入 1 张市场噪音。',
    value: 1
  }
];

export const MARKET_NOISE_CARD: EventCard = {
  id: 'market-noise',
  name: '市场噪音',
  sector: 'FINANCE',
  rank: 1,
  risk: 'medium',
  tags: ['volatile'],
  baseReturn: 0,
  baseRisk: 3,
  cardType: 'RISK',
  playEffect: '没有收益，只会 risk +3。\n这是市场压力塞进牌组的噪音牌。',
  cost: 0,
  cardRole: 'STARTER',
  effects: [{ type: 'GAIN_RISK', value: 3 }]
};

export function createMarketIntent(seed: string, index: number): MarketIntent {
  const seedOffset = Array.from(seed).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  );
  const intent = INTENT_SEQUENCE[(seedOffset + index) % INTENT_SEQUENCE.length];

  return { ...intent };
}

export function settleEncounterTurn(state: EventGameState): EventGameState {
  if (state.phase !== 'playing') {
    return state;
  }

  const intent = state.marketPressure.intent;
  state.combo.eventLog.push(`公开意图结算：${intent.label}。${intent.description}`);

  resetIntentModifiers(state);
  const isBankrupt = applyIntentBeforeDraw(state, intent);

  if (isBankrupt) {
    return state;
  }

  const preparedState = discardContinuousTurn(state);
  state.hand = preparedState.hand;
  state.discardPile = preparedState.discardPile;
  state.playedCardsThisTurn = preparedState.playedCardsThisTurn;
  state.cardsDrawnThisTurn = preparedState.cardsDrawnThisTurn;
  state.actionPoints = state.maxActionPoints;
  state.ap = state.actionPoints;
  state.lastPlayedCard = null;
  state.lastPlayedCost = null;
  state.turboturnStep = 0;
  state.turboturnMultiplier = 1;
  state.resolvedEventTypes = [];
  state.toolUseCounts = {};
  state.triggeredComboMilestones = {};

  drawOpeningHand(state);
  applyIntentAfterDraw(state, intent);

  state.encounterTurn += 1;
  state.marketPressure = {
    ...state.marketPressure,
    intent: createMarketIntent(
      state.seed,
      state.marketPressureIndex + state.encounterTurn
    )
  };
  state.combo.eventLog.push(`下一公开意图：${state.marketPressure.intent.label}。`);

  return state;
}

function applyIntentBeforeDraw(state: EventGameState, intent: MarketIntent) {
  if (intent.type === 'RISK_ATTACK') {
    gainRiskFromIntent(state, intent.value ?? 0);
  }

  if (intent.type === 'SHIELD_UP') {
    state.marketPressure = {
      ...state.marketPressure,
      shield: roundToTwoDecimals(state.marketPressure.shield + (intent.value ?? 0))
    };
    state.combo.eventLog.push(`MarketPressure 获得 ${intent.value ?? 0} shield。`);
  }

  if (intent.type === 'WEAKEN_SECTOR') {
    state.weakenedSector = intent.sector ?? null;
    state.combo.eventLog.push(`${intent.sector} 被削弱，本回合该板块收益降低。`);
  }

  if (intent.type === 'TAX_PROFIT') {
    const ratio = intent.value ?? 0;
    const taxed = roundToTwoDecimals(state.combo.currentChainProfit * ratio);
    state.combo = {
      ...state.combo,
      currentChainProfit: roundToTwoDecimals(state.combo.currentChainProfit - taxed)
    };
    state.combo.eventLog.push(`浮盈征税扣除 ${taxed}。`);
  }

  if (intent.type === 'VOLATILITY_SPIKE') {
    const multiplier = intent.value ?? 1.25;
    state.intentProfitMultiplier = multiplier;
    state.intentRiskMultiplier = multiplier;
    state.combo.eventLog.push(`波动尖刺生效：收益和 risk 事件 x${multiplier.toFixed(2)}。`);
  }

  if (intent.type === 'SUMMON_NOISE') {
    const count = intent.value ?? 1;
    const noises = Array.from({ length: count }, (_, index) => ({
      ...MARKET_NOISE_CARD,
      id: `${MARKET_NOISE_CARD.id}-${state.day}-${state.marketPressureIndex}-${state.encounterTurn}-${index}`
    }));
    state.discardPile = [...state.discardPile, ...noises];
    state.combo.eventLog.push(`市场噪音加入弃牌堆 x${count}。`);
  }

  return state.phase === 'bankrupt';
}

function applyIntentAfterDraw(state: EventGameState, intent: MarketIntent) {
  if (intent.type !== 'LOCK_HAND') {
    return;
  }

  const increase = intent.value ?? 1;
  state.hand = state.hand.map((card) => {
    if (card.cost > 1) {
      return card;
    }

    return {
      ...card,
      cost: Math.min(3, card.cost + increase) as EventCard['cost']
    };
  });
  state.combo.eventLog.push('锁手提费生效：低费手牌 cost +1。');
}

function drawOpeningHand(state: EventGameState) {
  const drawCount = Math.max(0, EVENT_HAND_SIZE - state.hand.length);
  const nextState = drawFromContinuousDeck(state, drawCount);

  state.hand = nextState.hand;
  state.drawPile = nextState.drawPile;
  state.discardPile = nextState.discardPile;
  state.reshuffleCount = nextState.reshuffleCount;
  state.cardsDrawnThisTurn = nextState.cardsDrawnThisTurn;
}

function resetIntentModifiers(state: EventGameState) {
  state.intentProfitMultiplier = 1;
  state.intentRiskMultiplier = 1;
  state.weakenedSector = null;
}

function gainRiskFromIntent(state: EventGameState, amount: number) {
  state.risk = roundToTwoDecimals(state.risk + amount);
  state.combo.currentChainRisk = roundToTwoDecimals(
    state.combo.currentChainRisk + amount
  );
  state.combo.eventLog.push(`公开意图造成 risk +${amount}。`);

  if (state.risk >= state.maxRisk) {
    state.phase = 'bankrupt';
    state.runHistory.push(`爆仓：公开意图让 risk 达到 ${state.risk}/${state.maxRisk}。`);
  }
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
