import {
  createCardEffectEvents,
  TEST_EVENT_CARDS,
  TEST_EVENT_TOOLS,
  type EventCard,
  type EventTool
} from './effects';
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

export type EventGamePhase = 'playing' | 'dayEnd' | 'reward' | 'postReward' | 'bankrupt';

export interface EventGameState {
  seed: string;
  hand: EventCard[];
  drawPile: EventCard[];
  playedCardsThisTurn: EventCard[];
  ap: number;
  maxAp: number;
  risk: number;
  maxRisk: number;
  lockedProfit: number;
  hotSector: string;
  combo: ComboState;
  marketPressure: MarketPressure;
  marketPressureIndex: number;
  tools: EventTool[];
  phase: EventGamePhase;
  rewardChoices: RewardOption[];
  rewardsTakenCount: number;
  nextInitialCombo: number;
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
    hand: testHand,
    drawPile: testDrawPile,
    playedCardsThisTurn: [],
    ap: 6,
    maxAp: 6,
    risk: 0,
    maxRisk: 100,
    lockedProfit: 0,
    hotSector: 'TECH',
    combo: createInitialComboState(),
    marketPressure: createTestMarketPressure(),
    marketPressureIndex: 0,
    tools: [...TEST_EVENT_TOOLS],
    phase: 'playing',
    rewardChoices: [] as RewardOption[],
    rewardsTakenCount: 0,
    nextInitialCombo: 0,
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

export function playCard(state: EventGameState, cardId: string): EventGameState {
  if (state.phase !== 'playing' || state.ap <= 0) {
    return state;
  }

  const card = state.hand.find((item) => item.id === cardId);

  if (!card) {
    return state;
  }

  const nextState = cloneEventGameState(state);
  const previousCard = nextState.lastPlayedCard;
  nextState.hand = nextState.hand.filter((item) => item.id !== cardId);
  nextState.playedCardsThisTurn = [...nextState.playedCardsThisTurn, card];

  const queue = new EventQueue();
  queue.enqueue(
    nextState.createEvent({
      type: 'CARD_PLAYED',
      sourceId: card.id,
      sourceName: card.name,
      message: `打出 ${card.name}。`,
      meta: { sector: card.sector, rank: card.rank }
    })
  );

  for (const event of createCardEffectEvents(card, nextState, { previousCard })) {
    queue.enqueue(event);
  }

  queue.resolveAll(nextState);
  nextState.ap = Math.max(0, nextState.ap - 1);
  nextState.lastPlayedCard = card;

  return nextState;
}

function cloneEventGameState(state: EventGameState): EventGameState {
  return {
    ...state,
    hand: [...state.hand],
    drawPile: [...state.drawPile],
    playedCardsThisTurn: [...state.playedCardsThisTurn],
    combo: {
      ...state.combo,
      eventLog: [...state.combo.eventLog]
    },
    marketPressure: { ...state.marketPressure },
    tools: [...state.tools],
    rewardChoices: [...state.rewardChoices],
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
