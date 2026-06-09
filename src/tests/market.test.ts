import { describe, expect, it } from 'vitest';
import {
  generateMarketForDay,
  getMarketMultiplier,
  getMarketRiskModifier
} from '../game/market';
import type { MarketState, RiskLevel, Sector, StockCard } from '../game/types';

function card(
  id: string,
  sector: Sector,
  risk: RiskLevel = 'medium'
): StockCard {
  return {
    id,
    name: `测试市场牌-${id}`,
    sector,
    rank: 5,
    risk,
    tags: [],
    baseReturn: 10,
    baseRisk: 10,
    description: '测试用虚构股票牌。'
  };
}

function market(overrides: Partial<MarketState> = {}): MarketState {
  return {
    day: 1,
    mood: 'NEUTRAL',
    hotSector: 'TECH',
    weakSector: 'FINANCE',
    volatility: 1,
    news: '测试用虚构市场新闻。',
    ...overrides
  };
}

describe('market system', () => {
  it('gives hot sector cards a higher return multiplier', () => {
    const currentMarket = market({ hotSector: 'TECH', weakSector: 'FINANCE' });
    const hotCards = [
      card('a', 'TECH'),
      card('b', 'TECH'),
      card('c', 'TECH'),
      card('d', 'CONSUMER'),
      card('e', 'MEDICAL')
    ];
    const neutralCards = [
      card('a', 'CONSUMER'),
      card('b', 'CONSUMER'),
      card('c', 'MEDICAL'),
      card('d', 'ENERGY'),
      card('e', 'MEDICAL')
    ];

    expect(getMarketMultiplier(hotCards, currentMarket)).toBeGreaterThan(
      getMarketMultiplier(neutralCards, currentMarket)
    );
  });

  it('reduces returns for weak sector cards', () => {
    const currentMarket = market({ hotSector: 'TECH', weakSector: 'FINANCE' });
    const weakCards = [
      card('a', 'FINANCE'),
      card('b', 'FINANCE'),
      card('c', 'FINANCE'),
      card('d', 'CONSUMER'),
      card('e', 'MEDICAL')
    ];
    const neutralCards = [
      card('a', 'CONSUMER'),
      card('b', 'CONSUMER'),
      card('c', 'MEDICAL'),
      card('d', 'ENERGY'),
      card('e', 'MEDICAL')
    ];

    expect(getMarketMultiplier(weakCards, currentMarket)).toBeLessThan(
      getMarketMultiplier(neutralCards, currentMarket)
    );
  });

  it('has higher risk in a bear market', () => {
    const cards = [
      card('a', 'CONSUMER'),
      card('b', 'CONSUMER'),
      card('c', 'MEDICAL'),
      card('d', 'ENERGY'),
      card('e', 'MEDICAL')
    ];
    const bearRisk = getMarketRiskModifier(cards, market({ mood: 'BEAR' }));
    const bullRisk = getMarketRiskModifier(cards, market({ mood: 'BULL' }));

    expect(bearRisk).toBeGreaterThan(bullRisk);
  });

  it('generates the same market for the same seed and day', () => {
    const firstMarket = generateMarketForDay(3, 'same-market-seed');
    const secondMarket = generateMarketForDay(3, 'same-market-seed');

    expect(firstMarket).toEqual(secondMarket);
  });
});
