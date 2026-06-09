import { describe, expect, it } from 'vitest';
import { TOOLS } from '../data/tools';
import { createInitialToolState, getHoldCarryMultiplier } from '../game/tools';
import { settleTradingDay } from '../game/settlement';
import type {
  ComboResult,
  MarketState,
  RiskLevel,
  Sector,
  StockCard,
  Tool
} from '../game/types';

function tool(id: string): Tool {
  const found = TOOLS.find((item) => item.id === id);

  if (!found) {
    throw new Error(`Missing test tool: ${id}`);
  }

  return found;
}

function card(
  id: string,
  sector: Sector = 'TECH',
  baseReturn = 10,
  baseRisk = 5,
  risk: RiskLevel = 'medium'
): StockCard {
  return {
    id,
    name: `工具测试牌-${id}`,
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

describe('tools system', () => {
  it('defines 20 data-driven tools', () => {
    expect(TOOLS).toHaveLength(20);
    expect(TOOLS.every((item) => item.effects.length > 0)).toBe(true);
  });

  it('涨停板计算器 increases hold carry multiplier by 0.2', () => {
    expect(
      getHoldCarryMultiplier([tool('tool-limit-up-calculator')], 1.5)
    ).toBe(1.7);
  });

  it('行业研报库 adds 0.5 combo multiplier to same-sector hands', () => {
    const cards = [
      card('a', 'TECH'),
      card('b', 'TECH'),
      card('c', 'TECH'),
      card('d', 'TECH'),
      card('e', 'TECH')
    ];
    const result = settleTradingDay(
      cards,
      combo({ comboType: 'SAME_SECTOR', displayName: '板块共振', multiplier: 2.2 }),
      market(),
      {
        floatingProfit: 0,
        risk: 0,
        maxRisk: 100,
        tools: [tool('tool-industry-reports')],
        toolState: createInitialToolState()
      },
      0
    );

    expect(result.comboMultiplier).toBe(2.7);
    expect(result.toolMessages.join('')).toContain('行业研报库');
  });

  it('老股民茶杯 locks 30% floating profit on first loss', () => {
    const result = settleTradingDay(
      [
        card('a', 'TECH', -5),
        card('b', 'CONSUMER', -5),
        card('c', 'MEDICAL', -5),
        card('d', 'ENERGY', -5),
        card('e', 'FINANCE', -5)
      ],
      combo(),
      market(),
      {
        floatingProfit: 100,
        risk: 0,
        maxRisk: 100,
        tools: [tool('tool-old-trader-cup')],
        toolState: createInitialToolState()
      },
      0
    );

    expect(result.toolLockedProfit).toBe(30);
    expect(result.updatedToolState.triggeredToolIds).toContain(
      'tool-old-trader-cup'
    );
  });

  it('韭菜笔记本 gives next profit +25% after a loss', () => {
    const loss = settleTradingDay(
      [
        card('a', 'TECH', -5),
        card('b', 'CONSUMER', -5),
        card('c', 'MEDICAL', -5),
        card('d', 'ENERGY', -5),
        card('e', 'FINANCE', -5)
      ],
      combo(),
      market(),
      {
        floatingProfit: 0,
        risk: 0,
        maxRisk: 100,
        tools: [tool('tool-chive-notebook')],
        toolState: createInitialToolState()
      },
      0
    );
    const rebound = settleTradingDay(
      [
        card('f', 'TECH', 10),
        card('g', 'CONSUMER', 10),
        card('h', 'MEDICAL', 10),
        card('i', 'ENERGY', 10),
        card('j', 'FINANCE', 10)
      ],
      combo(),
      market(),
      {
        floatingProfit: loss.newFloatingProfit,
        risk: loss.newRisk,
        maxRisk: 100,
        tools: [tool('tool-chive-notebook')],
        toolState: loss.updatedToolState
      },
      0
    );

    expect(loss.updatedToolState.nextProfitMultiplier).toBe(1.25);
    expect(rebound.toolMultiplier).toBe(1.25);
    expect(rebound.grossProfit).toBeGreaterThan(50);
  });

  it('券商保险单 prevents first bankruptcy and sets principal override to 1', () => {
    const result = settleTradingDay(
      [
        card('a', 'TECH', 10, 30),
        card('b', 'CONSUMER', 10, 30),
        card('c', 'MEDICAL', 10, 30),
        card('d', 'ENERGY', 10, 30),
        card('e', 'FINANCE', 10, 30)
      ],
      combo(),
      market(),
      {
        floatingProfit: 50,
        risk: 95,
        maxRisk: 100,
        tools: [tool('tool-broker-insurance')],
        toolState: createInitialToolState()
      },
      2
    );

    expect(result.isBankrupt).toBe(false);
    expect(result.principalOverride).toBe(1);
    expect(result.newFloatingProfit).toBe(0);
    expect(result.updatedToolState.triggeredToolIds).toContain(
      'tool-broker-insurance'
    );
  });
});
