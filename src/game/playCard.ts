import {
  createCardEffectEvents,
  TEST_EVENT_CARDS,
  TEST_EVENT_TOOLS,
  type EventCard,
  type EventTool
} from './effects';
import { getTurboturnMultiplier } from './combo';
import { createTraderRunConfig } from './traders';
import {
  createGameEvent,
  createInitialComboState,
  type ComboState,
  type GameEvent,
  type GameEventType
} from './events';
import {
  aggregateChainSummary,
  type CashTransaction,
  type ChainSummary
} from './feedback';
import { EventQueue } from './eventQueue';
import {
  createTestMarketPressure,
  type MarketPressure
} from './marketPressure';
import { type RewardOption } from './rewards';
import { createRouteMap, type RouteMapState } from './routeMap';
import type { ShopState } from './shop';
import type { EventCardCost } from './types';

export type GamePhase =
  | 'ROUTE_SELECT'
  | 'ENCOUNTER_START'
  | 'PLAYER_TURN'
  | 'RESOLVING_QUEUE'
  | 'ENEMY_INTENT'
  | 'REWARD'
  | 'SHOP'
  | 'REST'
  | 'DAY_END'
  | 'RUN_WON'
  | 'RUN_LOST';

export type EventGamePhase = GamePhase;

export type EncounterStatus = 'ACTIVE' | 'CLEARED' | 'LOST';

export interface ConsumableInsurance {
  id: string;
  name: string;
  description: string;
}

export interface EventGameState {
  seed: string;
  traderId: string | null;
  traderName: string | null;
  traderTitle: string | null;
  traderPassive: string | null;
  traderRewardBias: string | null;
  traderDifficulty: string | null;
  servicePriceMultiplier: number;
  traderPassiveUsesThisTurn: Record<string, number>;
  day: number;
  hand: EventCard[];
  drawPile: EventCard[];
  discardPile: EventCard[];
  playedCardsThisTurn: EventCard[];
  removedCards: EventCard[];
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
  cash: number;
  lockedProfit: number;
  cardsPurchasedCount: number;
  toolsPurchasedCount: number;
  cardsRemovedCount: number;
  shopVisitCount: number;
  nodeActionUsed: boolean;
  shopRefreshUsed: boolean;
  hasBossInsurance: boolean;
  bossInsuranceUsed: boolean;
  consumables: ConsumableInsurance[];
  hotSector: string;
  combo: ComboState;
  marketPressure: MarketPressure;
  marketPressureIndex: number;
  tools: EventTool[];
  phase: EventGamePhase;
  currentTurn: number;
  intentResolvedThisTurn: boolean;
  currentIntentId: string;
  lastResolvedIntentId: string | null;
  canResolveIntent: boolean;
  encounterStatus: EncounterStatus;
  routeMap: RouteMapState;
  shop: ShopState;
  rewardChoices: RewardOption[];
  rewardsTakenCount: number;
  rewardRarityBonus: number;
  nextInitialCombo: number;
  encounterTurn: number;
  intentProfitMultiplier: number;
  intentRiskMultiplier: number;
  weakenedSector: string | null;
  lastPlayedCost: EventCardCost | null;
  turboturnStep: number;
  turboturnMultiplier: number;
  cardsDrawnThisTurn: number;
  fatigueCount: number;
  reshuffleCount: number;
  runHistory: string[];
  lastDayChoice: string | null;
  lastPlayedCard: EventCard | null;
  lastTurnSummary: string | null;
  resolvedEventTypes: GameEventType[];
  resolvedEventsThisAction: GameEvent[];
  cashTransactions: CashTransaction[];
  cashTransactionsThisAction: CashTransaction[];
  lastChainSummary: ChainSummary;
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
    traderId: null,
    traderName: null,
    traderTitle: null,
    traderPassive: null,
    traderRewardBias: null,
    traderDifficulty: null,
    servicePriceMultiplier: 1,
    traderPassiveUsesThisTurn: {},
    day: 1,
    hand: testHand,
    drawPile: testDrawPile,
    discardPile: [],
    playedCardsThisTurn: [],
    removedCards: [],
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
    cash: 120,
    lockedProfit: 0,
    cardsPurchasedCount: 0,
    toolsPurchasedCount: 0,
    cardsRemovedCount: 0,
    shopVisitCount: 0,
    nodeActionUsed: false,
    shopRefreshUsed: false,
    hasBossInsurance: false,
    bossInsuranceUsed: false,
    consumables: [],
    hotSector: 'TECH',
    combo: createInitialComboState(),
    marketPressure: createTestMarketPressure(),
    marketPressureIndex: 0,
    tools: [...TEST_EVENT_TOOLS],
    phase: 'PLAYER_TURN',
    currentTurn: 1,
    intentResolvedThisTurn: false,
    currentIntentId: createTestMarketPressure().intent.id,
    lastResolvedIntentId: null,
    canResolveIntent: false,
    encounterStatus: 'ACTIVE',
    routeMap: createRouteMap('test-run'),
    shop: {
      id: 'empty-shop',
      sections: { cards: [], tools: [], insurance: [], services: [] },
      items: [],
      refreshCount: 0
    },
    rewardChoices: [] as RewardOption[],
    rewardsTakenCount: 0,
    rewardRarityBonus: 0,
    nextInitialCombo: 0,
    encounterTurn: 0,
    intentProfitMultiplier: 1,
    intentRiskMultiplier: 1,
    weakenedSector: null,
    lastPlayedCost: null,
    turboturnStep: 0,
    turboturnMultiplier: 1,
    cardsDrawnThisTurn: 0,
    fatigueCount: 0,
    reshuffleCount: 0,
    runHistory: [],
    lastDayChoice: null,
    lastPlayedCard: null,
    lastTurnSummary: null,
    resolvedEventTypes: [],
    resolvedEventsThisAction: [],
    cashTransactions: [],
    cashTransactionsThisAction: [],
    lastChainSummary: aggregateChainSummary([]),
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

