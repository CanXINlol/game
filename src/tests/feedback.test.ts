import { describe, expect, it } from 'vitest';
import { aggregateChainSummary, getKeyEventLog } from '../game/feedback';
import { createGameEvent } from '../game/events';
import { gainCash, spendCash } from '../game/economy';
import { createTestEventGameState } from '../game/playCard';

describe('visual feedback aggregation', () => {
  it('merges same-type events into a chain summary', () => {
    const summary = aggregateChainSummary([
      createGameEvent({
        id: 'profit-1',
        type: 'PROFIT_GAINED',
        sourceId: 'card',
        sourceName: '测试牌',
        message: '测试牌获得 20 收益。',
        value: 20
      }),
      createGameEvent({
        id: 'profit-2',
        type: 'PROFIT_GAINED',
        sourceId: 'tool',
        sourceName: '测试工具',
        message: '测试工具获得 12 收益。',
        value: 12
      }),
      createGameEvent({
        id: 'risk',
        type: 'RISK_GAINED',
        sourceId: 'card',
        sourceName: '测试牌',
        message: '测试牌风险 +18。',
        value: 18
      }),
      createGameEvent({
        id: 'tool',
        type: 'TOOL_TRIGGERED',
        sourceId: 'tool',
        sourceName: '测试工具',
        message: '测试工具 被触发。'
      })
    ]);

    expect(summary.profitGained).toBe(32);
    expect(summary.riskGained).toBe(18);
    expect(summary.toolTriggers).toBe(1);
  });

  it('keeps key events but filters small noisy profit logs', () => {
    const log = getKeyEventLog([
      '测试牌获得 5 收益。',
      '测试盘 受到 5 点压力伤害。',
      '测试工具 被触发。',
      '奖励掉落：普通奖励。',
      '风险达到 100/100，触发爆仓警告。'
    ]);

    expect(log).toEqual([
      '测试工具 被触发。',
      '奖励掉落：普通奖励。',
      '风险达到 100/100，触发爆仓警告。'
    ]);
  });

  it('summarizes cash gain, spend, and net cash changes', () => {
    const summary = aggregateChainSummary([], [
      {
        amount: 30,
        source: '击穿奖励',
        type: 'GAIN',
        message: '击穿奖励：现金 +30。',
        turn: 1,
        nodeId: null
      },
      {
        amount: 20,
        source: '刷新商店',
        type: 'SPEND',
        message: '刷新商店：现金 -20。',
        turn: 1,
        nodeId: null
      }
    ]);

    expect(summary.cashGained).toBe(30);
    expect(summary.cashSpent).toBe(20);
    expect(summary.netCash).toBe(10);
  });

  it('records cash gain and spend through economy helpers', () => {
    const state = createTestEventGameState({ cash: 100 });

    gainCash(state, 30, '测试收入');
    spendCash(state, 20, '测试支出');

    expect(state.cashTransactions).toHaveLength(2);
    expect(state.lastChainSummary.cashGained).toBe(30);
    expect(state.lastChainSummary.cashSpent).toBe(20);
    expect(state.lastChainSummary.netCash).toBe(10);
  });
});
