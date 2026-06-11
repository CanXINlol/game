import type { BossId, BossPhase, BossState, Encounter, Run } from './types';

const BOSS_DEFINITIONS: Record<
  BossId,
  { name: string; maxHp: number; targetProfit: number; phases: BossPhase[] }
> = {
  'redline-audit': {
    name: '红线审计',
    maxHp: 100,
    targetProfit: 600,
    phases: [
      { id: 'p1', label: '审计初段', hpThreshold: 100, description: '高风险牌额外风险 +3。' },
      { id: 'p2', label: '压力中段', hpThreshold: 65, description: '风险超过 70 时，目标线提高 15%。' },
      { id: 'p3', label: '终审阶段', hpThreshold: 30, description: '每回合强迫面对止盈压力，风险 +5。' }
    ]
  },
  'black-pool-ebb': {
    name: '黑池枯潮',
    maxHp: 120,
    targetProfit: 750,
    phases: [
      { id: 'p1', label: '枯潮来临', hpThreshold: 100, description: '每回合加入 1 张临时噪音。' },
      { id: 'p2', label: '抽牌阻滞', hpThreshold: 65, description: '抽牌牌费用 +1。' },
      { id: 'p3', label: '池底反扑', hpThreshold: 30, description: '复制效果降低，但补偿 40 浮盈。' }
    ]
  },
  'final-bull-candle': {
    name: '最后一根阳线',
    maxHp: 150,
    targetProfit: 900,
    phases: [
      { id: 'p1', label: '阳线初现', hpThreshold: 100, description: '收益 x1.2，风险增长 x1.15。' },
      { id: 'p2', label: '贪婪升温', hpThreshold: 65, description: '未锁浮盈越高，风险增长越快。' },
      { id: 'p3', label: '清算预告', hpThreshold: 30, description: '爆仓损失全部未锁浮盈。' }
    ]
  }
};

export function createBossState(bossId: BossId): BossState {
  const def = BOSS_DEFINITIONS[bossId];
  return {
    bossId,
    name: def.name,
    phases: def.phases,
    currentPhaseIndex: 0,
    hp: def.maxHp,
    maxHp: def.maxHp
  };
}

export function createBossEncounter(bossId: BossId, rewardMultiplier: number): Encounter {
  const def = BOSS_DEFINITIONS[bossId];
  return {
    id: `boss-${bossId}`,
    name: def.name,
    type: 'BOSS',
    targetProfit: def.targetProfit,
    targetProfitBonus: 0,
    floatingProfit: 0,
    lockedProfit: 0,
    cashReward: 200,
    risk: 0,
    maxRisk: 100,
    rewardMultiplier,
    turnCount: 1,
    marketIntent: {
      title: def.phases[0].label,
      description: def.phases[0].description
    },
    status: 'ACTIVE',
    nextTurnProfitMultiplier: 1,
    initialRisk: 0,
    boss: createBossState(bossId),
    noiseCardsInDiscard: 0,
    handCostPenalty: 0,
    profitBonus: 0,
    riskGainMultiplier: 1
  };
}

export function getBossPhase(encounter: Encounter): BossPhase | null {
  if (!encounter.boss) return null;
  return encounter.boss.phases[encounter.boss.currentPhaseIndex] ?? null;
}

export function updateBossPhase(encounter: Encounter): Encounter {
  if (!encounter.boss) return encounter;
  const progress = encounter.floatingProfit / encounter.targetProfit;
  const hpPercent = Math.max(0, 100 - progress * 100);
  let phaseIndex = 0;
  for (let i = encounter.boss.phases.length - 1; i >= 0; i -= 1) {
    if (hpPercent <= encounter.boss.phases[i].hpThreshold) {
      phaseIndex = i;
      break;
    }
  }
  const phase = encounter.boss.phases[phaseIndex];
  return {
    ...encounter,
    boss: { ...encounter.boss, currentPhaseIndex: phaseIndex, hp: Math.floor(hpPercent) },
    marketIntent: { title: phase.label, description: phase.description }
  };
}

export function applyBossPhaseModifiers(run: Run, encounter: Encounter): Encounter {
  if (!encounter.boss) return encounter;
  const phase = encounter.boss.phases[encounter.boss.currentPhaseIndex];
  let next = { ...encounter };

  if (encounter.boss.bossId === 'redline-audit') {
    if (phase.id === 'p2' && encounter.risk >= 70) {
      next = { ...next, targetProfitBonus: Math.floor(encounter.targetProfit * 0.15) };
    }
    if (phase.id === 'p3') {
      next = { ...next, riskGainMultiplier: 1.2 };
    }
  }

  if (encounter.boss.bossId === 'black-pool-ebb') {
    if (phase.id === 'p2') {
      next = { ...next, handCostPenalty: 1 };
    }
    if (phase.id === 'p3') {
      next = { ...next, profitBonus: 40 };
    }
  }

  if (encounter.boss.bossId === 'final-bull-candle') {
    if (phase.id === 'p1') {
      next = { ...next, profitBonus: 0, riskGainMultiplier: 1.15 };
      next = { ...next, nextTurnProfitMultiplier: encounter.nextTurnProfitMultiplier * 1.2 };
    }
    if (phase.id === 'p2') {
      const unlocked = encounter.floatingProfit - encounter.lockedProfit;
      next = { ...next, riskGainMultiplier: 1 + unlocked / encounter.targetProfit };
    }
  }

  return next;
}

export function getEffectiveTargetProfit(encounter: Encounter) {
  return encounter.targetProfit + encounter.targetProfitBonus;
}




