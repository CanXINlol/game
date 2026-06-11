import { applyComboEvent } from './combo';
import { getDayChoiceLabel } from './dayChoices';
import { drawFromContinuousDeck } from './deck';
import { gainCash } from './economy';
import type { GameEvent, GameEventType } from './events';
import {
  applyDirectMarketPressureDamage,
  applyMarketPressureEvent
} from './marketPressure';
import type { EventGameState } from './playCard';
import { generateRewardChoices } from './rewards';
import {
  applyRunFailureConditions,
  getRouteNode,
  isFinalBossCleared
} from './routeMap';
import {
  getCashOutRatioWithTrader,
  getTraderProfitMultiplier,
  getTraderRiskMultiplier,
  shouldTriggerQuantPassive
} from './traders';
import type { EventCardCost, EventCardRole } from './types';

export interface EventCard {
  id: string;
  name: string;
  sector: string;
  rank: number;
  cardType?: FormalCardType;
  archetype?: string;
  risk?: string;
  tags?: string[];
  baseReturn?: number;
  baseRisk?: number;
  playEffect?: string;
  cost: EventCardCost;
  cardRole: EventCardRole;
  exhaust?: boolean;
  retain?: boolean;
  effects: CardEffect[];
}

export type FormalCardType =
  | 'BUY'
  | 'CHASE'
  | 'DIP_BUY'
  | 'LEVERAGE'
  | 'CASH_OUT'
  | 'DRAW'
  | 'COPY'
  | 'SECTOR'
  | 'RISK'
  | 'FINISHER';

export type CardEffect =
  | { type: 'GAIN_PROFIT'; value: number; sector?: string }
  | { type: 'GAIN_RISK'; value: number }
  | { type: 'REDUCE_RISK'; value: number }
  | { type: 'GAIN_COMBO'; value: number }
  | { type: 'TRIGGER_SECTOR'; sector: string }
  | { type: 'TRIGGER_HOT_SECTOR' }
  | { type: 'TRIGGER_LIMIT_UP'; profit?: number; comboGain?: number }
  | { type: 'TRIGGER_LIMIT_UP_IF_PROFIT'; profit: number; comboGain: number }
  | { type: 'COPY_PREVIOUS_CARD' }
  | { type: 'DRAW_CARD'; value: number }
  | { type: 'GAIN_AP'; value: number }
  | { type: 'CASH_OUT'; ratio: number; riskReduction: number }
  | { type: 'GAIN_PROFIT_FROM_COMBO'; profitPerCombo: number }
  | { type: 'REBOUND_IF_EVENT'; eventTypes: GameEventType[]; profit: number; riskReduction: number }
  | { type: 'DAMAGE_PRESSURE_IF_HP_BELOW'; thresholdRatio: number; damage: number }
  | { type: 'END_TRADE' };

export interface EventTool {
  id: string;
  name: string;
  description: string;
  triggerEvents?: GameEventType[];
  trigger: ToolTrigger;
  effects: ToolEventEffect[];
  limitPerDay?: number;
  limitPerTurn?: number;
}

export interface ToolTrigger {
  type: GameEventType;
  meta?: Record<string, unknown>;
  minValue?: number;
  comboThresholds?: number[];
}

export type ToolEventEffect =
  | { type: 'GAIN_PROFIT'; value: number; sector?: string }
  | { type: 'GAIN_COMBO'; value: number }
  | { type: 'GAIN_RISK'; value: number }
  | { type: 'REDUCE_RISK'; value: number }
  | { type: 'DRAW_CARD'; value: number }
  | { type: 'GAIN_AP'; value: number }
  | { type: 'LOCK_FLOATING_PROFIT'; ratio: number }
  | { type: 'GAIN_PROFIT_BY_COMBO_THRESHOLD'; values: Record<number, number> };

