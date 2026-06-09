import { describe, expect, it } from 'vitest';
import {
  FORMAL_EVENT_CARDS,
  FORMAL_EVENT_TOOLS,
  FORMAL_MIGRATION_LIST
} from '../game/formalContent';
import { MARKET_PRESSURE_DEFINITIONS } from '../game/marketPressure';
import { createFormalEventGameState, playCard } from '../game/playCard';

describe('formal event-driven migration batch', () => {
  it('migrates 30 formal cards, 20 formal tools, and 3 MarketPressure definitions', () => {
    expect(FORMAL_EVENT_CARDS).toHaveLength(30);
    expect(FORMAL_EVENT_TOOLS).toHaveLength(20);
    expect(MARKET_PRESSURE_DEFINITIONS).toHaveLength(3);
  });

  it('every formal card has playEffect and emits at least one readable event', () => {
    for (const card of FORMAL_EVENT_CARDS) {
      const state = playCard(
        createFormalEventGameState({
          hand: [card],
          drawPile: FORMAL_EVENT_CARDS.filter((item) => item.id !== card.id),
          tools: []
        }),
        card.id
      );

      expect(card.playEffect).toBeTruthy();
      expect(state.combo.eventLog[0]).toBe(`打出 ${card.name}。`);
      expect(state.combo.eventLog.length).toBeGreaterThan(1);
    }
  });

  it('preserves sector, rank, risk, tags, type, and playEffect metadata', () => {
    for (const card of FORMAL_EVENT_CARDS) {
      expect(card.sector).toBeTruthy();
      expect(card.rank).toBeGreaterThanOrEqual(1);
      expect(card.rank).toBeLessThanOrEqual(10);
      expect(card.risk).toBeTruthy();
      expect(card.tags?.length).toBeGreaterThan(0);
      expect(card.cardType).toBeTruthy();
      expect(card.playEffect).toBeTruthy();
      expect([0, 1, 2, 3]).toContain(card.cost);
      expect(['STARTER', 'EXTENDER', 'PAYOFF', 'DEFENSE', 'FINISHER']).toContain(
        card.cardRole
      );
    }
  });

  it('uses readable functional card names and concise two-line descriptions', () => {
    const functionWords = [
      '买入',
      '追击',
      '点火',
      '加仓',
      '融资',
      '低吸',
      '反弹',
      '止盈',
      '锁利',
      '抽牌',
      '复制',
      '轮动',
      '共振',
      '清算',
      '终结',
      '回补',
      '护盘',
      '降险',
      '爆发'
    ];

    for (const card of FORMAL_EVENT_CARDS) {
      expect(card.name.length).toBeGreaterThanOrEqual(4);
      expect(card.name.length).toBeLessThanOrEqual(8);
      expect(functionWords.some((word) => card.name.includes(word))).toBe(true);
      expect(card.playEffect?.split('\n')).toHaveLength(2);
    }
  });

  it('meets combo, draw-copy, and risk-control migration ratios', () => {
    const comboCards = FORMAL_EVENT_CARDS.filter((card) =>
      card.effects.some(
        (effect) =>
          effect.type === 'GAIN_COMBO' ||
          effect.type === 'TRIGGER_LIMIT_UP' ||
          effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT'
      )
    );
    const drawCopyCards = FORMAL_EVENT_CARDS.filter((card) =>
      card.effects.some(
        (effect) => effect.type === 'DRAW_CARD' || effect.type === 'COPY_PREVIOUS_CARD'
      )
    );
    const riskControlCards = FORMAL_EVENT_CARDS.filter((card) =>
      card.effects.some(
        (effect) => effect.type === 'REDUCE_RISK' || effect.type === 'CASH_OUT'
      )
    );

    expect(comboCards.length).toBeGreaterThanOrEqual(9);
    expect(drawCopyCards.length).toBeGreaterThanOrEqual(6);
    expect(riskControlCards.length).toBeGreaterThanOrEqual(6);
  });

  it('every formal tool declares triggerEvents and listens through event triggers', () => {
    for (const tool of FORMAL_EVENT_TOOLS) {
      expect(tool.triggerEvents?.length).toBeGreaterThan(0);
      expect(tool.triggerEvents).toContain(tool.trigger.type);
      expect(tool.effects.length).toBeGreaterThan(0);
      expect(tool.description).toContain('触发条件：');
    }
  });

  it('can start the game with the formal pool replacing the test pool', () => {
    const state = createFormalEventGameState();

    expect(state.hand).toHaveLength(8);
    expect(state.drawPile).toHaveLength(22);
    expect(state.tools).toHaveLength(20);
    expect(state.hand.every((card) => card.id.startsWith('formal-'))).toBe(true);
    expect(state.tools.every((tool) => tool.id.startsWith('formal-'))).toBe(true);
  });

  it('exports a migration list for all formal cards', () => {
    expect(FORMAL_MIGRATION_LIST).toHaveLength(30);
    expect(FORMAL_MIGRATION_LIST[0]).toMatchObject({
      cardName: '算力买入',
      type: 'BUY'
    });
    expect(
      new Set(FORMAL_MIGRATION_LIST.flatMap((item) => item.archetypes)).size
    ).toBeGreaterThanOrEqual(3);
  });
});
