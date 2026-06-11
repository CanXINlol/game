import type { Encounter, EncounterType, Run, TradeCard, TradeChainResult } from './types';

export function hasTool(run: Run, toolId: string) {
  return run.tools.includes(toolId);
}

export function hasActiveInsurance(run: Run, insuranceId: string) {
  return run.insurances.some((i) => i.insuranceId === insuranceId && !i.used);
}

export function applyToolOnChainResult(run: Run, result: TradeChainResult, cardIds: string[]): Run {
  let next = { ...run };
  const encounter = next.currentEncounter;
  if (!encounter) return next;

  if (hasTool(run, 'closing-horn') && cardIds.length > 0) {
    const lastId = cardIds[cardIds.length - 1];
    const lastStep = result.steps.find((s) => s.cardId === lastId);
    if (lastStep) {
      const bonus = Math.floor(lastStep.floatingProfitGained * 0.3);
      next = {
        ...next,
        currentEncounter: {
          ...encounter,
          floatingProfit: encounter.floatingProfit + bonus
        }
      };
    }
  }

  if (hasTool(run, 'hot-money-seat') && result.reachedTarget && !run.toolTriggers['hot-money-seat']) {
    const enc = next.currentEncounter!;
    next = {
      ...next,
      ap: next.ap + 1,
      toolTriggers: { ...next.toolTriggers, 'hot-money-seat': true },
      currentEncounter: { ...enc, risk: Math.min(enc.maxRisk, enc.risk + 5) }
    };
  }

  return next;
}

export function applyTraderAndToolRiskModifier(
  run: Run,
  riskDelta: number,
  card?: TradeCard,
  encounter = run.currentEncounter ?? undefined
): number {
  let delta = riskDelta;

  if (run.trader.id === 'hot-money' && riskDelta > 0) {
    delta = Math.ceil(riskDelta * 1.25);
  }

  if (run.trader.id === 'old-hand' && card && riskDelta > 0 && card.riskDelta >= 15) {
    delta = Math.ceil(riskDelta * 0.9);
  }

  if (card && hasTool(run, 'leverage-coil') && card.archetype === 'LEVERAGE' && riskDelta > 0) {
    delta = Math.ceil(riskDelta * 1.5);
  }

  if (encounter?.boss?.bossId === 'redline-audit') {
    const phase = encounter.boss.phases[encounter.boss.currentPhaseIndex];
    if (phase.id === 'p1' && card && card.riskDelta > 10 && riskDelta > 0) {
      delta += 3;
    }
  }

  if (encounter) {
    delta = Math.ceil(delta * encounter.riskGainMultiplier);
  }

  return delta;
}

export function applyInsuranceOnBankruptcy(run: Run): { run: Run; prevented: boolean } {
  if (run.currentEncounter?.boss && hasTool(run, 'panic-button') && !run.toolTriggers['panic-button']) {
    const floating = Math.floor(run.currentEncounter.floatingProfit * 0.5);
    return {
      prevented: true,
      run: {
        ...run,
        toolTriggers: { ...run.toolTriggers, 'panic-button': true },
        currentEncounter: {
          ...run.currentEncounter,
          risk: 85,
          floatingProfit: floating,
          status: 'ACTIVE'
        },
        status: 'PLAYER_TURN'
      }
    };
  }

  const marginDelay = run.insurances.find((i) => i.insuranceId === 'margin-delay' && !i.used);
  if (marginDelay && run.currentEncounter) {
    return {
      prevented: true,
      run: {
        ...run,
        insurances: run.insurances.map((i) =>
          i.insuranceId === 'margin-delay' ? { ...i, used: true } : i
        ),
        currentEncounter: {
          ...run.currentEncounter,
          risk: 90,
          status: 'ACTIVE'
        },
        status: 'PLAYER_TURN',
        turnSummary: [...run.turnSummary, '追保延迟：本回合免于爆仓，风险降到 90。']
      }
    };
  }

  const buffer = run.insurances.find((i) => i.insuranceId === 'bankruptcy-buffer' && !i.used);
  if (buffer && run.currentEncounter) {
    const floating = Math.floor(run.currentEncounter.floatingProfit * 0.5);
    return {
      prevented: true,
      run: {
        ...run,
        insurances: run.insurances.map((i) =>
          i.insuranceId === 'bankruptcy-buffer' ? { ...i, used: true } : i
        ),
        currentEncounter: {
          ...run.currentEncounter,
          risk: 85,
          floatingProfit: floating,
          status: 'ACTIVE'
        },
        status: 'PLAYER_TURN'
      }
    };
  }

  const shield = run.insurances.find((i) => i.insuranceId === 'floating-shield' && !i.used);
  if (shield && run.currentEncounter) {
    const floating = Math.floor(run.currentEncounter.floatingProfit * 0.3);
    return {
      prevented: true,
      run: {
        ...run,
        insurances: run.insurances.map((i) =>
          i.insuranceId === 'floating-shield' ? { ...i, used: true } : i
        ),
        currentEncounter: {
          ...run.currentEncounter,
          risk: 90,
          floatingProfit: floating,
          status: 'ACTIVE'
        },
        status: 'PLAYER_TURN'
      }
    };
  }

  return { run, prevented: false };
}

