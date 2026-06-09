import { describe, expect, it } from 'vitest';
import { TEST_EVENT_TOOLS } from '../game/effects';
import {
  applyRewardChoice,
  createRewardSeed,
  enterDayEndAfterReward,
  generateRewardChoices,
  startNextMarketPressure,
  type RewardOption
} from '../game/rewards';
import { createTestEventGameState, playCard } from '../game/playCard';

function createRewardReadyState(overrides: Parameters<typeof createTestEventGameState>[0] = {}) {
  const state = createTestEventGameState({
    seed: 'reward-seed',
    tools: TEST_EVENT_TOOLS.filter((tool) => tool.id !== 'test-tool-quant-terminal'),
    marketPressure: {
      ...createTestEventGameState().marketPressure,
      hp: 10,
      maxHp: 10
    },
    ...overrides
  });

  return playCard(state, 'test-card-tech-buy');
}

function cloneState(state: ReturnType<typeof createTestEventGameState>) {
  return JSON.parse(JSON.stringify(state)) as typeof state;
}

describe('reward generation and application', () => {
  it('generates reproducible reward choices from seed', () => {
    const state = createRewardReadyState();

    expect(state.phase).toBe('reward');
    expect(state.rewardChoices).toHaveLength(3);

    const firstIds = state.rewardChoices.map((reward) => reward.id);
    const secondState = createRewardReadyState();
    const secondIds = secondState.rewardChoices.map((reward) => reward.id);

    expect(secondIds).toEqual(firstIds);
    expect(createRewardSeed(state)).toBe('reward-seed-reward-0');
  });

  it('adds a new card to the deck when selecting add-card reward', () => {
    const state = createRewardReadyState();
    const reward: RewardOption = {
      id: 'test-add-card',
      kind: 'ADD_CARD',
      title: '追加热点',
      description: '获得 1 张热点轮动。',
      cardId: 'test-card-hot-rotation',
      cardName: '热点轮动'
    };

    const deckSizeBefore = state.hand.length + state.drawPile.length;

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.hand.length + state.drawPile.length).toBe(deckSizeBefore + 1);
    expect(
      [...state.hand, ...state.drawPile].some((card) =>
        card.id.startsWith('test-card-hot-rotation')
      )
    ).toBe(true);
  });

  it('adds a tool when selecting add-tool reward', () => {
    const state = createRewardReadyState();
    const reward: RewardOption = {
      id: 'test-add-tool',
      kind: 'ADD_TOOL',
      title: '量化插件',
      description: '获得工具“量化终端”。',
      toolId: 'test-tool-quant-terminal',
      toolName: '量化终端'
    };

    state.rewardChoices = [reward];
    const toolCountBefore = state.tools.length;
    applyRewardChoice(state, reward.id);

    expect(state.tools).toHaveLength(toolCountBefore + 1);
    expect(state.tools.some((tool) => tool.id === 'test-tool-quant-terminal')).toBe(true);
  });

  it('reduces risk when selecting reduce-risk reward', () => {
    const state = createRewardReadyState({ risk: 40 });
    const reward: RewardOption = {
      id: 'test-reduce-risk',
      kind: 'REDUCE_RISK',
      title: '风控休息',
      description: 'Risk -15。',
      value: 15
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.risk).toBe(25);
  });

  it('locks floating profit when selecting lock-profit reward', () => {
    const state = createRewardReadyState();
    const floatingBefore = state.combo.currentChainProfit;
    const reward: RewardOption = {
      id: 'test-lock-profit',
      kind: 'LOCK_PROFIT',
      title: '锁定利润',
      description: '锁定 40% 浮盈。',
      value: 0.4
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);

    expect(state.lockedProfit).toBeGreaterThan(0);
    expect(state.combo.currentChainProfit).toBeLessThan(floatingBefore);
    expect(state.lockedProfit + state.combo.currentChainProfit).toBeCloseTo(
      floatingBefore,
      1
    );
  });

  it('transitions to next MarketPressure or day end after reward selection', () => {
    const state = createRewardReadyState();
    const reward = state.rewardChoices[0];

    applyRewardChoice(state, reward.id);
    state.rewardChoices = [];
    state.phase = 'postReward';

    const nextPressureState = cloneState(state);
    startNextMarketPressure(nextPressureState);

    expect(nextPressureState.phase).toBe('playing');
    expect(nextPressureState.marketPressureIndex).toBe(1);
    expect(nextPressureState.marketPressure.name).toBe('消费回撤盘');
    expect(nextPressureState.ap).toBe(nextPressureState.maxAp);

    const dayEndState = cloneState(state);
    enterDayEndAfterReward(dayEndState);

    expect(dayEndState.phase).toBe('dayEnd');
  });

  it('applies initial combo bonus when continuing to the next pressure', () => {
    const state = createRewardReadyState();
    const reward: RewardOption = {
      id: 'test-initial-combo',
      kind: 'INITIAL_COMBO',
      title: '连击惯性',
      description: '下一场初始 combo +2。',
      value: 2
    };

    state.rewardChoices = [reward];
    applyRewardChoice(state, reward.id);
    startNextMarketPressure(state);

    expect(state.combo.comboCount).toBeGreaterThanOrEqual(2);
    expect(state.nextInitialCombo).toBe(0);
  });

  it('can regenerate choices deterministically for later reward tiers', () => {
    const state = createTestEventGameState({
      seed: 'reward-seed',
      rewardsTakenCount: 2
    });

    const first = generateRewardChoices(state).map((reward) => reward.id);
    const second = generateRewardChoices(state).map((reward) => reward.id);

    expect(first).toEqual(second);
    expect(createRewardSeed(state)).toBe('reward-seed-reward-2');
  });
});
