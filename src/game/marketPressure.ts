import type { GameEvent } from './events';
import type { EventGameState } from './playCard';

export interface MarketPressure {
  id: string;
  name: string;
  description: string;
  hp: number;
  maxHp: number;
  shield: number;
  weaknessSector: string;
  resistanceSector: string;
  intent: string;
  reward: string;
}

export const MARKET_PRESSURE_DEFINITIONS: Omit<MarketPressure, 'hp'>[] = [
  {
    id: 'pressure-tech-rumor',
    name: '题材分歧盘',
    description: '一段虚构市场压力，正在考验玩家能不能连续打出收益事件。',
    maxHp: 120,
    shield: 0,
    weaknessSector: 'TECH',
    resistanceSector: 'FINANCE',
    intent: '下回合可能提高风险',
    reward: 'combo 向奖励'
  },
  {
    id: 'pressure-consumer-pullback',
    name: '消费回撤盘',
    description: '消费板块退潮，需要热点轮动和板块连锁才能击穿。',
    maxHp: 100,
    shield: 10,
    weaknessSector: 'CONSUMER',
    resistanceSector: 'MEDICAL',
    intent: '提高 shield，鼓励多段 combo',
    reward: 'combo 向奖励'
  },
  {
    id: 'pressure-finance-squeeze',
    name: '金融挤压盘',
    description: '杠杆收益高，但风险事件会更频繁地打断 combo。',
    maxHp: 140,
    shield: 0,
    weaknessSector: 'FINANCE',
    resistanceSector: 'ENERGY',
    intent: '放大风险收益博弈',
    reward: 'combo 向奖励'
  }
];

export function createTestMarketPressure(): MarketPressure {
  return createMarketPressureByIndex('test-run', 0);
}

export function createMarketPressureByIndex(_seed: string, index: number): MarketPressure {
  const definition =
    MARKET_PRESSURE_DEFINITIONS[index % MARKET_PRESSURE_DEFINITIONS.length];

  return {
    ...definition,
    hp: definition.maxHp
  };
}

export function applyMarketPressureEvent(
  state: EventGameState,
  event: GameEvent
): GameEvent[] {
  if (event.type !== 'PROFIT_GAINED') {
    return [];
  }

  const profitValue = event.value ?? 0;

  if (profitValue <= 0 || state.marketPressure.hp <= 0) {
    return [];
  }

  const sector = event.meta?.sector;
  let damage = profitValue * state.combo.comboMultiplier;

  if (sector === state.marketPressure.weaknessSector) {
    damage *= 1.35;
  }

  if (sector === state.marketPressure.resistanceSector) {
    damage *= 0.65;
  }

  const shieldDamage = Math.min(state.marketPressure.shield, damage);
  const hpDamage = roundToTwoDecimals(damage - shieldDamage);
  state.marketPressure = {
    ...state.marketPressure,
    shield: roundToTwoDecimals(state.marketPressure.shield - shieldDamage),
    hp: Math.max(0, roundToTwoDecimals(state.marketPressure.hp - hpDamage))
  };

  const events: GameEvent[] = [
    state.createEvent({
      type: 'MARKET_PRESSURE_DAMAGED',
      sourceId: state.marketPressure.id,
      sourceName: state.marketPressure.name,
      message: `${state.marketPressure.name} 受到 ${hpDamage} 点压力伤害。`,
      value: hpDamage,
      meta: { sector }
    })
  ];

  if (state.marketPressure.hp <= 0) {
    events.push(
      state.createEvent({
        type: 'MARKET_PRESSURE_CLEARED',
        sourceId: state.marketPressure.id,
        sourceName: state.marketPressure.name,
        message: `${state.marketPressure.name} 被击穿。`
      }),
      state.createEvent({
        type: 'REWARD_DROPPED',
        sourceId: state.marketPressure.id,
        sourceName: state.marketPressure.name,
        message: `奖励掉落：${state.marketPressure.reward}。`,
        meta: { reward: state.marketPressure.reward }
      })
    );
  }

  return events;
}

export function applyDirectMarketPressureDamage(
  state: EventGameState,
  event: GameEvent
): GameEvent[] {
  const damage = event.value ?? 0;

  if (damage <= 0 || state.marketPressure.hp <= 0) {
    return [];
  }

  state.marketPressure = {
    ...state.marketPressure,
    hp: Math.max(0, roundToTwoDecimals(state.marketPressure.hp - damage))
  };

  if (state.marketPressure.hp > 0) {
    return [];
  }

  return [
    state.createEvent({
      type: 'MARKET_PRESSURE_CLEARED',
      sourceId: state.marketPressure.id,
      sourceName: state.marketPressure.name,
      message: `${state.marketPressure.name} 被击穿。`
    }),
    state.createEvent({
      type: 'REWARD_DROPPED',
      sourceId: state.marketPressure.id,
      sourceName: state.marketPressure.name,
      message: `奖励掉落：${state.marketPressure.reward}。`,
      meta: { reward: state.marketPressure.reward }
    })
  ];
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
