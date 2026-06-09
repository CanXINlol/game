import { describe, expect, it } from 'vitest';
import { TRADERS } from '../data/traders';
import { ECONOMY_PRICES, getRemoveCardCost } from '../game/economy';
import type { GameEvent } from '../game/events';
import { createFormalEventGameState } from '../game/playCard';
import {
  createTraderRunConfig,
  getCashOutRatioWithTrader,
  getTraderProfitMultiplier,
  getTraderRiskMultiplier,
  getTraderServicePriceMultiplier
} from '../game/traders';

function profitEvent(meta: GameEvent['meta']): GameEvent {
  return {
    id: 'test-event',
    type: 'PROFIT_GAINED',
    sourceId: 'test-card',
    sourceName: 'test card',
    message: 'test',
    value: 10,
    meta,
    depth: 0
  };
}

describe('trader system', () => {
  it('defines five readable starting traders', () => {
    expect(TRADERS).toHaveLength(5);

    for (const trader of TRADERS) {
      expect(trader.startingDeckIds.length).toBeGreaterThanOrEqual(10);
      expect(trader.startingDeckIds.length).toBeLessThanOrEqual(12);
      expect(trader.startingToolIds.length).toBeLessThanOrEqual(1);
      expect(trader.startingCash).toBeGreaterThan(0);
      expect(trader.passive).toBeTruthy();
      expect(trader.riskRule).toBeTruthy();
      expect(trader.rewardBias).toBeTruthy();
      expect(trader.difficulty).toBeTruthy();
    }
  });

  it('uses trader-specific starting cash, deck, and tools', () => {
    const oldHand = createTraderRunConfig('old-hand');
    const hotMoney = createTraderRunConfig('hot-money');
    const riskManager = createTraderRunConfig('risk-manager');

    expect(oldHand.cash).toBe(170);
    expect(hotMoney.cash).toBe(110);
    expect(riskManager.cash).toBe(140);
    expect(oldHand.deck).toHaveLength(12);
    expect(hotMoney.deck).toHaveLength(12);
    expect(oldHand.tools).toHaveLength(1);
    expect(hotMoney.tools).toHaveLength(1);
    expect(oldHand.deck.map((card) => card.name)).not.toEqual(
      hotMoney.deck.map((card) => card.name)
    );
  });

  it('starts the formal run from the selected trader instead of the full card pool', () => {
    const state = createFormalEventGameState({}, 'quant-newbie');

    expect(state.traderId).toBe('quant-newbie');
    expect(state.cash).toBe(125);
    expect(state.hand.length + state.drawPile.length + state.discardPile.length).toBe(12);
    expect(state.tools.length).toBeLessThanOrEqual(1);
  });

  it('applies trader passive rules to profit, risk, cash-out, and services', () => {
    expect(
      getTraderProfitMultiplier(
        { traderId: 'hot-money', risk: 0, maxRisk: 100 },
        profitEvent({ cardType: 'CHASE' })
      )
    ).toBe(1.2);

    expect(
      getTraderProfitMultiplier(
        { traderId: 'old-hand', risk: 0, maxRisk: 100 },
        profitEvent({ risk: 'high' })
      )
    ).toBe(0.9);

    expect(
      getTraderProfitMultiplier(
        { traderId: 'bankrupt-gambler', risk: 80, maxRisk: 100 },
        profitEvent({})
      )
    ).toBeGreaterThan(1);

    expect(getTraderRiskMultiplier({ traderId: 'hot-money' })).toBe(1.25);
    expect(getCashOutRatioWithTrader({ traderId: 'old-hand' }, 0.2)).toBeCloseTo(0.3);
    expect(
      getTraderServicePriceMultiplier({
        traderId: 'risk-manager',
        servicePriceMultiplier: 0.75
      })
    ).toBe(0.75);
  });

  it('discounts deck services for the risk manager', () => {
    const state = createFormalEventGameState({}, 'risk-manager');

    expect(getRemoveCardCost(state)).toBe(
      Math.round(ECONOMY_PRICES.removeCardBase * 0.75)
    );
  });
});
