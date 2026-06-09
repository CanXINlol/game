import type { ComboState, GameEvent } from './events';

export function applyComboEvent(combo: ComboState, event: GameEvent): ComboState {
  if (event.type === 'COMBO_GAINED') {
    const comboGain = event.value ?? 1;
    const comboCount = combo.comboCount + comboGain;
    const comboMultiplier = getComboMultiplier(comboCount);

    return {
      ...combo,
      comboCount,
      comboMultiplier,
      highestComboToday: Math.max(combo.highestComboToday, comboCount),
      highestComboThisRun: Math.max(combo.highestComboThisRun, comboCount)
    };
  }

  if (event.type === 'TOOL_TRIGGERED') {
    return {
      ...combo,
      chainDepth: combo.chainDepth + 1
    };
  }

  if (event.type === 'PROFIT_GAINED') {
    return {
      ...combo,
      currentChainProfit: roundToTwoDecimals(
        combo.currentChainProfit + (event.value ?? 0)
      )
    };
  }

  if (event.type === 'RISK_GAINED') {
    return {
      ...combo,
      currentChainRisk: roundToTwoDecimals(
        combo.currentChainRisk + (event.value ?? 0)
      )
    };
  }

  return combo;
}

export function getComboMultiplier(comboCount: number) {
  return roundToTwoDecimals(1 + comboCount * 0.08);
}

export function getTurboturnMultiplier(turboturnStep: number) {
  return roundToTwoDecimals(1 + turboturnStep * 0.15);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
