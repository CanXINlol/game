import { createMarketIntent, type MarketIntent } from './encounters';
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
  intent: MarketIntent;
  reward: string;
}

export const MARKET_PRESSURE_DEFINITIONS: Omit<MarketPressure, 'hp'>[] = [
  {
    id: 'pressure-tech-rumor',
    name: '题材分歧盘',
    description: '高弹性的题材盘，会用风险打击逼你提前止盈或硬打穿。',
    maxHp: 120,
    shield: 0,
    weaknessSector: 'TECH',
    resistanceSector: 'FINANCE',
    intent: createMarketIntent('pressure-tech-rumor', 0),
    reward: 'combo 向奖励'
  },
  {
    id: 'pressure-consumer-pullback',
    name: '消费回撤盘',
    description: '消费板块退潮，会加厚护盾，逼你考虑轮动或删掉慢牌。',
    maxHp: 100,
    shield: 10,
    weaknessSector: 'CONSUMER',
    resistanceSector: 'MEDICAL',
    intent: createMarketIntent('pressure-consumer-pullback', 1),
    reward: '构筑向奖励'
  },
  {
    id: 'pressure-finance-squeeze',
    name: '杠杆挤压盘',
    description: '金融压力盘会放大收益和风险，适合爆发，也容易爆仓。',
    maxHp: 140,
    shield: 0,
    weaknessSector: 'FINANCE',
    resistanceSector: 'ENERGY',
    intent: createMarketIntent('pressure-finance-squeeze', 2),
    reward: '风控向奖励'
  }
];

export function createTestMarketPressure(): MarketPressure {
  return createMarketPressureByIndex('test-run', 0);
}

export function createMarketPressureByIndex(seed: string, index: number): MarketPressure {
  const definition =
    MARKET_PRESSURE_DEFINITIONS[index % MARKET_PRESSURE_DEFINITIONS.length];

  return {
    ...definition,
    hp: definition.maxHp,
    intent: createMarketIntent(seed, index)
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
