import { STOCK_CARDS } from '../data/stockCards';
import { DRAW_COUNT, SELECTION_COUNT } from './constants';
import { createRng } from './rng';
import type { StockCard } from './types';

export interface DeckState {
  seed: string;
  deck: StockCard[];
  hand: StockCard[];
  discardPile: StockCard[];
  selectedCardIds: string[];
  reshuffleCount: number;
}

export function createStartingDeck(seed: string) {
  return createRng(seed).shuffle(STOCK_CARDS).slice(0, 20);
}

export function drawCards<TState extends DeckState>(
  state: TState,
  count: number = DRAW_COUNT
): TState {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('drawCards count must be a non-negative integer.');
  }

  let nextState = cloneDeckState(state);

  for (let drawnCount = 0; drawnCount < count; drawnCount += 1) {
    if (nextState.deck.length === 0) {
      nextState = reshuffleDiscardIntoDeck(nextState);
    }

    if (nextState.deck.length === 0) {
      break;
    }

    const [drawnCard, ...remainingDeck] = nextState.deck;
    nextState = {
      ...nextState,
      deck: remainingDeck,
      hand: [...nextState.hand, drawnCard]
    };
  }

  return nextState;
}

export function reshuffleDiscardIntoDeck<TState extends DeckState>(
  state: TState
): TState {
  if (state.deck.length > 0 || state.discardPile.length === 0) {
    return cloneDeckState(state);
  }

  const rng = createRng(`${state.seed}:reshuffle:${state.reshuffleCount}`);

  return {
    ...state,
    deck: rng.shuffle(state.discardPile),
    discardPile: [],
    reshuffleCount: state.reshuffleCount + 1
  };
}

export function selectCard<TState extends DeckState>(
  state: TState,
  cardId: string
): TState {
  if (state.selectedCardIds.includes(cardId)) {
    return cloneDeckState(state);
  }

  if (state.selectedCardIds.length >= SELECTION_COUNT) {
    return cloneDeckState(state);
  }

  if (!state.hand.some((card) => card.id === cardId)) {
    return cloneDeckState(state);
  }

  return {
    ...state,
    selectedCardIds: [...state.selectedCardIds, cardId]
  };
}

export function unselectCard<TState extends DeckState>(
  state: TState,
  cardId: string
): TState {
  if (!state.selectedCardIds.includes(cardId)) {
    return cloneDeckState(state);
  }

  return {
    ...state,
    selectedCardIds: state.selectedCardIds.filter((id) => id !== cardId)
  };
}

export function discardSelectedCards<TState extends DeckState>(
  state: TState
): TState {
  if (state.selectedCardIds.length === 0) {
    return cloneDeckState(state);
  }

  const selectedIds = new Set(state.selectedCardIds);
  const discardedCards = state.hand.filter((card) => selectedIds.has(card.id));
  const remainingHand = state.hand.filter((card) => !selectedIds.has(card.id));

  return {
    ...state,
    hand: remainingHand,
    discardPile: [...state.discardPile, ...discardedCards],
    selectedCardIds: []
  };
}

function cloneDeckState<TState extends DeckState>(state: TState): TState {
  return {
    ...state,
    deck: [...state.deck],
    hand: [...state.hand],
    discardPile: [...state.discardPile],
    selectedCardIds: [...state.selectedCardIds]
  };
}
