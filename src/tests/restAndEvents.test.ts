import { describe, expect, it } from 'vitest';
import { FORMAL_EVENT_CARDS } from '../game/formalContent';
import { createTestEventGameState } from '../game/playCard';
import { applyRestChoice, REST_CHOICES } from '../game/restSite';
import {
  applyRouteEventChoice,
  getRouteEvent,
  getRouteEventDefinitions
} from '../game/routeEvents';
import { completeCurrentRouteNode } from '../game/routeMap';

describe('rest sites and route events', () => {
  it('rest site offers exactly three clear choices', () => {
    expect(REST_CHOICES).toHaveLength(3);
    expect(REST_CHOICES.every((choice) => choice.description && choice.costText && choice.rewardText)).toBe(true);
  });

  it('rest site can only choose one option', () => {
    const card = FORMAL_EVENT_CARDS[0];
    const state = createTestEventGameState({
      cash: 100,
      hand: [{ ...card, effects: card.effects.map((effect) => ({ ...effect })) }],
      drawPile: []
    });

    const first = applyRestChoice(state, 'REDUCE_RISK');
    const second = applyRestChoice(state, 'REMOVE_CARD', card.id);

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.message).toContain('已经选择');
  });

  it('rest site blocks paid card removal when cash is insufficient', () => {
    const card = FORMAL_EVENT_CARDS[0];
    const state = createTestEventGameState({
      cash: 0,
      hand: [{ ...card, effects: card.effects.map((effect) => ({ ...effect })) }],
      drawPile: []
    });

    const result = applyRestChoice(state, 'REMOVE_CARD', card.id);

    expect(result.success).toBe(false);
    expect(result.message).toContain('现金不足');
    expect(state.hand).toHaveLength(1);
  });

  it('every event choice declares cost and reward text', () => {
    const events = getRouteEventDefinitions();
    const eventNames = events.map((event) => event.title);

    expect(events.length).toBeGreaterThan(0);
    expect(eventNames).toEqual(
      expect.arrayContaining([
        '午夜传闻',
        '风控电话',
        '无人认领的研报',
        '过期利好',
        '黑屏三分钟',
        '老股民的茶杯',
        '保险柜里的红字'
      ])
    );
    for (const event of events) {
      expect(event.title).toBeTruthy();
      expect(event.description).toBeTruthy();
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      expect(event.choices.length).toBeLessThanOrEqual(3);
      expect(event.choices.every((choice) => choice.costText && choice.rewardText)).toBe(true);
    }
  });

  it('event choice applies result and then the node can end', () => {
    const state = createEventState('midnight-rumor', { cash: 20, risk: 10 });
    const event = getRouteEvent(state);

    const result = applyRouteEventChoice(state, event.choices[0].id);
    completeCurrentRouteNode(state);

    expect(result.success).toBe(true);
    expect(state.nodeActionUsed).toBe(true);
    expect(state.phase).toBe('ROUTE_SELECT');
    expect(state.routeMap.currentNodeId).toBeNull();
  });

  it('event choices expose disabled reasons when cash is insufficient', () => {
    const state = createEventState('risk-call', { cash: 0 });
    const event = getRouteEvent(state);
    const payMargin = event.choices.find((choice) => choice.id === 'pay-margin');

    expect(payMargin?.disabledReason).toContain('现金不足');
  });
});

function createEventState(
  eventId: string,
  overrides: Parameters<typeof createTestEventGameState>[0] = {}
) {
  for (let index = 0; index < 50; index += 1) {
    const state = createTestEventGameState({
      seed: `event-seed-${index}`,
      phase: 'DAY_END',
      ...overrides
    });
    const eventNode = state.routeMap.acts
      .flatMap((act) => act.nodes)
      .find((node) => node.type === 'EVENT');

    if (!eventNode) continue;

    state.routeMap.currentNodeId = eventNode.id;

    if (getRouteEvent(state).id === eventId) {
      return state;
    }
  }

  throw new Error(`Expected event ${eventId}.`);
}
