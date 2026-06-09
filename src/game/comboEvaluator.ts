import type { ComboResult, ComboType, RiskLevel, StockCard } from './types';

const COMBO_DEFINITIONS: Record<ComboType, ComboResult> = {
  SECTOR_STRAIGHT: {
    comboType: 'SECTOR_STRAIGHT',
    displayName: '超级主线',
    multiplier: 3.8,
    riskModifier: 1.35,
    description: '同一板块内形成连续 rank，主线叙事和趋势共振。'
  },
  FULL_HOUSE: {
    comboType: 'FULL_HOUSE',
    displayName: '产业链闭环',
    multiplier: 3,
    riskModifier: 1.15,
    description: '三张同 rank 加一组对子，形成稳固的结构性抱团。'
  },
  FOUR: {
    comboType: 'FOUR',
    displayName: '垄断行情',
    multiplier: 2.8,
    riskModifier: 1.25,
    description: '四张同 rank，资金集中度极高。'
  },
  HIGH_RISK_BASKET: {
    comboType: 'HIGH_RISK_BASKET',
    displayName: '妖股抱团',
    multiplier: 2.5,
    riskModifier: 1.6,
    description: '五张高风险牌抱团，收益想象大，波动也更猛烈。'
  },
  LOW_RISK_BASKET: {
    comboType: 'LOW_RISK_BASKET',
    displayName: '价值投资',
    multiplier: 1.8,
    riskModifier: 0.65,
    description: '五张低风险牌组成防守组合，收益温和但更稳。'
  },
  SAME_SECTOR: {
    comboType: 'SAME_SECTOR',
    displayName: '板块共振',
    multiplier: 2.2,
    riskModifier: 1.1,
    description: '五张同板块股票，吃一整条板块行情。'
  },
  STRAIGHT: {
    comboType: 'STRAIGHT',
    displayName: '趋势通道',
    multiplier: 2,
    riskModifier: 1,
    description: '五张 rank 连续，形成顺畅趋势。'
  },
  THREE: {
    comboType: 'THREE',
    displayName: '主力控盘',
    multiplier: 1.7,
    riskModifier: 1.05,
    description: '三张同 rank，说明资金偏好开始集中。'
  },
  PAIR: {
    comboType: 'PAIR',
    displayName: '双龙头',
    multiplier: 1.35,
    riskModifier: 1,
    description: '两张同 rank，出现初步龙头呼应。'
  },
  NORMAL: {
    comboType: 'NORMAL',
    displayName: '普通持仓',
    multiplier: 1,
    riskModifier: 1,
    description: '没有形成特殊牌型，按普通持仓结算。'
  }
};

export function evaluateCombo(cards: readonly StockCard[]): ComboResult {
  if (cards.length !== 5) {
    throw new Error('evaluateCombo expects exactly 5 cards.');
  }

  const rankCounts = countBy(cards.map((card) => card.rank));
  const counts = [...rankCounts.values()].sort((first, second) => second - first);
  const sameSector = cards.every((card) => card.sector === cards[0].sector);
  const straight = isStraight(cards.map((card) => card.rank));
  const allHighRisk = cards.every((card) => isHighRisk(card.risk));
  const allLowRisk = cards.every((card) => card.risk === 'low');

  if (sameSector && straight) {
    return getCombo('SECTOR_STRAIGHT');
  }

  if (counts[0] === 3 && counts[1] === 2) {
    return getCombo('FULL_HOUSE');
  }

  if (counts[0] === 4) {
    return getCombo('FOUR');
  }

  if (allHighRisk) {
    return getCombo('HIGH_RISK_BASKET');
  }

  if (allLowRisk) {
    return getCombo('LOW_RISK_BASKET');
  }

  if (sameSector) {
    return getCombo('SAME_SECTOR');
  }

  if (straight) {
    return getCombo('STRAIGHT');
  }

  if (counts[0] === 3) {
    return getCombo('THREE');
  }

  if (counts[0] === 2) {
    return getCombo('PAIR');
  }

  return getCombo('NORMAL');
}

function getCombo(comboType: ComboType): ComboResult {
  return { ...COMBO_DEFINITIONS[comboType] };
}

function countBy<T>(values: readonly T[]) {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function isStraight(ranks: readonly number[]) {
  const uniqueRanks = [...new Set(ranks)].sort((first, second) => first - second);

  if (uniqueRanks.length !== 5) {
    return false;
  }

  return uniqueRanks.every((rank, index) => {
    if (index === 0) {
      return true;
    }

    return rank === uniqueRanks[index - 1] + 1;
  });
}

function isHighRisk(risk: RiskLevel) {
  return risk === 'high' || risk === 'extreme';
}