  if (overrides.currentIntentId === undefined) {
    state.currentIntentId = state.marketPressure.intent.id;
  }

  if (overrides.routeMap === undefined) {
    state.routeMap = createRouteMap(state.seed);
  }

  return state;
}

export function createFormalEventGameState(
  overrides: Partial<Omit<EventGameState, 'createEvent'>> = {},
  traderId = overrides.traderId ?? 'old-hand'
): EventGameState {
  const traderConfig = createTraderRunConfig(traderId ?? 'old-hand');
  const maxRisk = 100 + traderConfig.maxRiskModifier;

  return createTestEventGameState({
    seed: 'formal-run',
    traderId: traderConfig.trader.id,
    traderName: traderConfig.trader.name,
    traderTitle: traderConfig.trader.title,
    traderPassive: traderConfig.trader.passive,
    traderRewardBias: traderConfig.trader.rewardBias,
    traderDifficulty: traderConfig.trader.difficulty,
    servicePriceMultiplier: traderConfig.servicePriceMultiplier,
    hand: cloneCards(traderConfig.deck.slice(0, 5)),
    drawPile: cloneCards(traderConfig.deck.slice(5)),
    discardPile: [],
    removedCards: [],
    tools: cloneTools(traderConfig.tools),
    cash: traderConfig.cash,
    maxRisk,
    baseMaxRisk: maxRisk,
    marketPressureIndex: 0,
    encounterTurn: 0,
    ...overrides
  });
}

export function playCard(state: EventGameState, cardId: string): EventGameState {
  if (state.phase !== 'PLAYER_TURN') {
    return state;
  }

  const card = state.hand.find((item) => item.id === cardId);

  if (!card || card.cost > state.actionPoints) {
    return state;
  }

  const nextState = cloneEventGameState(state);
  nextState.resolvedEventsThisAction = [];
  nextState.cashTransactionsThisAction = [];
  const previousCard = nextState.lastPlayedCard;
  nextState.hand = nextState.hand.filter((item) => item.id !== cardId);
  nextState.playedCardsThisTurn = [...nextState.playedCardsThisTurn, card];
  nextState.actionPoints = Math.max(0, nextState.actionPoints - card.cost);
  nextState.ap = nextState.actionPoints;

  const queue = new EventQueue();
  nextState.phase = 'RESOLVING_QUEUE';
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
  nextState.lastChainSummary = aggregateChainSummary(
    nextState.resolvedEventsThisAction,
    nextState.cashTransactionsThisAction
  );
  if (nextState.phase === 'RESOLVING_QUEUE') {
    nextState.phase = 'PLAYER_TURN';
  }
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
  if (state.phase !== 'PLAYER_TURN') {
    return;
  }

  const hasAffordableCard = state.hand.some((card) => card.cost <= state.actionPoints);

  if (hasAffordableCard) {
    return;
  }

  state.phase = 'ENEMY_INTENT';
  state.canResolveIntent = true;
  state.intentResolvedThisTurn = false;
  state.combo.eventLog.push('没有可打出的牌，进入敌方意图结算。');
  state.runHistory.push('没有可打出的牌，进入敌方意图结算。');
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
    removedCards: [...state.removedCards],
    traderPassiveUsesThisTurn: { ...state.traderPassiveUsesThisTurn },
    combo: {
      ...state.combo,
      eventLog: [...state.combo.eventLog]
    },
    marketPressure: { ...state.marketPressure },
    routeMap: cloneRouteMap(state.routeMap),
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
    lastChainSummary: { ...state.lastChainSummary, keyEvents: [...state.lastChainSummary.keyEvents] },
    toolUseCounts: { ...state.toolUseCounts },
    triggeredComboMilestones: Object.fromEntries(
      Object.entries(state.triggeredComboMilestones).map(([toolId, thresholds]) => [
        toolId,
        [...thresholds]
      ])
    )
  };
}

function cloneRouteMap(routeMap: RouteMapState): RouteMapState {
  return {
    ...routeMap,
    acts: routeMap.acts.map((act) => ({
      ...act,
      nodes: act.nodes.map((node) => ({
        ...node,
        nextNodeIds: [...node.nextNodeIds]
      }))
    })),
    completedNodeIds: [...routeMap.completedNodeIds],
    availableNodeIds: [...routeMap.availableNodeIds]
  };
}
