import {
  createCardEffectEvents,
  TEST_EVENT_CARDS,
  TEST_EVENT_TOOLS,
  type EventCard,
  type EventTool
} from './effects';
import { FORMAL_EVENT_CARDS, FORMAL_EVENT_TOOLS } from './formalContent';
import { getTurboturnMultiplier } from './combo';
import {
  createGameEvent,
  createInitialComboState,
  type ComboState,
  type GameEvent,
  type GameEventType
} from './events';
import { EventQueue } from './eventQueue';
import {
  createTestMarketPressure,
  type MarketPressure
} from './marketPressure';
import { type RewardOption } from './rewards';
import type { EventCardCost } from './types';

export type EventGamePhase = 'playing' | 'dayEnd' | 'reward' | 'postReward' | 'bankrupt';

export interface EventGameState {
  seed: string;
  day: number;
  hand: EventCard[];
  drawPile: EventCard[];
  discardPile: EventCard[];
  playedCardsThisTurn: EventCard[];
  ap: number;
  maxAp: number;
  actionPoints: number;
  maxActionPoints: number;
  baseMaxAp: number;
  risk: number;
  maxRisk: number;
  baseMaxRisk: number;
  profitMultiplier: number;
  nextProfitMultiplier: number;
  nextApBonus: number;
  nextMaxRiskPenalty: number;
  lockedProfit: number;
  hotSector: string;
  combo: ComboState;
  marketPressure: MarketPressure;
  marketPressureIndex: number;
  tools: EventTool[];
  phase: EventGamePhase;
  rewardChoices: RewardOption[];
  rewardsTakenCount: number;
  rewardRarityBonus: number;
  nextInitialCombo: number;
  lastPlayedCost: EventCardCost | null;
  turboturnStep: number;
  turboturnMultiplier: number;
  cardsDrawnThisTurn: number;
  fatigueCount: number;
  reshuffleCount: number;
  runHistory: string[];
  lastDayChoice: string | null;
  lastPlayedCard: EventCard | null;
  resolvedEventTypes: GameEventType[];
  toolUseCounts: Record<string, number>;
  triggeredComboMilestones: Record<string, number[]>;
  nextEventSeq: number;
  createEvent(input: {
    type: GameEventType;
    sourceId: string;
    sourceName: string;
    message: string;
    value?: number;
    meta?: Record<string, unknown>;
    depth?: number;
  }): GameEvent;
}

export function createTestEventGameState(
  overrides: Partial<Omit<EventGameState, 'createEvent'>> = {}
): EventGameState {
  const testHand = TEST_EVENT_CARDS.slice(0, 8);
  const testDrawPile = TEST_EVENT_CARDS.slice(8);
  const state: EventGameState = {
    seed: 'test-run',
    day: 1,
    hand: testHand,
    drawPile: testDrawPile,
    discardPile: [],
    playedCardsThisTurn: [],
    ap: 6,
    maxAp: 6,
    actionPoints: 6,
    maxActionPoints: 6,
    baseMaxAp: 6,
    risk: 0,
    maxRisk: 100,
    baseMaxRisk: 100,
    profitMultiplier: 1,
    nextProfitMultiplier: 1,
    nextApBonus: 0,
    nextMaxRiskPenalty: 0,
    lockedProfit: 0,
    hotSector: 'TECH',
    combo: createInitialComboState(),
    marketPressure: createTestMarketPressure(),
    marketPressureIndex: 0,
    tools: [...TEST_EVENT_TOOLS],
    phase: 'playing',
    rewardChoices: [] as RewardOption[],
    rewardsTakenCount: 0,
    rewardRarityBonus: 0,
    nextInitialCombo: 0,
    lastPlayedCost: null,
    turboturnStep: 0,
    turboturnMultiplier: 1,
    cardsDrawnThisTurn: 0,
    fatigueCount: 0,
    reshuffleCount: 0,
    runHistory: [],
    lastDayChoice: null,
    lastPlayedCard: null,
    resolvedEventTypes: [],
    toolUseCounts: {},
    triggeredComboMilestones: {},
    nextEventSeq: 0,
    createEvent(input) {
      this.nextEventSeq += 1;
      return createGameEvent({
        id: `event-${this.nextEventSeq}`,
        ...input
      });
    },
    ...overrides
  };

  return state;
}

export function createFormalEventGameState(
  overrides: Partial<Omit<EventGameState, 'createEvent'>> = {}
): EventGameState {
  const openingHandIds = [
    'formal-tech-002',
    'formal-tech-001',
    'formal-tech-003',
    'formal-finance-006',
    'formal-tech-005',
    'formal-tech-004',
    'formal-tech-006',
    'formal-consumer-001'
  ];
  const openingHand = openingHandIds
    .map((cardId) => FORMAL_EVENT_CARDS.find((card) => card.id === cardId))
    .filter((card): card is EventCard => Boolean(card));
  const openingHandIdSet = new Set(openingHandIds);

  return createTestEventGameState({
    seed: 'formal-run',
    hand: cloneCards(openingHand),
    drawPile: cloneCards(
      FORMAL_EVENT_CARDS.filter((card) => !openingHandIdSet.has(card.id))
    ),
    discardPile: [],
    tools: cloneTools(FORMAL_EVENT_TOOLS),
    marketPressureIndex: 0,
    ...overrides
  });
}

