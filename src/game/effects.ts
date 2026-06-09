import { applyComboEvent } from './combo';
import type { GameEvent, GameEventType } from './events';
import { applyMarketPressureEvent } from './marketPressure';
import type { EventGameState } from './playCard';

export interface EventCard {
  id: string;
  name: string;
  sector: string;
  rank: number;
  effects: CardEffect[];
}

export type CardEffect =
  | { type: 'GAIN_PROFIT'; value: number; sector?: string }
  | { type: 'GAIN_RISK'; value: number }
  | { type: 'TRIGGER_SECTOR'; sector: string }
  | { type: 'TRIGGER_LIMIT_UP_IF_PROFIT'; profit: number; comboGain: number }
  | { type: 'COPY_PREVIOUS_CARD' }
  | { type: 'GAIN_PROFIT_FROM_COMBO'; profitPerCombo: number }
  | { type: 'END_TRADE' };

export interface EventTool {
  id: string;
  name: string;
  description: string;
  trigger: ToolTrigger;
  effects: ToolEventEffect[];
}

export interface ToolTrigger {
  type: GameEventType;
  meta?: Record<string, unknown>;
  minValue?: number;
}

export type ToolEventEffect =
  | { type: 'GAIN_PROFIT'; value: number; sector?: string }
  | { type: 'GAIN_COMBO'; value: number };

export const TEST_EVENT_CARDS: EventCard[] = [
  {
    id: 'test-card-tech-buy',
    name: '幻芯买入',
    sector: 'TECH',
    rank: 3,
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
    effects: [{ type: 'TRIGGER_LIMIT_UP_IF_PROFIT', profit: 25, comboGain: 1 }]
  },
  {
    id: 'test-card-margin-add',
    name: '融资加仓',
    sector: 'FINANCE',
    rank: 8,
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
    effects: [{ type: 'COPY_PREVIOUS_CARD' }]
  },
  {
    id: 'test-card-closeout',
    name: '收盘清算',
    sector: 'CONSUMER',
    rank: 2,
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
      events.push(
        state.createEvent({
          type: 'PROFIT_GAINED',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 获得 ${effect.value} 收益。`,
          value: effect.value,
          meta: { sector: effect.sector ?? card.sector }
        })
      );
    }

    if (effect.type === 'GAIN_RISK') {
      events.push(
        state.createEvent({
          type: 'LEVERAGE_ADDED',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 使用融资加仓。`,
          meta: { sector: card.sector }
        }),
        state.createEvent({
          type: 'RISK_GAINED',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 增加 ${effect.value} 爆仓风险。`,
          value: effect.value
        })
      );
    }

    if (effect.type === 'TRIGGER_SECTOR') {
      events.push(
        state.createEvent({
          type: 'SECTOR_TRIGGERED',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 触发 ${effect.sector} 板块。`,
          meta: { sector: effect.sector }
        })
      );
    }

    if (
      effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT' &&
      state.combo.currentChainProfit > 0
    ) {
      events.push(
        state.createEvent({
          type: 'LIMIT_UP',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 追击成功，触发涨停。`
        }),
        state.createEvent({
          type: 'PROFIT_GAINED',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 获得 ${effect.profit} 追击收益。`,
          value: effect.profit,
          meta: { sector: card.sector }
        }),
        state.createEvent({
          type: 'COMBO_GAINED',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 让 combo +${effect.comboGain}。`,
          value: effect.comboGain
        })
      );
    }

    if (effect.type === 'COPY_PREVIOUS_CARD' && !options.copied) {
      const previousCard = options.previousCard ?? state.lastPlayedCard;

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

    if (effect.type === 'GAIN_PROFIT_FROM_COMBO') {
      const profit = state.combo.comboCount * effect.profitPerCombo;

      events.push(
        state.createEvent({
          type: 'PROFIT_GAINED',
          sourceId: card.id,
          sourceName: card.name,
          message: `${card.name} 根据 combo 获得 ${profit} 爆发收益。`,
          value: profit,
          meta: { sector: card.sector }
        })
      );
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
  state.combo.eventLog.push(event.message);
  state.combo = applyComboEvent(state.combo, event);

  const nextEvents: GameEvent[] = [];

  if (event.type === 'RISK_GAINED') {
    state.risk = roundToTwoDecimals(state.risk + (event.value ?? 0));

    if (state.risk >= state.maxRisk) {
      nextEvents.push(
        state.createEvent({
          type: 'BANKRUPTCY_WARNING',
          sourceId: event.sourceId,
          sourceName: event.sourceName,
          message: `风险达到 ${state.risk}/${state.maxRisk}，触发爆仓警告。`,
          value: state.risk
        })
      );
    }
  }

  if (event.type === 'RISK_REDUCED') {
    state.risk = Math.max(0, roundToTwoDecimals(state.risk - (event.value ?? 0)));
  }

  if (event.type === 'PROFIT_GAINED') {
    nextEvents.push(...applyMarketPressureEvent(state, event));
  }

  if (event.type === 'MARKET_PRESSURE_CLEARED') {
    state.phase = 'reward';
  }

  if (event.type === 'BANKRUPTCY_WARNING') {
    state.phase = 'bankrupt';
  }

  if (event.type === 'TRADE_ENDED' && state.phase === 'playing') {
    state.phase = 'dayEnd';
  }

  nextEvents.push(...resolveToolTriggers(state, event));

  return nextEvents;
}

function resolveToolTriggers(state: EventGameState, event: GameEvent): GameEvent[] {
  const events: GameEvent[] = [];

  for (const tool of state.tools) {
    if (!matchesToolTrigger(tool.trigger, event)) {
      continue;
    }

    events.push(
      state.createEvent({
        type: 'TOOL_TRIGGERED',
        sourceId: tool.id,
        sourceName: tool.name,
        message: `${tool.name} 被触发。`,
        meta: { triggerEventId: event.id }
      })
    );

    for (const effect of tool.effects) {
      if (effect.type === 'GAIN_PROFIT') {
        events.push(
          state.createEvent({
            type: 'PROFIT_GAINED',
            sourceId: tool.id,
            sourceName: tool.name,
            message: `${tool.name} 获得 ${effect.value} 收益。`,
            value: effect.value,
            meta: { sector: effect.sector }
          })
        );
      }

      if (effect.type === 'GAIN_COMBO') {
        events.push(
          state.createEvent({
            type: 'COMBO_GAINED',
            sourceId: tool.id,
            sourceName: tool.name,
            message: `${tool.name} 让 combo +${effect.value}。`,
            value: effect.value
          })
        );
      }
    }
  }

  return events;
}

function matchesToolTrigger(trigger: ToolTrigger, event: GameEvent) {
  if (trigger.type !== event.type) {
    return false;
  }

  if (trigger.minValue !== undefined && (event.value ?? 0) < trigger.minValue) {
    return false;
  }

  if (trigger.meta) {
    return Object.entries(trigger.meta).every(([key, value]) => {
      return event.meta?.[key] === value;
    });
  }

  return true;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
