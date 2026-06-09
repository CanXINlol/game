import { describe, expect, it } from 'vitest';
import { CollapsibleEventLog } from '../components/CollapsibleEventLog';
import { CompactToolTriggerToast } from '../components/CompactToolTriggerToast';
import { MainCombatLayout } from '../components/MainCombatLayout';
import { TurnSummaryPanel } from '../components/TurnSummaryPanel';
import { aggregateChainSummary } from '../game/feedback';

describe('compact combat UI', () => {
  it('keeps detailed event log collapsed by default and shows only recent key events', () => {
    const rendered = JSON.stringify(
      CollapsibleEventLog({
        eventLog: [
          '小额收益获得 5 收益。',
          '工具甲 被触发。',
          '奖励掉落。',
          '风险达到 100/100，触发爆仓警告。',
          '路线节点完成。'
        ]
      })
    );

    expect(rendered).toContain('查看详细日志');
    expect(rendered).not.toContain('"open"');
    expect(rendered).toContain('路线节点完成');
    expect(rendered).toContain('爆仓警告');
  });

  it('keeps tool trigger toast compact instead of permanently stacking messages', () => {
    const rendered = JSON.stringify(
      CompactToolTriggerToast({
        messages: ['工具甲 被触发。', '涨停板计算器 被触发。']
      })
    );

    expect(rendered).toContain('涨停板计算器');
    expect(rendered).not.toContain('工具甲');
  });

  it('renders the five main combat regions', () => {
    const rendered = JSON.stringify(
      MainCombatLayout({
        top: '顶部',
        center: '中央',
        hand: '手牌',
        left: '资源',
        right: '摘要'
      })
    );

    expect(rendered).toContain('combat-top');
    expect(rendered).toContain('combat-center');
    expect(rendered).toContain('combat-hand');
    expect(rendered).toContain('combat-left');
    expect(rendered).toContain('combat-right');
  });

  it('turn summary aggregates player-facing combat information', () => {
    const rendered = JSON.stringify(
      TurnSummaryPanel({
        summary: aggregateChainSummary([], [
          {
            amount: 30,
            source: '测试',
            type: 'GAIN',
            message: '测试：现金 +30。',
            turn: 1,
            nodeId: null
          }
        ]),
        chainDepth: 3,
        turnSummary: '下一意图：风险打击。'
      })
    );

    expect(rendered).toContain('本回合摘要');
    expect(rendered).toContain('连锁收益');
    expect(rendered).toContain('下一意图');
    expect(rendered).not.toContain('PROFIT_GAINED');
  });
});