export const TEST_EVENT_CARDS: EventCard[] = [
  {
    id: 'test-card-tech-buy',
    name: '幻芯买入',
    sector: 'TECH',
    rank: 3,
    cost: 1,
    cardRole: 'STARTER',
    effects: [
      { type: 'GAIN_PROFIT', value: 20, sector: 'TECH' },
      { type: 'TRIGGER_SECTOR', sector: 'TECH' }
    ]
  },
  {
    id: 'test-card-limit-chase',
    name: '涨停追击',
    sector: 'TECH',
    rank: 6,
    cost: 2,
    cardRole: 'PAYOFF',
    effects: [{ type: 'TRIGGER_LIMIT_UP_IF_PROFIT', profit: 25, comboGain: 1 }]
  },
  {
    id: 'test-card-margin-add',
    name: '融资加仓',
    sector: 'FINANCE',
    rank: 8,
    cost: 2,
    cardRole: 'PAYOFF',
    effects: [
      { type: 'GAIN_PROFIT', value: 40, sector: 'FINANCE' },
      { type: 'GAIN_RISK', value: 20 }
    ]
  },
  {
    id: 'test-card-quant-copy',
    name: '量化复制',
    sector: 'TECH',
    rank: 5,
    cost: 2,
    cardRole: 'EXTENDER',
    effects: [{ type: 'COPY_PREVIOUS_CARD' }]
  },
  {
    id: 'test-card-hot-rotation',
    name: '热点轮动',
    sector: 'CONSUMER',
    rank: 4,
    cost: 0,
    cardRole: 'EXTENDER',
    effects: [
      { type: 'TRIGGER_HOT_SECTOR' },
      { type: 'DRAW_CARD', value: 1 }
    ]
  },
  {
    id: 'test-card-cash-insurance',
    name: '止盈保险',
    sector: 'FINANCE',
    rank: 2,
    cost: 0,
    cardRole: 'DEFENSE',
    effects: [{ type: 'CASH_OUT', ratio: 0.25, riskReduction: 10 }]
  },
  {
    id: 'test-card-hot-stock-ignite',
    name: '妖股点火',
    sector: 'ENERGY',
    rank: 9,
    cost: 2,
    cardRole: 'PAYOFF',
    effects: [
      { type: 'TRIGGER_LIMIT_UP', comboGain: 2 },
      { type: 'GAIN_RISK', value: 15 }
    ]
  },
  {
    id: 'test-card-dip-rebound',
    name: '低吸反弹',
    sector: 'MEDICAL',
    rank: 4,
    cost: 1,
    cardRole: 'DEFENSE',
    effects: [
      {
        type: 'REBOUND_IF_EVENT',
        eventTypes: ['RISK_GAINED', 'LOSS_TAKEN'],
        profit: 22,
        riskReduction: 5
      }
    ]
  },
  {
    id: 'test-card-short-cover',
    name: '空头回补',
    sector: 'FINANCE',
    rank: 7,
    cost: 1,
    cardRole: 'PAYOFF',
    effects: [{ type: 'DAMAGE_PRESSURE_IF_HP_BELOW', thresholdRatio: 0.5, damage: 35 }]
  },
  {
    id: 'test-card-closeout',
    name: '收盘清算',
    sector: 'CONSUMER',
    rank: 2,
    cost: 3,
    cardRole: 'FINISHER',
    effects: [
      { type: 'GAIN_PROFIT_FROM_COMBO', profitPerCombo: 18 },
      { type: 'END_TRADE' }
    ]
  }
];

