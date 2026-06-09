import { describe, expect, it } from 'vitest';
import { STOCK_CARDS } from '../data/stockCards';
import {
  createStartingDeck,
  discardSelectedCards,
  drawCards,
  reshuffleDiscardIntoDeck,
  selectCard,
  unselectCard,
  type DeckState
} from '../game/deck';

function createState(overrides: Partial<DeckState> = {}): DeckState {
  return {
    seed: 'deck-test',
    deck: STOCK_CARDS.slice(0, 12),
    hand: [],
    discardPile: [],
    selectedCardIds: [],
    reshuffleCount: 0,
    ...overrides
  };
}

describe('deck system', () => {
  it('creates a deterministic 20-card starting deck', () => {
    const firstDeck = createStartingDeck('same-seed');
    const secondDeck = createStartingDeck('same-seed');

    expect(firstDeck).toHaveLength(20);
    expect(firstDeck.map((card) => card.id)).toEqual(
      secondDeck.map((card) => card.id)
    );
  });

  it('draws cards without mutating the original state', () => {
    const state = createState();
    const nextState = drawCards(state, 8);

    expect(nextState.hand).toHaveLength(8);
    expect(nextState.deck).toHaveLength(4);
    expect(state.hand).toHaveLength(0);
    expect(state.deck).toHaveLength(12);
  });

  it('selects cards up to 5 and prevents duplicate selections', () => {
    const state = createState({ hand: STOCK_CARDS.slice(0, 6), deck: [] });
    const selected = state.hand
      .slice(0, 6)
      .reduce((currentState, card) => selectCard(currentState, card.id), state);
    const duplicate = selectCard(selected, state.hand[0].id);

    expect(selected.selectedCardIds).toHaveLength(5);
    expect(new Set(selected.selectedCardIds).size).toBe(5);
    expect(duplicate.selectedCardIds).toEqual(selected.selectedCardIds);
  });

  it('unselects a selected card', () => {
    const state = createState({
      hand: STOCK_CARDS.slice(0, 2),
      selectedCardIds: [STOCK_CARDS[0].id, STOCK_CARDS[1].id]
    });
    const nextState = unselectCard(state, STOCK_CARDS[0].id);

    expect(nextState.selectedCardIds).toEqual([STOCK_CARDS[1].id]);
    expect(state.selectedCardIds).toEqual([
      STOCK_CARDS[0].id,
      STOCK_CARDS[1].id
    ]);
  });

  it('discards selected cards and clears the selection', () => {
    const selectedCards = STOCK_CARDS.slice(0, 2);
    const state = createState({
      hand: STOCK_CARDS.slice(0, 4),
      selectedCardIds: selectedCards.map((card) => card.id)
    });
    const nextState = discardSelectedCards(state);

    expect(nextState.hand.map((card) => card.id)).toEqual(
      STOCK_CARDS.slice(2, 4).map((card) => card.id)
    );
    expect(nextState.discardPile.map((card) => card.id)).toEqual(
      selectedCards.map((card) => card.id)
    );
    expect(nextState.selectedCardIds).toEqual([]);
  });

  it('reshuffles the discard pile into the deck when the deck is empty', () => {
    const discardPile = STOCK_CARDS.slice(0, 5);
    const state = createState({
      deck: [],
      hand: [],
      discardPile,
      reshuffleCount: 0
    });

    const shuffled = reshuffleDiscardIntoDeck(state);
    const drawn = drawCards(state, 3);

    expect(shuffled.deck).toHaveLength(5);
    expect(shuffled.discardPile).toHaveLength(0);
    expect(shuffled.reshuffleCount).toBe(1);
    expect(drawn.hand).toHaveLength(3);
    expect(drawn.deck).toHaveLength(2);
    expect(drawn.discardPile).toHaveLength(0);
  });
});
