import { createMarketIntent, type MarketIntent } from './encounters';
import type { GameEvent } from './events';
import type { EventGameState } from './playCard';
import type { RouteNodeType } from '../data/routeNodes';

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

const NORMAL_PRESSURE_NAMES = [
  '散户踩踏',
  '夜盘异动',
  '玻璃涨停',
  '灰色研报',
  '迟到利好',
  '空头回声',
  '尾盘拉升',
  '假突破',
  '暗池波纹',
  '旧账重估'
];

const ELITE_PRESSURE_NAMES = [
  '龙虎榜幽灵',
  '杠杆围城',
  '跌停回廊',
  '量化黑箱',
  '熔断前夜',
  '高位接盘局'
];

const BOSS_PRESSURES = {
  1: {
    name: '红线审计',
    description: '终端弹出一条不会关闭的红线：越是高风险追涨，越容易被它抽走节奏。'
  },
  2: {
    name: '黑池枯潮',
    description: '盘口像干涸的黑池，抽牌和复制都变得沉重，流动性开始反过来吞噬你。'
  },
  3: {
    name: '最后一根阳线',
    description: '它用漂亮阳线诱导你继续贪婪，然后清算所有没来得及锁住的收益。'
  }
} as const;

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

export function createMarketPressureForRouteNode(
  seed: string,
  index: number,
  nodeType: RouteNodeType,
  act: 1 | 2 | 3
): MarketPressure {
  const basePressure = createMarketPressureByIndex(seed, index);
  const multiplier = getRoutePressureMultiplier(nodeType, act);
  const maxHp = roundToTwoDecimals(basePressure.maxHp * multiplier);
  const shield = roundToTwoDecimals(
    basePressure.shield * multiplier + getRouteShieldBonus(nodeType, act)
  );

  return {
    ...basePressure,
    name: getRoutePressureName(basePressure.name, nodeType, act, index),
    description: getRoutePressureDescription(basePressure.description, nodeType, act),
    hp: maxHp,
    maxHp,
    shield,
    reward: getRouteRewardText(nodeType)
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

function getRoutePressureMultiplier(nodeType: RouteNodeType, act: 1 | 2 | 3) {
  if (nodeType === 'BOSS') {
    return act === 3 ? 3.4 : 2.2 + act * 0.35;
  }

  if (nodeType === 'ELITE_MARKET') {
    return 1.45 + act * 0.25;
  }

  return 1 + act * 0.18;
}

function getRouteShieldBonus(nodeType: RouteNodeType, act: 1 | 2 | 3) {
  if (nodeType === 'BOSS') {
    return 18 + act * 12;
  }

  if (nodeType === 'ELITE_MARKET') {
    return 8 + act * 6;
  }

  return act * 3;
}

function getRoutePressureName(
  name: string,
  nodeType: RouteNodeType,
  act: 1 | 2 | 3,
  index: number
) {
  if (nodeType === 'BOSS') {
    return BOSS_PRESSURES[act].name;
  }

  if (nodeType === 'ELITE_MARKET') {
    return ELITE_PRESSURE_NAMES[index % ELITE_PRESSURE_NAMES.length];
  }

  if (nodeType === 'NORMAL_MARKET') {
    return NORMAL_PRESSURE_NAMES[index % NORMAL_PRESSURE_NAMES.length];
  }

  return name;
}

function getRoutePressureDescription(
  description: string,
  nodeType: RouteNodeType,
  act: 1 | 2 | 3
) {
  if (nodeType === 'BOSS') {
    return `${BOSS_PRESSURES[act].description} 击穿第三幕噩兆即通关。`;
  }

  if (nodeType === 'ELITE_MARKET') {
    return `${description} 这类精英怪谈更难，但奖励更好。`;
  }

  return description;
}

function getRouteRewardText(nodeType: RouteNodeType) {
  if (nodeType === 'BOSS') {
    return '强力工具或关键奖励';
  }

  if (nodeType === 'ELITE_MARKET') {
    return '工具、稀有牌或大量现金';
  }

  return '普通牌、少量现金或降低风险';
}