export function playCard(state: EventGameState, cardId: string): EventGameState {
  if (state.phase !== 'playing') {
    return state;
  }

  const card = state.hand.find((item) => item.id === cardId);

  if (!card || card.cost > state.actionPoints) {
    return state;
  }

  const nextState = cloneEventGameState(state);
  const previousCard = nextState.lastPlayedCard;
  nextState.hand = nextState.hand.filter((item) => item.id !== cardId);
  nextState.playedCardsThisTurn = [...nextState.playedCardsThisTurn, card];
  nextState.actionPoints = Math.max(0, nextState.actionPoints - card.cost);
  nextState.ap = nextState.actionPoints;

  const queue = new EventQueue();
  queue.enqueue(
    nextState.createEvent({
      type: 'CARD_PLAYED',
      sourceId: card.id,
      sourceName: card.name,
      message: `打出 ${card.name}。`,
      meta: {
        sector: card.sector,
        rank: card.rank,
        cost: card.cost,
        cardRole: card.cardRole
      }
    })
  );

  for (const event of createTurboturnEvents(nextState, card)) {
    queue.enqueue(event);
  }

  for (const event of createCardEffectEvents(card, nextState, { previousCard })) {
    queue.enqueue(event);
  }

  queue.resolveAll(nextState);
  nextState.lastPlayedCard = card;
  endTradeIfNoPlayableCards(nextState);

  return nextState;
}

function createTurboturnEvents(
  state: EventGameState,
  card: EventCard
): GameEvent[] {
  const previousCost = state.lastPlayedCost;
  const isOpeningZero = previousCost === null && card.cost === 0;
  const isRisingStep = previousCost !== null && card.cost === previousCost + 1;
  const isRestart = previousCost !== null && card.cost === 0;

  if (isOpeningZero || isRestart) {
    state.turboturnStep = 1;
  } else if (isRisingStep) {
    state.turboturnStep += 1;
  } else {
    state.turboturnStep = 0;
  }

  state.lastPlayedCost = card.cost;
  state.turboturnMultiplier = getTurboturnMultiplier(state.turboturnStep);

  const events: GameEvent[] = [];

  if (state.turboturnStep > 0) {
    events.push(
      state.createEvent({
        type: 'TURBOTURN_STEP',
        sourceId: card.id,
        sourceName: card.name,
        message: `${card.name} 推进 Turboturn：${state.turboturnStep} 段，收益 x${state.turboturnMultiplier.toFixed(2)}。`,
        value: state.turboturnStep,
        meta: {
          cost: card.cost,
          turboturnMultiplier: state.turboturnMultiplier
        }
      })
    );
  }

  if (state.turboturnStep >= 4 && card.cost === 3) {
    events.push(
      state.createEvent({
        type: 'TURBOTURN_COMPLETE',
        sourceId: card.id,
        sourceName: card.name,
        message: '完整 Turboturn：0 → 1 → 2 → 3 成立，combo +1 并抽 1 张牌。',
        value: state.turboturnStep
      }),
      state.createEvent({
        type: 'COMBO_GAINED',
        sourceId: card.id,
        sourceName: card.name,
        message: `${card.name} 完整 Turboturn 奖励：combo +1。`,
        value: 1
      }),
      state.createEvent({
        type: 'CARD_DRAWN',
        sourceId: card.id,
        sourceName: card.name,
        message: `${card.name} 完整 Turboturn 奖励：抽 1 张牌。`,
        value: 1
      })
    );
  }

  return events;
}

function endTradeIfNoPlayableCards(state: EventGameState) {
  if (state.phase !== 'playing') {
    return;
  }

  const hasAffordableCard = state.hand.some((card) => card.cost <= state.actionPoints);

  if (hasAffordableCard) {
    return;
  }

  state.phase = 'dayEnd';
  state.combo.eventLog.push('收盘整理：没有可打出的牌，自动结束当前交易。');
  state.runHistory.push('收盘整理：没有可打出的牌，结束交易。');
}

function cloneCards(cards: EventCard[]): EventCard[] {
  return cards.map((card) => ({
    ...card,
    tags: card.tags ? [...card.tags] : undefined,
    effects: card.effects.map((effect) => ({ ...effect }))
  }));
}

function cloneTools(tools: EventTool[]): EventTool[] {
  return tools.map((tool) => ({
    ...tool,
    triggerEvents: tool.triggerEvents ? [...tool.triggerEvents] : undefined,
    trigger: {
      ...tool.trigger,
      meta: tool.trigger.meta ? { ...tool.trigger.meta } : undefined,
      comboThresholds: tool.trigger.comboThresholds
        ? [...tool.trigger.comboThresholds]
        : undefined
    },
    effects: tool.effects.map((effect) => ({ ...effect }))
  }));
}

function cloneEventGameState(state: EventGameState): EventGameState {
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
