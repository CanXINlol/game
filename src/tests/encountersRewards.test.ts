import { describe, expect, it } from 'vitest';
import { settleEncounterTurn, type MarketIntent } from '../game/encounters';
import { TEST_EVENT_TOOLS } from '../game/effects';
import { createMarketPressureByIndex } from '../game/marketPressure';
import { createTestEventGameState, playCard } from '../game/playCard';
import {
  applyRewardChoice,
  skipReward,
  type RewardOption
} from '../game/rewards';

describe('encounter pressure and disciplined rewards', () => {
  it('generates public MarketPressure intents with weakness and resistance sectors', () => {
    const pressure = createMarketPressureByIndex('intent-seed', 0);

    expect(pressure.intent.type).toBeTruthy();
    expect(pressure.intent.label).toBeTruthy();
    expect(pressure.intent.description).toBeTruthy();
    expect(pressure.weaknessSector).toBeTruthy();
    expect(pressure.resistanceSector).toBeTruthy();
  });

  it('applies the public intent when the turn is settled', () => {
    const state = createTestEventGameState({
      risk: 5,
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        intent: createIntent('RISK_ATTACK', 12)
      }
    });

    settleEncounterTurn(state);

    expect(state.risk).toBe(17);
    expect(state.combo.eventLog.join('\n')).toContain('公开意图结算');
  });

  it('can make a pressure intent add shield instead of surprising the player', () => {
    const state = createTestEventGameState({
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        shield: 2,
        intent: createIntent('SHIELD_UP', 18)
      }
    });

    settleEncounterTurn(state);

    expect(state.marketPressure.shield).toBe(20);
  });

  it('creates exactly three reward options after MarketPressure is cleared', () => {
    const state = playCard(
      createTestEventGameState({
        tools: [],
        marketPressure: {
          ...createTestEventGameState().marketPressure,
          hp: 10,
          maxHp: 10
        }
      }),
      'test-card-tech-buy'
    );

    expect(state.phase).toBe('reward');
    expect(state.rewardChoices).toHaveLength(3);
  });

  it('lets the player skip rewards to preserve deck discipline', () => {
    const state = createTestEventGameState({
      risk: 20,
      combo: {
        ...createTestEventGameState().combo,
        currentChainProfit: 0
      }
    });

    const result = skipReward(state);

    expect(state.risk).toBe(15);
    expect(result.message).toContain('跳过奖励');
  });

  it('adds a new card to the deck from a reward', () => {
    const state = createTestEventGameState();
    const before = state.drawPile.length;
    const reward: RewardOption = {
      id: 'add-card',
      kind: 'ADD_CARD',
      title: '新牌',
      description: '加一张牌。',
      cardId: 'test-card-hot-rotation',
      cardName: '热点轮动'
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.drawPile).toHaveLength(before + 1);
  });

  it('adds a tool from a reward', () => {
    const state = createTestEventGameState({
      tools: TEST_EVENT_TOOLS.filter((tool) => tool.id !== 'test-tool-quant-terminal')
    });
    const reward: RewardOption = {
      id: 'add-tool',
      kind: 'ADD_TOOL',
      title: '工具',
      description: '加一个工具。',
      toolId: 'test-tool-quant-terminal',
      toolName: '量化终端'
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.tools.some((tool) => tool.id === 'test-tool-quant-terminal')).toBe(
      true
    );
  });

  it('upgrades a card and changes its playable shape', () => {
    const state = createTestEventGameState({
      hand: [getCardState().hand[0]],
      drawPile: []
    });
    const card = state.hand[0];
    const reward: RewardOption = {
      id: 'upgrade-card',
      kind: 'UPGRADE_CARD',
      title: '升级',
      description: '升级一张牌。',
      cardId: card.id,
      cardName: card.name
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.hand[0]).not.toEqual(card);
  });

  it('removes a card from the deck from a reward', () => {
    const state = createTestEventGameState();
    const cardId = state.hand[0].id;
    const reward: RewardOption = {
      id: 'remove-card',
      kind: 'REMOVE_CARD',
      title: '删牌',
      description: '移除一张牌。',
      cardId,
      cardName: state.hand[0].name
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(
      [...state.hand, ...state.drawPile, ...state.discardPile].some(
        (card) => card.id === cardId
      )
    ).toBe(false);
  });
});

function createIntent(type: MarketIntent['type'], value?: number): MarketIntent {
  return {
    type,
    label: type,
    description: `${type} preview`,
    value
  };
}

function getCardState() {
  return createTestEventGameState();
}
