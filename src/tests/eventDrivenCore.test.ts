import { describe, expect, it } from 'vitest';
import { TEST_EVENT_CARDS, TEST_EVENT_TOOLS, type EventCard } from '../game/effects';
import { createGameEvent } from '../game/events';
import { EventQueue } from '../game/eventQueue';
import { playCard, createTestEventGameState } from '../game/playCard';

describe('event-driven core', () => {
  it('has 10 test cards and 8 test tools for the expanded demo', () => {
    expect(TEST_EVENT_CARDS).toHaveLength(10);
    expect(TEST_EVENT_TOOLS).toHaveLength(8);
  });

  it('each expanded test card creates at least one readable effect event', () => {
    for (const card of TEST_EVENT_CARDS) {
      const state = playCard(
        createTestEventGameState({
          hand: [card],
          drawPile: [getCard('test-card-short-cover')],
          tools: []
        }),
        card.id
      );

      expect(state.combo.eventLog[0]).toBe(`打出 ${card.name}。`);
      expect(state.combo.eventLog.length).toBeGreaterThan(1);
    }
  });

  it('EventQueue can enqueue and resolve events', () => {
    const state = createTestEventGameState({ tools: [] });
    const queue = new EventQueue();

    queue.enqueue(
      createGameEvent({
        id: 'manual-profit',
        type: 'PROFIT_GAINED',
        sourceId: 'test',
        sourceName: '测试事件',
        message: '测试事件获得 10 收益。',
        value: 10
      })
    );

    const result = queue.resolveAll(state);

    expect(result.processed).toBeGreaterThan(0);
    expect(state.combo.eventLog).toContain('测试事件获得 10 收益。');
  });

  it('playing 幻芯买入 creates CARD_PLAYED, PROFIT_GAINED, and SECTOR_TRIGGERED', () => {
    const state = playCard(
      createTestEventGameState({ tools: [] }),
      'test-card-tech-buy'
    );
    const log = state.combo.eventLog.join('\n');

    expect(log).toContain('打出 幻芯买入。');
    expect(log).toContain('幻芯买入 获得 20 收益。');
    expect(log).toContain('幻芯买入 触发 TECH 板块。');
  });

  it('PROFIT_GAINED damages MarketPressure', () => {
    const state = createTestEventGameState({ tools: [] });
    const nextState = playCard(state, 'test-card-tech-buy');

    expect(nextState.marketPressure.hp).toBeLessThan(state.marketPressure.hp);
    expect(nextState.combo.eventLog.join('\n')).toContain('压力伤害');
  });

  it('科技扩音器 listens to TECH sector events and triggers', () => {
    const state = playCard(createTestEventGameState(), 'test-card-tech-buy');
    const log = state.combo.eventLog.join('\n');

    expect(log).toContain('科技扩音器 被触发。');
    expect(log).toContain('科技扩音器 获得 8 收益。');
    expect(state.combo.comboCount).toBeGreaterThanOrEqual(1);
  });

  it('涨停板计算器 listens to LIMIT_UP and increases combo', () => {
    const firstState = playCard(createTestEventGameState(), 'test-card-tech-buy');
    const secondState = playCard(firstState, 'test-card-limit-chase');
    const log = secondState.combo.eventLog.join('\n');

    expect(log).toContain('涨停追击 追击成功，触发涨停。');
    expect(log).toContain('涨停板计算器 被触发。');
    expect(secondState.combo.comboCount).toBeGreaterThanOrEqual(4);
  });

  it('风险补偿器 listens to large RISK_GAINED events', () => {
    const state = playCard(
      createTestEventGameState({ tools: [] }),
      'test-card-margin-add'
    );
    const compensatedState = playCard(
      createTestEventGameState(),
      'test-card-margin-add'
    );
    const log = compensatedState.combo.eventLog.join('\n');

    expect(compensatedState.marketPressure.hp).toBeLessThan(
      state.marketPressure.hp
    );
    expect(log).toContain('风险补偿器 被触发。');
    expect(log).toContain('风险补偿器 获得 12 收益。');
  });

  it('risk reaching maxRisk triggers BANKRUPTCY_WARNING', () => {
    const state = playCard(
      createTestEventGameState({ maxRisk: 20, tools: [] }),
      'test-card-margin-add'
    );
    const log = state.combo.eventLog.join('\n');

    expect(state.risk).toBeGreaterThanOrEqual(20);
    expect(state.phase).toBe('RUN_LOST');
    expect(log).toContain('触发爆仓警告');
  });

  it('MarketPressure reaching zero triggers clear and reward events', () => {
    const state = createTestEventGameState({
      tools: [],
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        hp: 10,
        maxHp: 10
      }
    });
    const nextState = playCard(state, 'test-card-tech-buy');
    const log = nextState.combo.eventLog.join('\n');

    expect(nextState.marketPressure.hp).toBe(0);
    expect(nextState.phase).toBe('REWARD');
    expect(nextState.rewardChoices).toHaveLength(3);
    expect(log).toContain('被击穿');
    expect(log).toContain('奖励掉落');
  });

  it('EventQueue stops at maxEvents to prevent infinite loops', () => {
    const state = createTestEventGameState({ tools: [] });
    const queue = new EventQueue(3);

    for (let index = 0; index < 5; index += 1) {
      queue.enqueue(
        createGameEvent({
          id: `manual-${index}`,
          type: 'CARD_PLAYED',
          sourceId: 'manual',
          sourceName: '手动事件',
          message: `手动事件 ${index}。`
        })
      );
    }

    const result = queue.resolveAll(state);

    expect(result.processed).toBe(3);
    expect(result.stopped).toBe(true);
    expect(state.combo.eventLog.join('\n')).toContain('事件队列达到 3 个事件上限');
  });

  it('热点轮动 triggers the current hotSector and draws a card', () => {
    const state = playCard(
      createTestEventGameState({
        hand: [getCard('test-card-hot-rotation')],
        drawPile: [getCard('test-card-short-cover')],
        hotSector: 'TECH',
        tools: []
      }),
      'test-card-hot-rotation'
    );
    const log = state.combo.eventLog.join('\n');

    expect(state.hand.map((card) => card.id)).toContain('test-card-short-cover');
    expect(log).toContain('热点轮动 触发 TECH 板块。');
    expect(log).toContain('热点轮动 抽 1 张牌。');
  });

  it('量化终端 listens to CARD_COPIED, draws a card, and adds combo', () => {
    const firstState = playCard(createTestEventGameState(), 'test-card-tech-buy');
    const secondState = playCard(firstState, 'test-card-quant-copy');
    const log = secondState.combo.eventLog.join('\n');

    expect(secondState.hand.map((card) => card.id)).toContain('test-card-short-cover');
    expect(secondState.combo.comboCount).toBeGreaterThan(firstState.combo.comboCount);
    expect(log).toContain('量化终端 被触发。');
    expect(log).toContain('量化终端 抽 1 张牌。');
  });

  it('止盈保险 and 现金保险箱 lock profit and reduce risk without looping forever', () => {
    const state = playCard(
      createTestEventGameState({
        hand: [getCard('test-card-cash-insurance')],
        risk: 20,
        combo: {
          ...createTestEventGameState().combo,
          currentChainProfit: 100
        }
      }),
      'test-card-cash-insurance'
    );
    const log = state.combo.eventLog.join('\n');

    expect(state.lockedProfit).toBe(35);
    expect(state.risk).toBe(5);
    expect(log).toContain('止盈保险 锁定 25 浮盈。');
    expect(log).toContain('现金保险箱 被触发。');
    expect(log.match(/现金保险箱 被触发。/g)).toHaveLength(1);
  });

  it('妖股点火 creates a tool chain and can push comboCount above 5', () => {
    const firstState = playCard(createTestEventGameState({
      actionPoints: 6,
      ap: 6,
      maxActionPoints: 6,
      maxAp: 6
    }), 'test-card-tech-buy');
    const secondState = playCard(firstState, 'test-card-limit-chase');
    const thirdState = playCard(secondState, 'test-card-hot-stock-ignite');
    const log = thirdState.combo.eventLog.join('\n');

    expect(thirdState.combo.comboCount).toBeGreaterThanOrEqual(5);
    expect(log).toContain('涨停板计算器 被触发。');
    expect(log).toContain('游资席位 被触发。');
    expect(log).toContain('风险补偿器 被触发。');
    expect(log).toContain('老股民茶杯 被触发。');
    expect(log).toContain('连击显示器 被触发。');
  });

  it('低吸反弹 responds to prior risk events with profit and risk reduction', () => {
    const riskyState = playCard(createTestEventGameState(), 'test-card-margin-add');
    const reboundState = playCard(riskyState, 'test-card-dip-rebound');
    const log = reboundState.combo.eventLog.join('\n');

    expect(reboundState.risk).toBeLessThan(riskyState.risk);
    expect(log).toContain('低吸反弹 获得 22 反弹收益。');
    expect(log).toContain('低吸反弹 降低 5 爆仓风险。');
  });

  it('空头回补 deals direct MarketPressure damage below 50% HP', () => {
    const state = playCard(
      createTestEventGameState({
        hand: [getCard('test-card-short-cover')],
        tools: [],
        marketPressure: {
          ...createTestEventGameState().marketPressure,
          hp: 50
        }
      }),
      'test-card-short-cover'
    );

    expect(state.marketPressure.hp).toBe(15);
    expect(state.combo.eventLog.join('\n')).toContain('空头回补 造成 35 点空头回补伤害。');
  });
});

function getCard(cardId: string): EventCard {
  const card = TEST_EVENT_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error(`Missing test card: ${cardId}`);
  }

  return card;
}
