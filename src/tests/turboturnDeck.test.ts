import { describe, expect, it } from 'vitest';
import { drawFromContinuousDeck } from '../game/deck';
import { TEST_EVENT_CARDS, type EventCard } from '../game/effects';
import { FORMAL_EVENT_CARDS } from '../game/formalContent';
import {
  createFormalEventGameState,
  createTestEventGameState,
  playCard
} from '../game/playCard';

describe('continuous deck and Turboturn rules', () => {
  it('reshuffles discardPile into drawPile when drawing from an empty drawPile', () => {
    const card = getTestCard('test-card-short-cover');
    const state = createTestEventGameState({
      hand: [],
      drawPile: [],
      discardPile: [card],
      playedCardsThisTurn: []
    });

    const nextState = drawFromContinuousDeck(state, 1);

    expect(nextState.hand).toHaveLength(1);
    expect(nextState.hand[0].id).toBe(card.id);
    expect(nextState.drawPile).toHaveLength(0);
    expect(nextState.discardPile).toHaveLength(0);
    expect(nextState.reshuffleCount).toBe(1);
  });

  it('does not reshuffle playedCardsThisTurn during the same turn', () => {
    const card = getTestCard('test-card-short-cover');
    const state = createTestEventGameState({
      hand: [],
      drawPile: [],
      discardPile: [],
      playedCardsThisTurn: [card]
    });

    const nextState = drawFromContinuousDeck(state, 1);

    expect(nextState.hand).toHaveLength(0);
    expect(nextState.playedCardsThisTurn).toHaveLength(1);
    expect(nextState.reshuffleCount).toBe(0);
  });

  it('does not crash when no cards can be drawn or played', () => {
    const state = createTestEventGameState({
      hand: [getTestCard('test-card-cash-insurance')],
      drawPile: [],
      discardPile: [],
      playedCardsThisTurn: [],
      tools: []
    });

    const drawnState = drawFromContinuousDeck(state, 1);
    const playedState = playCard(drawnState, 'test-card-cash-insurance');

    expect(drawnState.hand).toHaveLength(1);
    expect(playedState.phase).toBe('dayEnd');
    expect(playedState.combo.eventLog.join('\n')).toContain('收盘整理');
  });

  it('increases turboturnStep when costs rise by one', () => {
    const state = createFormalSequenceState(['formal-tech-002', 'formal-tech-001']);

    const firstState = playCard(state, 'formal-tech-002');
    const secondState = playCard(firstState, 'formal-tech-001');

    expect(firstState.turboturnStep).toBe(1);
    expect(secondState.turboturnStep).toBe(2);
    expect(secondState.turboturnMultiplier).toBe(1.3);
  });

  it('completes Turboturn on a 0 to 1 to 2 to 3 sequence', () => {
    const state = createFormalSequenceState([
      'formal-tech-002',
      'formal-tech-001',
      'formal-tech-003',
      'formal-finance-006'
    ]);

    const firstState = playCard(state, 'formal-tech-002');
    const secondState = playCard(firstState, 'formal-tech-001');
    const thirdState = playCard(secondState, 'formal-tech-003');
    const finalState = playCard(thirdState, 'formal-finance-006');

    expect(finalState.turboturnStep).toBe(4);
    expect(finalState.turboturnMultiplier).toBe(1.6);
    expect(finalState.resolvedEventTypes).toContain('TURBOTURN_COMPLETE');
    expect(finalState.resolvedEventTypes).toContain('COMBO_GAINED');
  });

  it('resets turboturnStep when the cost sequence breaks', () => {
    const state = createFormalSequenceState(['formal-tech-002', 'formal-tech-003']);

    const firstState = playCard(state, 'formal-tech-002');
    const secondState = playCard(firstState, 'formal-tech-003');

    expect(firstState.turboturnStep).toBe(1);
    expect(secondState.turboturnStep).toBe(0);
    expect(secondState.turboturnMultiplier).toBe(1);
  });

  it('applies Turboturn to profit and combo payoff', () => {
    const state = createFormalSequenceState(['formal-tech-002']);
    const card = getFormalCard('formal-tech-002');

    const nextState = playCard(state, card.id);

    expect(nextState.combo.currentChainProfit).toBeGreaterThan(card.baseReturn ?? 0);
    expect(nextState.resolvedEventTypes).toContain('TURBOTURN_STEP');
  });
});

function createFormalSequenceState(cardIds: string[]) {
  const hand = cardIds.map(getFormalCard);

  return createFormalEventGameState({
    hand,
    drawPile: [],
    discardPile: [],
    playedCardsThisTurn: [],
    tools: []
  });
}

function getFormalCard(cardId: string): EventCard {
  const card = FORMAL_EVENT_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error(`Missing formal card ${cardId}`);
  }

  return { ...card, effects: card.effects.map((effect) => ({ ...effect })) };
}

function getTestCard(cardId: string): EventCard {
  const card = TEST_EVENT_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error(`Missing test card ${cardId}`);
  }

  return { ...card, effects: card.effects.map((effect) => ({ ...effect })) };
}