export function applyTakeProfitTools(run: Run, cashGain: number): number {
  let bonus = 0;
  if (hasTool(run, 'cash-safe') && !run.toolTriggers['cash-safe']) {
    bonus += 100;
    run.toolTriggers['cash-safe'] = true;
  }
  if (run.trader.id === 'old-hand') {
    bonus += Math.floor(cashGain * 0.1);
  }
  return cashGain + bonus;
}

export function getTraderProfitMultiplier(run: Run, card: TradeCard): number {
  let mult = 1;
  if (run.trader.id === 'hot-money' && card.archetype === 'MOMENTUM') mult *= 1.2;
  if (run.trader.id === 'risk-manager' && card.role === 'PAYOFF') mult *= 0.9;
  if (run.trader.id === 'quant-newbie' && card.role === 'CASH_OUT') mult *= 0.8;
  if (run.trader.id === 'bankrupt-gambler' && run.currentEncounter) {
    mult *= 1 + run.currentEncounter.risk / 200;
  }
  if (hasTool(run, 'rebound-model') && card.id === 'dip-rebound' && run.currentEncounter && run.currentEncounter.risk >= 60) {
    mult *= 1.4;
  }
  if (hasTool(run, 'leverage-coil') && card.archetype === 'LEVERAGE') {
    mult *= 1.15;
  }
  return mult;
}

export function getToolProfitBonus(
  run: Run,
  card: TradeCard,
  mutableRisk: number,
  isFirstProfitCard: boolean
): number {
  let bonus = 0;

  if (isFirstProfitCard && hasTool(run, 'profit-mirror') && (card.numericEffects.floatingProfit ?? 0) > 0) {
    bonus += Math.floor((card.numericEffects.floatingProfit ?? 0) * 0.25);
  }

  if (hasTool(run, 'dip-scanner') && mutableRisk >= 50 && (card.numericEffects.floatingProfit ?? 0) > 0) {
    bonus += 20;
  }

  if (hasTool(run, 'bull-whistle') && (card.numericEffects.floatingProfit ?? 0) > 0) {
    bonus += Math.floor(mutableRisk * 2);
  }

  return bonus;
}

export function applyLockBonus(run: Run, lockedAmount: number): number {
  if (hasTool(run, 'stop-loss-chain')) {
    return Math.floor(lockedAmount * 1.15);
  }
  if (run.trader.id === 'old-hand') {
    return Math.floor(lockedAmount * 1.1);
  }
  return lockedAmount;
}

export function modifyEncounterForTools(run: Run, encounter: Encounter, nodeType?: EncounterType): Encounter {
  let next = { ...encounter };

  if (hasTool(run, 'black-pool-radar')) {
    next = { ...next, cashReward: Math.floor(next.cashReward * 1.25) };
    if (nodeType === 'ELITE') {
      next = { ...next, risk: Math.min(next.maxRisk, next.risk + 8) };
    }
  }

  if (hasActiveInsurance(run, 'risk-hedge')) {
    next = { ...next, riskGainMultiplier: next.riskGainMultiplier * 0.7 };
  }

  if (hasActiveInsurance(run, 'audit-pass') && next.boss) {
    next = { ...next, risk: Math.max(0, next.risk - 10) };
  }

  if (hasActiveInsurance(run, 'black-pool-umbrella') && nodeType === 'ELITE') {
    next = { ...next, risk: Math.max(0, next.risk - 8) };
  }

  return next;
}

export function applyInsuranceOnEncounterEnd(run: Run): Run {
  if (!run.currentEncounter) return run;

  let encounter = run.currentEncounter;
  let next = run;

  if (hasActiveInsurance(run, 'profit-lock')) {
    const locked = Math.floor(encounter.floatingProfit * 0.4);
    encounter = {
      ...encounter,
      lockedProfit: encounter.lockedProfit + locked
    };
    next = markInsuranceUsed(next, 'profit-lock');
  }

  return { ...next, currentEncounter: encounter };
}

