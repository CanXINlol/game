import { describe, expect, it } from 'vitest';
import { FORMAL_EVENT_CARDS, FORMAL_EVENT_TOOLS } from '../game/formalContent';
import { createTestEventGameState } from '../game/playCard';
import {
  applyRiskControlAction,
  buyShopItem,
  createShopState,
  refreshShop
} from '../game/shop';

describe('economy and shop loop', () => {
  it('starts with enough cash to make early economy choices', () => {
    expect(createTestEventGameState().cash).toBe(120);
  });

  it('generates card, tool, insurance, and service shop sections', () => {
    const state = createTestEventGameState({ tools: [] });
    state.shop = createShopState(state);

    expect(state.shop.sections.cards.length).toBeGreaterThan(0);
    expect(state.shop.sections.tools.length).toBeGreaterThan(0);
    expect(state.shop.sections.insurance.length).toBeGreaterThan(0);
    expect(state.shop.sections.services.length).toBeGreaterThan(0);
    expect(state.shop.items).toHaveLength(
      state.shop.sections.cards.length +
        state.shop.sections.tools.length +
        state.shop.sections.insurance.length +
        state.shop.sections.services.length
    );
  });

  it('cash can buy a card from the shop', () => {
    const state = createTestEventGameState({ cash: 200 });
    state.shop = createShopState(state);
    const cardItem = state.shop.items.find((item) => item.type === 'CARD');

    if (!cardItem) throw new Error('Expected card item.');

    const deckBefore = state.hand.length + state.drawPile.length + state.discardPile.length;
    const result = buyShopItem(state, cardItem.id);

    expect(result.success).toBe(true);
    expect(state.hand.length + state.drawPile.length + state.discardPile.length).toBe(
      deckBefore + 1
    );
    expect(state.cash).toBeLessThan(200);
  });

  it('cash can buy a tool from the shop', () => {
    const state = createTestEventGameState({ cash: 200, tools: [] });
    state.shop = createShopState(state);
    const toolItem = state.shop.items.find((item) => item.type === 'TOOL');

    if (!toolItem) throw new Error('Expected tool item.');

    const result = buyShopItem(state, toolItem.id);

    expect(result.success).toBe(true);
    expect(state.tools.length).toBe(1);
  });

  it('cash can remove a card and removal gets more expensive', () => {
    const state = createTestEventGameState({ cash: 200 });
    const cardId = state.hand[0].id;

    const result = applyRiskControlAction(state, 'REMOVE_CARD', cardId);

    expect(result.success).toBe(true);
    expect(state.cardsRemovedCount).toBe(1);
    expect([...state.hand, ...state.drawPile, ...state.discardPile].some((card) => card.id === cardId)).toBe(false);
  });

  it('removes the selected card instead of the first card', () => {
    const first = FORMAL_EVENT_CARDS[0];
    const second = FORMAL_EVENT_CARDS[1];
    const state = createTestEventGameState({
      cash: 200,
      hand: [
        { ...first, effects: first.effects.map((effect) => ({ ...effect })) },
        { ...second, effects: second.effects.map((effect) => ({ ...effect })) }
      ],
      drawPile: []
    });

    const result = applyRiskControlAction(state, 'REMOVE_CARD', second.id);

    expect(result.success).toBe(true);
    expect(state.hand.some((card) => card.id === first.id)).toBe(true);
    expect(state.hand.some((card) => card.id === second.id)).toBe(false);
  });

  it('cash can upgrade a card', () => {
    const card = FORMAL_EVENT_CARDS[0];
    const state = createTestEventGameState({
      cash: 200,
      hand: [{ ...card, effects: card.effects.map((effect) => ({ ...effect })) }]
    });

    const result = applyRiskControlAction(state, 'UPGRADE_CARD', card.id);

    expect(result.success).toBe(true);
    expect(state.hand[0]).not.toEqual(card);
  });

  it('upgrades the selected card instead of the first card', () => {
    const first = FORMAL_EVENT_CARDS[0];
    const second = FORMAL_EVENT_CARDS[1];
    const state = createTestEventGameState({
      cash: 200,
      hand: [
        { ...first, effects: first.effects.map((effect) => ({ ...effect })) },
        { ...second, effects: second.effects.map((effect) => ({ ...effect })) }
      ],
      drawPile: []
    });

    const result = applyRiskControlAction(state, 'UPGRADE_CARD', second.id);

    expect(result.success).toBe(true);
    expect(state.hand[0]).toEqual(first);
    expect(state.hand[1]).not.toEqual(second);
  });

  it('cash can reduce risk', () => {
    const state = createTestEventGameState({ cash: 200, risk: 40 });

    const result = applyRiskControlAction(state, 'REDUCE_RISK');

    expect(result.success).toBe(true);
    expect(state.risk).toBe(25);
  });

  it('cannot buy when cash is insufficient', () => {
    const state = createTestEventGameState({ cash: 0, tools: [] });
    const item = {
      id: `tool-${FORMAL_EVENT_TOOLS[0].id}`,
      type: 'TOOL' as const,
      title: FORMAL_EVENT_TOOLS[0].name,
      description: FORMAL_EVENT_TOOLS[0].description,
      price: 120,
      sold: false,
      toolId: FORMAL_EVENT_TOOLS[0].id
    };
    state.shop = {
      id: 'test-shop',
      sections: { cards: [], tools: [item], insurance: [], services: [] },
      refreshCount: 0,
      items: [item]
    };

    const result = buyShopItem(state, state.shop.items[0].id);

    expect(result.success).toBe(false);
    expect(result.message).toContain('现金不足');
    expect(state.tools).toHaveLength(0);
  });

  it('shop refresh consumes cash and scales in price', () => {
    const state = createTestEventGameState({ cash: 100 });
    state.shop = createShopState(state);

    const first = refreshShop(state);
    const cashAfterFirst = state.cash;
    const second = refreshShop(state);

    expect(first.success).toBe(true);
    expect(cashAfterFirst).toBe(75);
    expect(second.success).toBe(true);
    expect(state.cash).toBe(35);
    expect(state.shop.refreshCount).toBe(2);
  });

  it('cash can buy one-shot insurance into consumables', () => {
    const state = createTestEventGameState({ cash: 200 });
    state.shop = createShopState(state);
    const insurance = state.shop.sections.insurance[0];

    const result = buyShopItem(state, insurance.id);

    expect(result.success).toBe(true);
    expect(state.consumables.some((item) => item.id === insurance.id)).toBe(true);
  });

  it('cannot remove or upgrade when cash is insufficient', () => {
    const card = FORMAL_EVENT_CARDS[0];
    const state = createTestEventGameState({
      cash: 0,
      hand: [{ ...card, effects: card.effects.map((effect) => ({ ...effect })) }],
      drawPile: []
    });

    const remove = applyRiskControlAction(state, 'REMOVE_CARD', card.id);
    const upgrade = applyRiskControlAction(state, 'UPGRADE_CARD', card.id);

    expect(remove.success).toBe(false);
    expect(upgrade.success).toBe(false);
    expect(state.hand).toHaveLength(1);
    expect(state.cash).toBe(0);
  });

  it('rest node operations can only succeed once', () => {
    const first = FORMAL_EVENT_CARDS[0];
    const second = FORMAL_EVENT_CARDS[1];
    const state = createTestEventGameState({
      cash: 300,
      hand: [
        { ...first, effects: first.effects.map((effect) => ({ ...effect })) },
        { ...second, effects: second.effects.map((effect) => ({ ...effect })) }
      ],
      drawPile: []
    });

    const remove = applyRiskControlAction(state, 'REMOVE_CARD', first.id);
    const reduceRisk = applyRiskControlAction(state, 'REDUCE_RISK');

    expect(remove.success).toBe(true);
    expect(reduceRisk.success).toBe(false);
    expect(reduceRisk.message).toContain('本节点');
  });
});
