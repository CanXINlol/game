import { MAX_RISK } from './constants';
import {
  getMarketMultiplier,
  getMarketRiskModifier
} from './market';
import type {
  ComboResult,
  LeverageLevel,
  MarketState,
  RunState,
  SettlementResult,
  StockCard,
  WarningLevel
} from './types';

const TOOL_MULTIPLIER = 1;

const LEVERAGE_CONFIG: Record<
  LeverageLevel,
  { multiplier: number; extraRisk: number }
> = {
  0: { multiplier: 1, extraRisk: 0 },
  1: { multiplier: 1.8, extraRisk: 15 },
  2: { multiplier: 3, extraRisk: 35 }
};

export function settleTradingDay(
  selectedCards: readonly StockCard[],
  comboResult: ComboResult,
  marketState: MarketState,
  currentRunState: Pick<RunState, 'floatingProfit' | 'risk'> &
    Partial<Pick<RunState, 'maxRisk'>>,
  leverageLevel: LeverageLevel
): SettlementResult {
  const leverageConfig = LEVERAGE_CONFIG[leverageLevel];
  const maxRisk = currentRunState.maxRisk ?? MAX_RISK;
  const baseReturn = sumBy(selectedCards, (card) => card.baseReturn);
  const baseRisk = sumBy(selectedCards, (card) => card.baseRisk);
  const comboMultiplier = comboResult.multiplier;
  const marketMultiplier = getMarketMultiplier(selectedCards, marketState);
  const marketRiskModifier = getMarketRiskModifier(selectedCards, marketState);
  const leverageMultiplier = leverageConfig.multiplier;
  const grossProfit = roundToTwoDecimals(
    baseReturn *
      comboMultiplier *
      marketMultiplier *
      TOOL_MULTIPLIER *
      leverageMultiplier
  );
  const riskGain = roundToTwoDecimals(
    baseRisk * comboResult.riskModifier * marketRiskModifier +
      leverageConfig.extraRisk
  );
  const newFloatingProfit = roundToTwoDecimals(
    currentRunState.floatingProfit + grossProfit
  );
  const newRisk = roundToTwoDecimals(currentRunState.risk + riskGain);
  const isBankrupt = newRisk >= maxRisk;
  const warningLevel = getWarningLevel(newRisk, maxRisk);

  return {
    baseReturn,
    comboMultiplier,
    marketMultiplier,
    toolMultiplier: TOOL_MULTIPLIER,
    leverageMultiplier,
    grossProfit,
    riskGain,
    newFloatingProfit,
    newRisk,
    isBankrupt,
    warningLevel,
    summaryText: createSummaryText({
      baseReturn,
      baseRisk,
      comboResult,
      comboMultiplier,
      marketMultiplier,
      marketRiskModifier,
      leverageLevel,
      leverageMultiplier,
      leverageExtraRisk: leverageConfig.extraRisk,
      grossProfit,
      riskGain,
      newFloatingProfit,
      newRisk,
      maxRisk
    })
  };
}

function getWarningLevel(risk: number, maxRisk: number): WarningLevel {
  if (risk >= maxRisk) {
    return 'BANKRUPT';
  }

  const ratio = risk / maxRisk;

  if (ratio >= 0.75) {
    return 'DANGER';
  }

  if (ratio >= 0.5) {
    return 'CAUTION';
  }

  return 'SAFE';
}

function createSummaryText(input: {
  baseReturn: number;
  baseRisk: number;
  comboResult: ComboResult;
  comboMultiplier: number;
  marketMultiplier: number;
  marketRiskModifier: number;
  leverageLevel: LeverageLevel;
  leverageMultiplier: number;
  leverageExtraRisk: number;
  grossProfit: number;
  riskGain: number;
  newFloatingProfit: number;
  newRisk: number;
  maxRisk: number;
}) {
  return [
    `基础收益 ${input.baseReturn}`,
    `牌型「${input.comboResult.displayName}」收益 x${input.comboMultiplier}，风险 x${input.comboResult.riskModifier}`,
    `市场收益 x${input.marketMultiplier}，市场风险 x${input.marketRiskModifier}`,
    `工具倍率暂为 x${TOOL_MULTIPLIER}`,
    `杠杆 ${input.leverageLevel} 档收益 x${input.leverageMultiplier}，额外风险 +${input.leverageExtraRisk}`,
    `本日毛收益 ${input.grossProfit}`,
    `风险来自基础风险 ${input.baseRisk}、牌型、市场和杠杆，合计 +${input.riskGain}`,
    `当前浮盈 ${input.newFloatingProfit}，风险 ${input.newRisk}/${input.maxRisk}`
  ].join('；');
}

function sumBy<T>(items: readonly T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