export const TEST_EVENT_TOOLS: EventTool[] = [
  {
    id: 'test-tool-tech-speaker',
    name: '科技扩音器',
    description: '触发 TECH 板块事件时，获得 8 收益，combo +1。',
    trigger: { type: 'SECTOR_TRIGGERED', meta: { sector: 'TECH' } },
    effects: [
      { type: 'GAIN_PROFIT', value: 8, sector: 'TECH' },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'test-tool-limit-calculator',
    name: '涨停板计算器',
    description: '触发 LIMIT_UP 时，combo +2，获得 15 收益。',
    trigger: { type: 'LIMIT_UP' },
    effects: [
      { type: 'GAIN_COMBO', value: 2 },
      { type: 'GAIN_PROFIT', value: 15, sector: 'TECH' }
    ]
  },
  {
    id: 'test-tool-risk-compensator',
    name: '风险补偿器',
    description: '获得 10 点以上风险时，获得 12 收益。',
    trigger: { type: 'RISK_GAINED', minValue: 10 },
    effects: [{ type: 'GAIN_PROFIT', value: 12, sector: 'FINANCE' }]
  },
  {
    id: 'test-tool-old-cup',
    name: '老股民茶杯',
    description: '触发 RISK_GAINED 时，每天最多 1 次，risk -8。',
    trigger: { type: 'RISK_GAINED' },
    limitPerDay: 1,
    effects: [{ type: 'REDUCE_RISK', value: 8 }]
  },
  {
    id: 'test-tool-quant-terminal',
    name: '量化终端',
    description: '触发 CARD_COPIED 时，抽 1 张牌，combo +1。',
    trigger: { type: 'CARD_COPIED' },
    effects: [
      { type: 'DRAW_CARD', value: 1 },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'test-tool-cash-box',
    name: '现金保险箱',
    description: '触发 CASH_OUT 时，额外锁定 10% 浮盈，risk -5。',
    trigger: { type: 'CASH_OUT' },
    effects: [
      { type: 'LOCK_FLOATING_PROFIT', ratio: 0.1 },
      { type: 'REDUCE_RISK', value: 5 }
    ]
  },
  {
    id: 'test-tool-combo-display',
    name: '连击显示器',
    description: 'comboCount 达到 5 / 10 / 20 时，分别获得 20 / 50 / 120 收益。',
    trigger: { type: 'COMBO_GAINED', comboThresholds: [5, 10, 20] },
    effects: [{ type: 'GAIN_PROFIT_BY_COMBO_THRESHOLD', values: { 5: 20, 10: 50, 20: 120 } }]
  },
  {
    id: 'test-tool-hot-money-seat',
    name: '游资席位',
    description: '触发 LIMIT_UP 时，每回合最多 3 次，获得小额收益，但 risk +5。',
    trigger: { type: 'LIMIT_UP' },
    limitPerTurn: 3,
    effects: [
      { type: 'GAIN_PROFIT', value: 6, sector: 'FINANCE' },
      { type: 'GAIN_RISK', value: 5 }
    ]
  }
];

export function createCardEffectEvents(
  card: EventCard,
  state: EventGameState,
  options: { copied?: boolean; previousCard?: EventCard | null } = {}
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const effect of card.effects) {
    if (effect.type === 'GAIN_PROFIT') {
      events.push(createProfitEvent(state, card, effect.value, effect.sector ?? card.sector));
    }

    if (effect.type === 'GAIN_RISK') {
      events.push(...createRiskGainEvents(state, card.id, card.name, effect.value, card.sector));
    }

    if (effect.type === 'REDUCE_RISK') {
      events.push(createRiskReducedEvent(state, card.id, card.name, effect.value));
    }

    if (effect.type === 'GAIN_COMBO') {
      events.push(createComboEvent(state, card.id, card.name, effect.value));
    }

    if (effect.type === 'TRIGGER_SECTOR') {
      events.push(createSectorEvent(state, card.id, card.name, effect.sector));
    }

    if (effect.type === 'TRIGGER_HOT_SECTOR') {
      events.push(createSectorEvent(state, card.id, card.name, state.hotSector));
    }

    if (effect.type === 'TRIGGER_LIMIT_UP') {
      events.push(
        state.createEvent({
          type: 'LIMIT_UP',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 点火成功，触发涨停。`,
          meta: { sector: card.sector }
        })
      );

      if (effect.profit) {
        events.push(createProfitEvent(state, card, effect.profit, card.sector));
      }

      if (effect.comboGain) {
        events.push(createComboEvent(state, card.id, card.name, effect.comboGain));
      }
    }

    if (effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT') {
      if (state.combo.currentChainProfit > 0) {
        events.push(
          state.createEvent({
            type: 'LIMIT_UP',
            sourceId: card.id,
            sourceName: card.name,
            message: `${card.name} 追击成功，触发涨停。`,
            meta: { sector: card.sector }
          }),
          createProfitEvent(state, card, effect.profit, card.sector, '追击收益'),
          createComboEvent(state, card.id, card.name, effect.comboGain)
        );
      } else {
        events.push(
          state.createEvent({
            type: 'LIMIT_DOWN',
            sourceId: card.id,
            sourceName: card.name,
            message: `${card.name} 缺少已有收益，追击暂未触发。`
          })
        );
      }
    }

    if (effect.type === 'COPY_PREVIOUS_CARD' && !options.copied) {
      const previousCard = options.previousCard ?? state.lastPlayedCard;

      if (state.copiesThisTurn >= state.maxCopiesPerTurn) {
        events.push(
          state.createEvent({
            type: 'LIMIT_DOWN',
            sourceId: card.id,
            sourceName: card.name,
            message: `${card.name} 的复制次数已达本回合上限。`
          })
        );
        continue;
      }

      events.push(
        state.createEvent({
          type: 'CARD_COPIED',
          sourceId: card.id,
          sourceName: card.name,
          message: previousCard
            ? `${card.name} 复制 ${previousCard.name} 的基础效果。`
            : `${card.name} 没有可复制的上一张牌。`
        })
      );

      if (previousCard) {
        events.push(
          ...createCardEffectEvents(previousCard, state, {
            copied: true,
            previousCard
          })
        );
      }
    }

    if (effect.type === 'DRAW_CARD') {
      events.push(...createDrawEvents(state, card.id, card.name, effect.value));
    }

    if (effect.type === 'GAIN_AP') {
      events.push(...createApGainEvents(state, card.id, card.name, effect.value));
    }

    if (effect.type === 'CASH_OUT') {
      const cashOutRatio = getCashOutRatioWithTrader(state, effect.ratio);
      const lockAmount = roundToTwoDecimals(state.combo.currentChainProfit * cashOutRatio);

      events.push(
        state.createEvent({
          type: 'CASH_OUT',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 锁定 ${lockAmount} 浮盈。`,
          value: lockAmount,
          meta: { ratio: cashOutRatio, baseRatio: effect.ratio }
        }),
        createRiskReducedEvent(state, card.id, card.name, effect.riskReduction)
      );
    }

    if (effect.type === 'GAIN_PROFIT_FROM_COMBO') {
      const profit = state.combo.comboCount * effect.profitPerCombo;
      events.push(createProfitEvent(state, card, profit, card.sector, '爆发收益'));
    }

    if (effect.type === 'REBOUND_IF_EVENT') {
      const canRebound = effect.eventTypes.some((eventType) =>
        state.resolvedEventTypes.includes(eventType)
      );

      if (canRebound) {
        events.push(
          createProfitEvent(state, card, effect.profit, card.sector, '反弹收益'),
          createRiskReducedEvent(state, card.id, card.name, effect.riskReduction)
        );
      } else {
        events.push(
          state.createEvent({
            type: 'LOSS_TAKEN',
            sourceId: card.id,
            sourceName: card.name,
            message: `${card.name} 等待风险事件，暂未反弹。`
          })
        );
      }
    }

    if (effect.type === 'DAMAGE_PRESSURE_IF_HP_BELOW') {
      const ratio = state.marketPressure.hp / state.marketPressure.maxHp;

      if (ratio < effect.thresholdRatio) {
        events.push(
          state.createEvent({
            type: 'MARKET_PRESSURE_DAMAGED',
            sourceId: card.id,
            sourceName: card.name,
            message: `${card.name} 造成 ${effect.damage} 点空头回补伤害。`,
            value: effect.damage,
            meta: { directDamage: true }
          })
        );
      } else {
        events.push(
          state.createEvent({
            type: 'LIMIT_DOWN',
            sourceId: card.id,
            sourceName: card.name,
            message: `${card.name} 等待压力低位，暂未触发回补。`
          })
        );
      }
    }

    if (effect.type === 'END_TRADE') {
      events.push(
        state.createEvent({
          type: 'TRADE_ENDED',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 结束当前交易。`
        })
      );
    }
  }

  return events;
}

export function resolveGameEvent(
  state: EventGameState,
  event: GameEvent
): GameEvent[] {
  const resolvedEvent = applyRiskMultiplierToEvent(
    state,
    applyProfitMultiplierToEvent(state, event)
  );

  state.combo.eventLog.push(resolvedEvent.message);
  state.resolvedEventTypes.push(resolvedEvent.type);
  state.resolvedEventsThisAction.push(resolvedEvent);
  state.combo = applyComboEvent(state.combo, resolvedEvent);

  const nextEvents: GameEvent[] = [];

  if (resolvedEvent.type === 'CARD_DRAWN') {
    state.bonusDrawsThisTurn += resolvedEvent.value ?? 1;
    drawCardsIntoHand(state, resolvedEvent.value ?? 1);
  }

  if (resolvedEvent.type === 'CARD_COPIED') {
    state.copiesThisTurn += 1;
  }

  if (resolvedEvent.type === 'AP_GAINED') {
    state.bonusApGainsThisTurn += 1;
    state.actionPoints = roundToTwoDecimals(
      state.actionPoints + (resolvedEvent.value ?? 0)
    );
    state.ap = state.actionPoints;
  }

  if (shouldTriggerQuantPassive(state, resolvedEvent)) {
    state.traderPassiveUsesThisTurn.quantFirstDrawOrCopy = 1;
    nextEvents.push(
      state.createEvent({
        type: 'PROFIT_GAINED',
        sourceId: 'trader-quant-newbie',
        sourceName: '閲忓寲鏂颁汉',
        message: '量化新人第一次抽牌或复制，本回合额外获得 8 收益。',
        value: 8,
        meta: { sector: 'TECH', traderPassive: true }
      })
    );
  }

  if (resolvedEvent.type === 'CASH_OUT') {
    state.lockedProfit = roundToTwoDecimals(
      state.lockedProfit + (resolvedEvent.value ?? 0)
    );
    gainCash(state, resolvedEvent.value ?? 0, resolvedEvent.sourceName);
  }

  if (resolvedEvent.type === 'RISK_GAINED') {
    state.risk = roundToTwoDecimals(state.risk + (resolvedEvent.value ?? 0));

    if (state.risk >= state.maxRisk) {
      nextEvents.push(
        state.createEvent({
          type: 'BANKRUPTCY_WARNING',
          sourceId: resolvedEvent.sourceId,
          sourceName: resolvedEvent.sourceName,
          message: `风险达到 ${state.risk}/${state.maxRisk}，触发爆仓警告。`,
          value: state.risk
        })
      );
    }
  }

  if (resolvedEvent.type === 'RISK_REDUCED') {
    state.risk = Math.max(
      0,
      roundToTwoDecimals(state.risk - (resolvedEvent.value ?? 0))
    );
  }

  if (resolvedEvent.type === 'PROFIT_GAINED') {
    nextEvents.push(...applyMarketPressureEvent(state, resolvedEvent));
  }

  if (
    resolvedEvent.type === 'MARKET_PRESSURE_DAMAGED' &&
    resolvedEvent.meta?.directDamage
  ) {
    nextEvents.push(...applyDirectMarketPressureDamage(state, resolvedEvent));
  }

  if (resolvedEvent.type === 'MARKET_PRESSURE_CLEARED') {
    state.encounterStatus = 'CLEARED';
    state.canResolveIntent = false;
    awardMarketPressureCash(state);
    if (isFinalBossCleared(state)) {
      state.phase = 'RUN_WON';
      state.runHistory.push('通关：击败第三幕最终 Boss。');
      state.combo.eventLog.push('最终 Boss 被击败，本局通关。');
    } else {
      state.phase = 'REWARD';
    }
  }

  if (resolvedEvent.type === 'REWARD_DROPPED' && state.phase === 'REWARD') {
    state.rewardChoices = generateRewardChoices(state);
  }

  if (resolvedEvent.type === 'BANKRUPTCY_WARNING') {
    const failed = applyRunFailureConditions(state);
    state.canResolveIntent = false;
    if (failed) {
      state.runHistory.push(
        `爆仓：Risk ${state.risk}/${state.maxRisk}，最后一次选择 ${getDayChoiceLabel(state.lastDayChoice)}。`
      );
      state.combo.eventLog.push(
        `最后一次选择：${getDayChoiceLabel(state.lastDayChoice)}。`
      );
    }
  }

  if (
    resolvedEvent.type === 'TRADE_ENDED' &&
    (state.phase === 'PLAYER_TURN' || state.phase === 'RESOLVING_QUEUE')
  ) {
    state.phase = 'ENEMY_INTENT';
    state.canResolveIntent = true;
    state.intentResolvedThisTurn = false;
  }

  nextEvents.push(...resolveToolTriggers(state, resolvedEvent));

  return nextEvents;
}

function applyProfitMultiplierToEvent(
  state: EventGameState,
  event: GameEvent
): GameEvent {
  if (event.type !== 'PROFIT_GAINED') {
    return event;
  }

  const baseValue = event.value ?? 0;
  const turboturnMultiplier = state.turboturnMultiplier ?? 1;
  const intentProfitMultiplier = getIntentProfitMultiplier(state, event);
  const traderProfitMultiplier = getTraderProfitMultiplier(state, event);
  const totalMultiplier = roundToTwoDecimals(
    state.profitMultiplier *
      turboturnMultiplier *
      intentProfitMultiplier *
      traderProfitMultiplier
  );

  if (totalMultiplier === 1) {
    return event;
  }

  const value = roundToTwoDecimals(baseValue * totalMultiplier);

  return {
    ...event,
    value,
    message: `${event.sourceName} 获得 ${value} 收益（基础 ${baseValue} x${totalMultiplier.toFixed(2)}）。`,
    meta: {
      ...event.meta,
      baseValue,
      profitMultiplier: state.profitMultiplier,
      turboturnMultiplier,
      intentProfitMultiplier,
      traderProfitMultiplier,
      totalMultiplier
    }
  };
}

function applyRiskMultiplierToEvent(
  state: EventGameState,
  event: GameEvent
): GameEvent {
  if (event.type !== 'RISK_GAINED') {
    return event;
  }

  const baseValue = event.value ?? 0;
  const traderRiskMultiplier = getTraderRiskMultiplier(state);
  const totalMultiplier = roundToTwoDecimals(
    state.intentRiskMultiplier * traderRiskMultiplier
  );

  if (totalMultiplier === 1) {
    return event;
  }

  const value = roundToTwoDecimals(baseValue * totalMultiplier);

  return {
    ...event,
    value,
    message: `${event.sourceName} 增加 ${value} 爆仓风险（基础 ${baseValue} x${totalMultiplier.toFixed(2)}）。`,
    meta: {
      ...event.meta,
      baseValue,
      intentRiskMultiplier: state.intentRiskMultiplier,
      traderRiskMultiplier,
      totalMultiplier
    }
  };
}

function getIntentProfitMultiplier(state: EventGameState, event: GameEvent) {
  let multiplier = state.intentProfitMultiplier ?? 1;

  if (event.meta?.sector && event.meta.sector === state.weakenedSector) {
    multiplier *= 0.75;
  }

  return roundToTwoDecimals(multiplier);
}

function resolveToolTriggers(state: EventGameState, event: GameEvent): GameEvent[] {
  const events: GameEvent[] = [];

  for (const tool of state.tools) {
    const comboThreshold = getMatchedComboThreshold(state, tool, event);

    if (!matchesToolTrigger(state, tool, event, comboThreshold)) {
      continue;
    }

    recordToolUse(state, tool, comboThreshold);

    events.push(
      state.createEvent({
        type: 'TOOL_TRIGGERED',
        sourceId: tool.id,
        sourceName: tool.name,
        message: `${tool.name} 被触发。`,
        meta: { triggerEventId: event.id, comboThreshold }
      })
    );

    for (const effect of tool.effects) {
      if (effect.type === 'GAIN_PROFIT') {
        events.push(
          createProfitEventFromSource(
            state,
            tool.id,
            tool.name,
            effect.value,
            effect.sector
          )
        );
      }

      if (effect.type === 'GAIN_COMBO') {
        events.push(createComboEvent(state, tool.id, tool.name, effect.value));
      }

      if (effect.type === 'GAIN_RISK') {
        events.push(...createRiskGainEvents(state, tool.id, tool.name, effect.value));
      }

      if (effect.type === 'REDUCE_RISK') {
        events.push(createRiskReducedEvent(state, tool.id, tool.name, effect.value));
      }

      if (effect.type === 'DRAW_CARD') {
        events.push(...createDrawEvents(state, tool.id, tool.name, effect.value));
      }

      if (effect.type === 'GAIN_AP') {
        events.push(...createApGainEvents(state, tool.id, tool.name, effect.value));
      }

      if (effect.type === 'LOCK_FLOATING_PROFIT') {
        const lockAmount = roundToTwoDecimals(
          state.combo.currentChainProfit * effect.ratio
        );
        events.push(
          state.createEvent({
            type: 'CASH_OUT',
            sourceId: tool.id,
            sourceName: tool.name,
            message: `${tool.name} 额外锁定 ${lockAmount} 浮盈。`,
            value: lockAmount,
            meta: { ratio: effect.ratio }
          })
        );
      }

      if (effect.type === 'GAIN_PROFIT_BY_COMBO_THRESHOLD' && comboThreshold) {
        const value = effect.values[comboThreshold] ?? 0;

        if (value > 0) {
          events.push(
            createProfitEventFromSource(
              state,
              tool.id,
              tool.name,
              value,
              'TECH',
              `${comboThreshold} 连击奖励`
            )
          );
        }
      }
    }
  }

  return events;
}

function createProfitEvent(
  state: EventGameState,
  card: EventCard,
  value: number,
  sector: string,
  label = '收益'
) {
  return state.createEvent({
    type: 'PROFIT_GAINED',
    sourceId: card.id,
    sourceName: card.name,
    message: `${card.name} 获得 ${value} ${label}。`,
    value,
    meta: {
      sector,
      cardType: card.cardType,
      risk: card.risk,
      tags: card.tags ? [...card.tags] : undefined
    }
  });
}

function createProfitEventFromSource(
  state: EventGameState,
  sourceId: string,
  sourceName: string,
  value: number,
  sector?: string,
  label = '收益'
) {
  return state.createEvent({
    type: 'PROFIT_GAINED',
    sourceId,
    sourceName,
    message: `${sourceName} 获得 ${value} ${label}。`,
    value,
    meta: { sector }
  });
}

function createRiskGainEvents(
  state: EventGameState,
  sourceId: string,
  sourceName: string,
  value: number,
  sector?: string
) {
  return [
    state.createEvent({
      type: 'LEVERAGE_ADDED',
      sourceId,
      sourceName,
      message: `${sourceName} 增加风险敞口。`,
      meta: { sector }
    }),
    state.createEvent({
      type: 'RISK_GAINED',
      sourceId,
      sourceName,
      message: `${sourceName} 增加 ${value} 爆仓风险。`,
      value
    })
  ];
}

function createRiskReducedEvent(
  state: EventGameState,
  sourceId: string,
  sourceName: string,
  value: number
) {
  return state.createEvent({
    type: 'RISK_REDUCED',
    sourceId,
    sourceName,
    message: `${sourceName} 降低 ${value} 爆仓风险。`,
    value
  });
}

function createSectorEvent(
  state: EventGameState,
  sourceId: string,
  sourceName: string,
  sector: string
) {
  return state.createEvent({
    type: 'SECTOR_TRIGGERED',
    sourceId,
    sourceName,
    message: `${sourceName} 触发 ${sector} 板块。`,
    meta: { sector }
  });
}

function createComboEvent(
  state: EventGameState,
  sourceId: string,
  sourceName: string,
  value: number
) {
  return state.createEvent({
    type: 'COMBO_GAINED',
    sourceId,
    sourceName,
    message: `${sourceName} 让 combo +${value}。`,
    value
  });
}

function createDrawEvents(
  state: EventGameState,
  sourceId: string,
  sourceName: string,
  count: number
) {
  const remainingDraws = Math.max(
    0,
    state.maxBonusDrawsPerTurn - state.bonusDrawsThisTurn
  );
  const allowedCount = Math.min(count, remainingDraws);
  const events = Array.from({ length: allowedCount }, () =>
    state.createEvent({
      type: 'CARD_DRAWN',
      sourceId,
      sourceName,
      message: `${sourceName} 抽 1 张牌。`,
      value: 1
    })
  );

  if (allowedCount < count) {
    events.push(
      state.createEvent({
        type: 'LIMIT_DOWN',
        sourceId,
        sourceName,
        message: `${sourceName} 的额外抽牌已达本回合上限。`
      })
    );
  }

  return events;
}

function createApGainEvents(
  state: EventGameState,
  sourceId: string,
  sourceName: string,
  value: number
) {
  if (state.bonusApGainsThisTurn >= state.maxBonusApGainsPerTurn) {
    return [
      state.createEvent({
        type: 'LIMIT_DOWN',
        sourceId,
        sourceName,
        message: `${sourceName} 的额外 AP 已达本回合上限。`
      })
    ];
  }

  return [
    state.createEvent({
      type: 'AP_GAINED',
      sourceId,
      sourceName,
      message: `${sourceName} 返还 ${value} AP。`,
      value
    })
  ];
}

function drawCardsIntoHand(state: EventGameState, count: number) {
  const nextState = drawFromContinuousDeck(state, count);

  state.hand = nextState.hand;
  state.drawPile = nextState.drawPile;
  state.discardPile = nextState.discardPile;
  state.reshuffleCount = nextState.reshuffleCount;
  state.cardsDrawnThisTurn = nextState.cardsDrawnThisTurn;
}

function matchesToolTrigger(
  state: EventGameState,
  tool: EventTool,
  event: GameEvent,
  comboThreshold: number | null
) {
  const trigger = tool.trigger;

  if (trigger.type !== event.type) {
    return false;
  }

  if (event.sourceId === tool.id) {
    return false;
  }

  if (trigger.minValue !== undefined && (event.value ?? 0) < trigger.minValue) {
    return false;
  }

  if (trigger.comboThresholds && comboThreshold === null) {
    return false;
  }

  if (tool.limitPerDay !== undefined && getToolUseCount(state, tool) >= tool.limitPerDay) {
    return false;
  }

  if (tool.limitPerTurn !== undefined && getToolUseCount(state, tool) >= tool.limitPerTurn) {
    return false;
  }

  if (trigger.meta) {
    return Object.entries(trigger.meta).every(([key, value]) => {
      return event.meta?.[key] === value;
    });
  }

  return true;
}

function getMatchedComboThreshold(
  state: EventGameState,
  tool: EventTool,
  event: GameEvent
) {
  const thresholds = tool.trigger.comboThresholds;

  if (!thresholds || event.type !== 'COMBO_GAINED') {
    return null;
  }

  const triggered = state.triggeredComboMilestones[tool.id] ?? [];

  return (
    thresholds.find((threshold) => {
      return state.combo.comboCount >= threshold && !triggered.includes(threshold);
    }) ?? null
  );
}

function recordToolUse(
  state: EventGameState,
  tool: EventTool,
  comboThreshold: number | null
) {
  state.toolUseCounts[tool.id] = getToolUseCount(state, tool) + 1;

  if (comboThreshold !== null) {
    state.triggeredComboMilestones[tool.id] = [
      ...(state.triggeredComboMilestones[tool.id] ?? []),
      comboThreshold
    ];
  }
}

function getToolUseCount(state: EventGameState, tool: EventTool) {
  return state.toolUseCounts[tool.id] ?? 0;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function awardMarketPressureCash(state: EventGameState) {
  const currentNode = state.routeMap.currentNodeId
    ? getRouteNode(state.routeMap, state.routeMap.currentNodeId)
    : null;
  const act = currentNode?.act ?? 1;
  const cashReward =
    currentNode?.type === 'ELITE_MARKET'
      ? act === 1
        ? 110
        : act === 2
          ? 120
          : 140
      : currentNode?.type === 'BOSS'
        ? 140
        : act === 1
          ? 45
          : act === 2
            ? 80
            : 115;

  gainCash(state, cashReward, '鍑荤┛濂栧姳');
}
