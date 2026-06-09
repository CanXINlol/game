import { describe, expect, it } from 'vitest';
import { settleTradingDay } from '../game/settlement';
import type {
  ComboResult,
  MarketState,
  RiskLevel,
  Sector,
  StockCard
} from '../game/types';

function card(
  id: string,
  sector: Sector = 'TECH',
  baseReturn = 10,
  baseRisk = 8,
  risk: RiskLevel = 'medium'
): StockCard {
  return {
    id,
    name: `结算测试牌-${id}`,
    sector,
    rank: 5,
    risk,
    tags: [],
    baseReturn,
    baseRisk,
    description: '测试用虚构股票牌。'
  };
}

function combo(overrides: Partial<ComboResult> = {}): ComboResult {
  return {
    comboType: 'NORMAL',
    displayName: '普通持仓',
    multiplier: 1,
    riskModifier: 1,
    description: '测试牌型。',
    ...overrides
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

const selectedCards = [
  card('a', 'CONSUMER'),
  card('b', 'CONSUMER'),
  card('c', 'MEDICAL'),
  card('d', 'ENERGY'),
  card('e', 'MEDICAL')
];

describe('settleTradingDay', () => {
  it('gives higher profit with higher leverage', () => {
    const lowLeverage = settleTradingDay(
      selectedCards,
      combo(),
      market(),
      { floatingProfit: 0, risk: 0, maxRisk: 100 },
      0
    );
    const highLeverage = settleTradingDay(
      selectedCards,
      combo(),
      market(),
      { floatingProfit: 0, risk: 0, maxRisk: 100 },
      2
    );

    expect(highLeverage.grossProfit).toBeGreaterThan(lowLeverage.grossProfit);
  });

  it('gives higher risk with higher leverage', () => {
    const lowLeverage = settleTradingDay(
      selectedCards,
      combo(),
      market(),
      { floatingProfit: 0, risk: 0, maxRisk: 100 },
      0
    );
    const highLeverage = settleTradingDay(
      selectedCards,
      combo(),
      market(),
      { floatingProfit: 0, risk: 0, maxRisk: 100 },
      2
    );

    expect(highLeverage.riskGain).toBeGreaterThan(lowLeverage.riskGain);
  });

  it('marks bankruptcy when risk reaches maxRisk', () => {
    const result = settleTradingDay(
      selectedCards,
      combo(),
      market(),
      { floatingProfit: 0, risk: 90, maxRisk: 100 },
      1
    );

    expect(result.newRisk).toBeGreaterThanOrEqual(100);
    expect(result.isBankrupt).toBe(true);
    expect(result.warningLevel).toBe('BANKRUPT');
  });

  it('applies combo multiplier to profit', () => {
    const normal = settleTradingDay(
      selectedCards,
      combo({ multiplier: 1 }),
      market(),
      { floatingProfit: 0, risk: 0, maxRisk: 100 },
      0
    );
    const strongCombo = settleTradingDay(
      selectedCards,
      combo({ comboType: 'FOUR', displayName: '垄断行情', multiplier: 2.8 }),
      market(),
      { floatingProfit: 0, risk: 0, maxRisk: 100 },
      0
    );

    expect(strongCombo.grossProfit).toBeGreaterThan(normal.grossProfit);
  });

  it('applies market multiplier to profit', () => {
    const weakMarket = settleTradingDay(
      selectedCards,
      combo(),
      market({ mood: 'BEAR' }),
      { floatingProfit: 0, risk: 0, maxRisk: 100 },
      0
    );
    const strongMarket = settleTradingDay(
      selectedCards,
      combo(),
      market({ mood: 'BULL' }),
      { floatingProfit: 0, risk: 0, maxRisk: 100 },
      0
    );

    expect(strongMarket.grossProfit).toBeGreaterThan(weakMarket.grossProfit);
  });

  it('explains profit and risk sources in summary text', () => {
    const result = settleTradingDay(
      selectedCards,
      combo({ displayName: '双龙头', multiplier: 1.35 }),
      market({ mood: 'BULL' }),
      { floatingProfit: 10, risk: 5, maxRisk: 100 },
      1
    );

    expect(result.summaryText).toContain('基础收益');
    expect(result.summaryText).toContain('牌型');
    expect(result.summaryText).toContain('市场');
    expect(result.summaryText).toContain('杠杆');
    expect(result.summaryText).toContain('风险');
  });
});
