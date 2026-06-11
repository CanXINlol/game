import { describe, expect, it } from 'vitest';
import {
  endEncounterTurn,
  getEndTurnPreview,
  type MarketIntent
} from '../game/encounters';
import { TEST_EVENT_CARDS, type EventCard } from '../game/effects';
import { createTestEventGameState, playCard } from '../game/playCard';

describe('AP economy and end turn consequences', () => {
  it('blocks playing a card when AP is insufficient', () => {
    const card = getTestCard('test-card-closeout');
    const state = createTestEventGameState({
      hand: [card],
      actionPoints: 2,
      ap: 2,
      maxActionPoints: 3,
      maxAp: 3
    });

    const nextState = playCard(state, card.id);

    expect(nextState.hand).toHaveLength(1);
    expect(nextState.playedCardsThisTurn).toHaveLength(0);
    expect(nextState.actionPoints).toBe(2);
  });

  it('settles public intent, discards the turn, redraws, and resets AP', () => {
    const hand = [
      getTestCard('test-card-tech-buy'),
      getTestCard('test-card-limit-chase')
    ];
    const played = getTestCard('test-card-hot-rotation');
    const state = createTestEventGameState({
      risk: 10,
      hand,
      playedCardsThisTurn: [played],
      drawPile: [
        getTestCard('test-card-margin-add'),
        getTestCard('test-card-cash-insurance'),
        getTestCard('test-card-dip-rebound'),
        getTestCard('test-card-short-cover'),
        getTestCard('test-card-closeout')
      ],
      actionPoints: 0,
      ap: 0,
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        intent: createIntent('RISK_ATTACK', 12)
      }
    });
    state.currentIntentId = state.marketPressure.intent.id;

    endEncounterTurn(state);

    expect(state.risk).toBe(22);
    expect(state.playedCardsThisTurn).toHaveLength(0);
    expect(state.discardPile.map((card) => card.id)).toEqual(
      expect.arrayContaining([hand[0].id, hand[1].id, played.id])
    );
    expect(state.hand.length).toBeGreaterThan(0);
    expect(state.actionPoints).toBe(state.maxActionPoints);
    expect(state.lastTurnSummary).toContain('抽');
  });

  it('previews intent risk, discard count, draw count, and danger band', () => {
    const state = createTestEventGameState({
      risk: 70,
      hand: [getTestCard('test-card-tech-buy'), getTestCard('test-card-limit-chase')],
      playedCardsThisTurn: [getTestCard('test-card-hot-rotation')],
      marketPressure: {
        ...createTestEventGameState().marketPressure,
        intent: createIntent('RISK_ATTACK', 12)
      }
    });

    const preview = getEndTurnPreview(state);

    expect(preview).toContain('敌方意图');
    expect(preview).toContain('预计 Risk 变化：+12');
    expect(preview).toContain('将弃置 3 张牌');
    expect(preview).toContain('下回合抽');
    expect(preview).toContain('危险 Risk 区间');
  });

  it('caps bonus draw events to prevent free draw loops', () => {
    const drawCard = createCard({
      id: 'free-draw-loop',
      name: '免费抽牌测试',
      cost: 0,
      effects: [{ type: 'DRAW_CARD', value: 3 }]
    });
    const state = createTestEventGameState({
      hand: [drawCard],
      drawPile: [
        getTestCard('test-card-tech-buy'),
        getTestCard('test-card-limit-chase'),
        getTestCard('test-card-margin-add')
      ],
      tools: [],
      maxBonusDrawsPerTurn: 2
    });

    const nextState = playCard(state, drawCard.id);

    expect(nextState.bonusDrawsThisTurn).toBe(2);
    expect(nextState.hand).toHaveLength(2);
    expect(nextState.combo.eventLog.join('\n')).toContain('额外抽牌已达本回合上限');
  });

  it('caps copy effects to one successful copy each turn', () => {
    const buy = getTestCard('test-card-tech-buy');
    const firstCopy = { ...getTestCard('test-card-quant-copy'), id: 'copy-1' };
    const secondCopy = { ...getTestCard('test-card-quant-copy'), id: 'copy-2' };
    const state = createTestEventGameState({
      hand: [buy, firstCopy, secondCopy],
      tools: [],
      actionPoints: 6,
      ap: 6,
      maxActionPoints: 6,
      maxAp: 6,
      maxCopiesPerTurn: 1
    });

    const afterBuy = playCard(state, buy.id);
    const afterFirstCopy = playCard(afterBuy, firstCopy.id);
    const afterSecondCopy = playCard(afterFirstCopy, secondCopy.id);

    expect(afterSecondCopy.copiesThisTurn).toBe(1);
    expect(afterSecondCopy.combo.eventLog.join('\n')).toContain(
      '复制次数已达本回合上限'
    );
  });

  it('caps returned AP gains each turn', () => {
    const first = createCard({
      id: 'ap-1',
      name: '返还 AP 一',
      cost: 0,
      effects: [{ type: 'GAIN_AP', value: 1 }]
    });
    const second = createCard({
      id: 'ap-2',
      name: '返还 AP 二',
      cost: 0,
      effects: [{ type: 'GAIN_AP', value: 1 }]
    });
    const state = createTestEventGameState({
      hand: [first, second],
      actionPoints: 0,
      ap: 0,
      tools: [],
      maxBonusApGainsPerTurn: 1
    });

    const afterFirst = playCard(state, first.id);
    const afterSecond = playCard(afterFirst, second.id);

    expect(afterSecond.bonusApGainsThisTurn).toBe(1);
    expect(afterSecond.actionPoints).toBe(1);
    expect(afterSecond.combo.eventLog.join('\n')).toContain(
      '额外 AP 已达本回合上限'
    );
  });
});

function createIntent(type: MarketIntent['type'], value?: number): MarketIntent {
  return {
    id: `test-${type}`,
    type,
    label: type,
    description: `${type} preview`,
    value
  };
}

function getTestCard(cardId: string) {
  const card = TEST_EVENT_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error(`Missing test card ${cardId}`);
  }

  return { ...card, effects: card.effects.map((effect) => ({ ...effect })) };
}

function createCard(input: Pick<EventCard, 'id' | 'name' | 'cost' | 'effects'>): EventCard {
  return {
    sector: 'TECH',
    rank: 1,
    cardRole: 'EXTENDER',
    ...input
  };
}
