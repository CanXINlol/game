import { describe, expect, it } from 'vitest';
import { CardPreview } from '../components/CardPreview';
import { MarketIntentPanel } from '../components/MarketIntentPanel';
import { RewardPanel } from '../components/RewardPanel';
import { RunStatusPanel } from '../components/RunStatusPanel';
import { createTestEventGameState } from '../game/playCard';
import { createCardPreview } from '../game/preview';
import type { EventCard } from '../game/effects';
import {
  CARD_ROLE_LABELS,
  CARD_TYPE_LABELS,
  ENCOUNTER_INTENT_TYPE_LABELS,
  GAME_EVENT_TYPE_LABELS,
  GAME_PHASE_LABELS,
  REWARD_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RUN_RESULT_LABELS,
  SECTOR_LABELS,
  TOOL_RARITY_LABELS,
  localizeText
} from '../game/localization';

describe('zh-CN localization', () => {
  it('maps every GameEventType to Chinese', () => {
    expect(Object.keys(GAME_EVENT_TYPE_LABELS)).toEqual([
      'CARD_PLAYED',
      'PROFIT_GAINED',
      'RISK_GAINED',
      'RISK_REDUCED',
      'SECTOR_TRIGGERED',
      'RANK_CHAINED',
      'LIMIT_UP',
      'LIMIT_DOWN',
      'TOOL_TRIGGERED',
      'COMBO_GAINED',
      'MARKET_PRESSURE_DAMAGED',
      'MARKET_PRESSURE_CLEARED',
      'REWARD_DROPPED',
      'ENEMY_INTENT_RESOLVED',
      'BANKRUPTCY_WARNING',
      'LEVERAGE_ADDED',
      'CARD_COPIED',
      'CARD_DRAWN',
      'CASH_OUT',
      'LOSS_TAKEN',
      'TRADE_ENDED',
      'TURBOTURN_STEP',
      'TURBOTURN_COMPLETE',
      'EVENT_QUEUE_HALTED'
    ]);
    expect(GAME_EVENT_TYPE_LABELS.LIMIT_UP).toBe('涨停');
    expect(GAME_EVENT_TYPE_LABELS.RISK_GAINED).toBe('风险上升');
  });

  it('maps every card type and game phase to Chinese', () => {
    expect(Object.keys(CARD_TYPE_LABELS)).toEqual([
      'BUY',
      'CHASE',
      'DIP_BUY',
      'LEVERAGE',
      'CASH_OUT',
      'DRAW',
      'COPY',
      'SECTOR',
      'RISK',
      'FINISHER'
    ]);
    expect(Object.keys(GAME_PHASE_LABELS)).toEqual([
      'ROUTE_SELECT',
      'ENCOUNTER_START',
      'PLAYER_TURN',
      'RESOLVING_QUEUE',
      'ENEMY_INTENT',
      'REWARD',
      'SHOP',
      'REST',
      'DAY_END',
      'RUN_WON',
      'RUN_LOST'
    ]);
    expect(GAME_PHASE_LABELS.PLAYER_TURN).toBe('玩家回合');
  });

  it('maps the other player-facing enum families', () => {
    expect(Object.values(CARD_ROLE_LABELS)).toContain('启动');
    expect(Object.values(RISK_LEVEL_LABELS)).toContain('高风险');
    expect(Object.values(SECTOR_LABELS)).toContain('科技');
    expect(Object.values(ENCOUNTER_INTENT_TYPE_LABELS)).toContain('风险打击');
    expect(Object.values(REWARD_TYPE_LABELS)).toContain('新牌');
    expect(Object.values(TOOL_RARITY_LABELS)).toContain('稀有');
    expect(Object.values(RUN_RESULT_LABELS)).toContain('胜利');
  });

  it('localizes enum tokens inside event logs and descriptions', () => {
    expect(
      localizeText('LIMIT_UP 后触发 RISK_GAINED，TECH 板块造成 MarketPressure 伤害。')
    ).toBe('涨停 后触发 风险上升，科技 板块造成 市场压力 伤害。');
  });

  it('does not directly render enum fields in key UI components', () => {
    const card: EventCard = {
      id: 'localization-card',
      name: '本地化测试牌',
      sector: 'TECH',
      rank: 3,
      cardType: 'BUY',
      risk: 'high',
      cost: 1,
      cardRole: 'STARTER',
      playEffect: '触发 LIMIT_UP 和 TECH。',
      effects: []
    };

    const state = createTestEventGameState({ hand: [card] });
    const rendered = JSON.stringify([
      CardPreview({ preview: createCardPreview(card, state) }),
      MarketIntentPanel({
        intent: {
          id: 'intent',
          type: 'RISK_ATTACK',
          label: '风险打击',
          description: 'TECH 板块 risk +12。',
          value: 12,
          sector: 'TECH'
        },
        canResolveIntent: true,
        intentResolvedThisTurn: false
      }),
      RunStatusPanel({
        gameStatus: 'PLAYER_TURN',
        day: 1,
        floatingProfit: 0,
        lockedProfit: 0,
        cash: 20,
        bossInsuranceStatus: '未购买',
        act: 1,
        routeNodeCount: 0,
        profitMultiplier: 1,
        risk: 0,
        maxRisk: 100,
        ap: 3,
        maxAp: 3
      }),
      RewardPanel({
        choices: [
          {
            id: 'reward',
            kind: 'ADD_CARD',
            title: '新牌',
            description: '获得 TECH 牌。'
          }
        ],
        onSelectReward: () => undefined,
        onSkipReward: () => undefined
      })
    ]);

    expect(rendered).toContain('科技');
    expect(rendered).toContain('买入');
    expect(rendered).toContain('风险打击');
    expect(rendered).toContain('玩家回合');
    expect(rendered).toContain('新牌');
    expect(rendered).not.toContain('TECH');
    expect(rendered).not.toContain('LIMIT_UP');
    expect(rendered).not.toContain('BUY');
    expect(rendered).not.toContain('STARTER');
    expect(rendered).not.toContain('PLAYER_TURN');
  });
});
