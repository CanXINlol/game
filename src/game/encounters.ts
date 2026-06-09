import { discardContinuousTurn, drawFromContinuousDeck } from './deck';
import { spendCash } from './economy';
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
  id: string;
  type: MarketIntentType;
  label: string;
  description: string;
  value?: number;
  sector?: string;
}

const EVENT_HAND_SIZE = 5;
const INTENT_SEQUENCE: Array<Omit<MarketIntent, 'id'>> = [
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

  return {
    ...intent,
    id: `${intent.type}-${seedOffset + index}`
  };
}

export function enterEnemyIntentPhase(state: EventGameState): EventGameState {
  if (state.phase !== 'PLAYER_TURN') {
    return state;
  }

  if (state.marketPressure.hp <= 0) {
    state.phase = 'REWARD';
    state.encounterStatus = 'CLEARED';
    return state;
  }

  state.phase = 'ENEMY_INTENT';
  state.canResolveIntent = true;
  state.intentResolvedThisTurn = false;
  state.currentIntentId = state.marketPressure.intent.id;
  state.combo.eventLog.push(`玩家回合结束：等待结算 ${state.marketPressure.intent.label}。`);
  return state;
}

export function endEncounterTurn(state: EventGameState): EventGameState {
  if (state.phase !== 'PLAYER_TURN') {
    return state;
  }

  enterEnemyIntentPhase(state);
  return settleEncounterTurn(state);
}

export function getEndTurnPreview(state: EventGameState) {
  const intent = state.marketPressure.intent;
  const handDiscardCount = state.hand.filter((card) => !card.retain).length;
  const riskDelta = intent.type === 'RISK_ATTACK' ? intent.value ?? 0 : 0;
  const willDanger = state.risk + riskDelta >= state.maxRisk;
  const noiseText =
    intent.type === 'SUMMON_NOISE'
      ? `，并加入 ${intent.value ?? 1} 张市场噪音`
      : '';

  return `结束回合：${intent.label}将${riskDelta > 0 ? `使风险 +${riskDelta}` : '结算当前效果'}${noiseText}。${willDanger ? '将触发危险阈值。' : ''}当前 ${handDiscardCount} 张手牌将弃置。`;
}

export function settleEncounterTurn(state: EventGameState): EventGameState {
  if (
    state.phase !== 'ENEMY_INTENT' ||
    !state.canResolveIntent ||
    state.intentResolvedThisTurn ||
    state.lastResolvedIntentId === state.currentIntentId
  ) {
    state.combo.eventLog.push('本回合意图已结算。');
    return state;
  }

  if (state.marketPressure.hp <= 0) {
    state.phase = 'REWARD';
    state.encounterStatus = 'CLEARED';
    state.canResolveIntent = false;
    state.intentResolvedThisTurn = true;
    return state;
  }

  const intent = state.marketPressure.intent;
  const riskBefore = state.risk;
  const discardedHandCount = state.hand.filter((card) => !card.retain).length;
  state.combo.eventLog.push(`公开意图结算：${intent.label}。${intent.description}`);
  state.canResolveIntent = false;
  state.intentResolvedThisTurn = true;
  state.lastResolvedIntentId = intent.id;

  resetIntentModifiers(state);
  const isBankrupt = applyIntentBeforeDraw(state, intent);

  if (isBankrupt) {
    state.encounterStatus = 'LOST';
    state.lastTurnSummary = `${intent.label}造成风险变化 +${roundToTwoDecimals(
      state.risk - riskBefore
    )}，本局失败。`;
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
  const cardsDrawn = state.cardsDrawnThisTurn;
  applyIntentAfterDraw(state, intent);

  state.encounterTurn += 1;
  state.currentTurn += 1;
  state.marketPressure = {
    ...state.marketPressure,
    intent: createMarketIntent(
      state.seed,
      state.marketPressureIndex + state.encounterTurn
    )
  };
  state.currentIntentId = state.marketPressure.intent.id;
  state.intentResolvedThisTurn = false;
  state.phase = 'PLAYER_TURN';
  state.lastTurnSummary = `${intent.label}已结算：风险变化 ${formatDelta(
    roundToTwoDecimals(state.risk - riskBefore)
    )}，弃置 ${discardedHandCount} 张手牌，抽 ${cardsDrawn} 张牌。下一意图：${state.marketPressure.intent.label}。`;
  state.combo.eventLog.push(state.lastTurnSummary);

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

  return state.phase === 'RUN_LOST';
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
    if (consumeLiquidationBufferFromIntent(state)) {
      return;
    }

    if (consumeBossInsuranceFromIntent(state)) {
      return;
    }

    state.phase = 'RUN_LOST';
    state.encounterStatus = 'LOST';
    state.runHistory.push(`爆仓：公开意图让 risk 达到 ${state.risk}/${state.maxRisk}。`);
  }
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function consumeBossInsuranceFromIntent(state: EventGameState) {
  const node = state.routeMap.currentNodeId
    ? state.routeMap.acts
        .flatMap((act) => act.nodes)
        .find((routeNode) => routeNode.id === state.routeMap.currentNodeId)
    : null;

  if (node?.type !== 'BOSS' || !state.hasBossInsurance || state.bossInsuranceUsed) {
    return false;
  }

  state.hasBossInsurance = false;
  state.bossInsuranceUsed = true;
  state.risk = Math.max(0, state.maxRisk - 25);
  state.combo = {
    ...state.combo,
    currentChainProfit: Math.round(state.combo.currentChainProfit * 0.5 * 100) / 100
  };

  if (state.cash > 0) {
    spendCash(state, Math.min(50, state.cash), 'Boss 保险理赔手续费');
  }

  state.phase = 'ENEMY_INTENT';
  state.encounterStatus = 'ACTIVE';
  state.combo.eventLog.push('Boss 保险触发：避免爆仓，风险降至安全线以下。');
  state.runHistory.push('Boss 保险触发：避免 Boss 战爆仓。');
  return true;
}

function consumeLiquidationBufferFromIntent(state: EventGameState) {
  const buffer = state.consumables.find(
    (item) => item.id === 'insurance-liquidation-buffer'
  );

  if (!buffer) return false;

  state.consumables = state.consumables.filter((item) => item.id !== buffer.id);
  state.hasBossInsurance = false;
  state.bossInsuranceUsed = true;
  state.risk = Math.max(0, state.maxRisk - 10);
  state.phase = 'ENEMY_INTENT';
  state.encounterStatus = 'ACTIVE';
  state.combo.eventLog.push('爆仓缓冲触发：risk 降到安全线。');
  return true;
}
