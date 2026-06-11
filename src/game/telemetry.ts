import type { GreedChoice, Run, RunTelemetry } from './types';

export function createTelemetry(traderId: string): RunTelemetry {
  return {
    encounterTurns: [],
    takeProfitCount: 0,
    holdCount: 0,
    leverageCount: 0,
    bankruptcyReason: null,
    peakFloatingProfit: 0,
    shopPurchases: {},
    traderId,
    toolPickCounts: {},
    reachedTargetThenGreed: 0
  };
}

export function recordEncounterEnd(run: Run, turns: number) {
  run.telemetry.encounterTurns.push(turns);
}

export function recordGreedChoice(run: Run, choice: GreedChoice) {
  run.telemetry.reachedTargetThenGreed += 1;
  if (choice === 'TAKE_PROFIT') run.telemetry.takeProfitCount += 1;
  if (choice === 'HOLD') run.telemetry.holdCount += 1;
  if (choice === 'LEVERAGE') run.telemetry.leverageCount += 1;
}

export function recordPeakProfit(run: Run, floatingProfit: number) {
  if (floatingProfit > run.telemetry.peakFloatingProfit) {
    run.telemetry.peakFloatingProfit = floatingProfit;
  }
}

export function recordBankruptcy(run: Run, reason: string) {
  run.telemetry.bankruptcyReason = reason;
}

export function recordShopPurchase(run: Run, itemName: string) {
  run.telemetry.shopPurchases[itemName] = (run.telemetry.shopPurchases[itemName] ?? 0) + 1;
}

export function getTelemetrySummary(run: Run) {
  const t = run.telemetry;
  const avgTurns =
    t.encounterTurns.length > 0
      ? Math.round(t.encounterTurns.reduce((a, b) => a + b, 0) / t.encounterTurns.length)
      : 0;

  return {
    avgEncounterTurns: avgTurns,
    takeProfitCount: t.takeProfitCount,
    holdCount: t.holdCount,
    leverageCount: t.leverageCount,
    bankruptcyReason: t.bankruptcyReason,
    peakFloatingProfit: t.peakFloatingProfit,
    shopPurchases: t.shopPurchases,
    traderId: t.traderId,
    greedRate: t.reachedTargetThenGreed
  };
}