export function applyFinalStopIfNeeded(run: Run, risk: number, floatingProfit: number): {
  lockedDelta: number;
  insuranceUsed: boolean;
} {
  if (!hasActiveInsurance(run, 'final-stop') || risk < 90) {
    return { lockedDelta: 0, insuranceUsed: false };
  }
  return { lockedDelta: Math.floor(floatingProfit * 0.5), insuranceUsed: true };
}

export function markInsuranceUsed(run: Run, insuranceId: string): Run {
  return {
    ...run,
    insurances: run.insurances.map((i) =>
      i.insuranceId === insuranceId ? { ...i, used: true } : i
    )
  };
}

export function applyOldHandCup(run: Run, risk: number): Run {
  if (!hasTool(run, 'old-hand-cup') || run.toolTriggers['old-hand-cup'] || risk < 70 || !run.currentEncounter) {
    return run;
  }
  return {
    ...run,
    toolTriggers: { ...run.toolTriggers, 'old-hand-cup': true },
    currentEncounter: {
      ...run.currentEncounter,
      risk: Math.max(0, run.currentEncounter.risk - 15)
    }
  };
}

export function applyInsurancePurchaseBonus(run: Run): Run {
  if (!hasTool(run, 'risk-stamp') || !run.currentEncounter) return run;
  return {
    ...run,
    currentEncounter: {
      ...run.currentEncounter,
      risk: Math.max(0, run.currentEncounter.risk - 8)
    }
  };
}

export function getShopServiceDiscount(run: Run): number {
  if (hasTool(run, 'trend-lens')) return 0.85;
  return 1;
}

export function getRiskControlDiscount(run: Run): number {
  if (run.trader.id === 'risk-manager') return 0.75;
  return 1;
}

export function shouldInjectBossNoise(run: Run): boolean {
  if (!run.currentEncounter?.boss) return false;
  if (hasTool(run, 'noise-filter')) return false;
  const phase = run.currentEncounter.boss.phases[run.currentEncounter.boss.currentPhaseIndex];
  return run.currentEncounter.boss.bossId === 'black-pool-ebb' && phase.id === 'p1';
}

export function getDrawBonusForTurn(run: Run, isTurnStartDraw: boolean): number {
  let bonus = 0;
  if (isTurnStartDraw && hasTool(run, 'sector-bell') && !run.toolTriggers['sector-bell-draw']) {
    bonus += 1;
    run.toolTriggers['sector-bell-draw'] = true;
  }
  if (run.trader.id === 'quant-newbie' && isTurnStartDraw && !run.toolTriggers['quant-draw']) {
    bonus += 1;
    run.toolTriggers['quant-draw'] = true;
  }
  return bonus;
}

export function applyQuantTerminalCostReduction(run: Run): Run {
  if (!hasTool(run, 'quant-terminal') || run.toolTriggers['quant-terminal']) return run;
  return {
    ...run,
    nextCardCostReduction: 1,
    toolTriggers: { ...run.toolTriggers, 'quant-terminal': true }
  };
}

export function resetTurnToolTriggers(run: Run): Run {
  const next = { ...run.toolTriggers };
  delete next['sector-bell-draw'];
  delete next['quant-terminal'];
  delete next['quant-draw'];
  return {
    ...run,
    toolTriggers: next,
    apOverdraftAvailable: run.tools.includes('redline-margin'),
    nextCardCostReduction: 0
  };
}

export function canOverdraftAp(run: Run, totalCost: number): boolean {
  return run.apOverdraftAvailable && hasTool(run, 'redline-margin') && totalCost <= run.ap + 1;
}

export function applyApOverdraft(run: Run): Run {
  if (!run.currentEncounter) return run;
  return {
    ...run,
    apOverdraftAvailable: false,
    currentEncounter: {
      ...run.currentEncounter,
      risk: Math.min(run.currentEncounter.maxRisk, run.currentEncounter.risk + 15)
    }
  };
}

export function grantExitAlarmFreeTakeProfit(run: Run): Run {
  if (!hasTool(run, 'exit-alarm') || run.toolTriggers['exit-alarm']) return run;
  return {
    ...run,
    freeTakeProfitAvailable: true,
    toolTriggers: { ...run.toolTriggers, 'exit-alarm': true }
  };
}


