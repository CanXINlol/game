import { MAX_RISK } from './constants';
import {
  getMarketMultiplier,
  getMarketRiskModifier
} from './market';
import {
  appendToolSummary,
  applyToolEffects,
  createInitialToolState
} from './tools';
import type {
  ComboResult,
  LeverageLevel,
  MarketState,
  RunState,
  SettlementResult,
  StockCard
} from './types';

const BASE_RISK_SCALE = 0.55;

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
    Partial<
      Pick<
        RunState,
        | 'maxRisk'
        | 'floatingProfitCarryMultiplier'
        | 'nextSettlementMultiplier'
        | 'temporaryMaxRiskPenalty'
        | 'tools'
        | 'toolState'
      >
    >,
  leverageLevel: LeverageLevel
): SettlementResult {
  const leverageConfig = LEVERAGE_CONFIG[leverageLevel];
  const maxRisk = Math.max(
    1,
    (currentRunState.maxRisk ?? MAX_RISK) -
      (currentRunState.temporaryMaxRiskPenalty ?? 0)
  );
  const carryMultiplier = currentRunState.floatingProfitCarryMultiplier ?? 1;
  const extraSettlementMultiplier = currentRunState.nextSettlementMultiplier ?? 1;
  const baseReturn = sumBy(selectedCards, (card) => card.baseReturn);
  const baseRisk = sumBy(selectedCards, (card) => card.baseRisk);
  const comboMultiplier = comboResult.multiplier;
  const marketMultiplier = getMarketMultiplier(selectedCards, marketState);
  const marketRiskModifier = getMarketRiskModifier(selectedCards, marketState);
  const leverageMultiplier =
    leverageConfig.multiplier * carryMultiplier * extraSettlementMultiplier;
  const riskGain = roundToTwoDecimals(
    baseRisk * BASE_RISK_SCALE * comboResult.riskModifier * marketRiskModifier +
      leverageConfig.extraRisk
  );

  const toolResult = applyToolEffects({
    selectedCards,
    comboResult,
    marketState,
    tools: currentRunState.tools ?? [],
    toolState: currentRunState.toolState ?? createInitialToolState(),
    floatingProfit: currentRunState.floatingProfit,
    risk: currentRunState.risk,
    maxRisk,
    leverageLevel,
    baseReturn,
    baseRisk,
    comboMultiplier,
    marketMultiplier,
    leverageMultiplier,
    riskGain
  });

  return {
    baseReturn,
    comboMultiplier: toolResult.comboMultiplier,
    marketMultiplier,
    toolMultiplier: toolResult.toolMultiplier,
    leverageMultiplier,
    grossProfit: toolResult.grossProfit,
    riskGain: toolResult.riskGain,
    newFloatingProfit: toolResult.newFloatingProfit,
    newRisk: toolResult.newRisk,
    isBankrupt: toolResult.isBankrupt,
    warningLevel: toolResult.warningLevel,
    summaryText: appendToolSummary(
      createSummaryText({
        baseReturn,
        baseRisk,
        comboResult,
        comboMultiplier: toolResult.comboMultiplier,
        marketMultiplier,
        marketRiskModifier,
        toolMultiplier: toolResult.toolMultiplier,
        leverageLevel,
        leverageMultiplier,
        leverageExtraRisk: leverageConfig.extraRisk,
        grossProfit: toolResult.grossProfit,
        riskGain: toolResult.riskGain,
        newFloatingProfit: toolResult.newFloatingProfit,
        newRisk: toolResult.newRisk,
        maxRisk
      }),
      toolResult
    ),
    toolMessages: toolResult.toolMessages,
    toolLockedProfit: toolResult.toolLockedProfit,
    principalOverride: toolResult.principalOverride,
    updatedToolState: toolResult.updatedToolState
  };
}

function createSummaryText(input: {
  baseReturn: number;
  baseRisk: number;
  comboResult: ComboResult;
  comboMultiplier: number;
  marketMultiplier: number;
  marketRiskModifier: number;
  toolMultiplier: number;
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
    `工具倍率 x${input.toolMultiplier}`,
    `杠杆 ${input.leverageLevel} 档收益 x${input.leverageMultiplier}，额外风险 +${input.leverageExtraRisk}`,
    `本日毛收益 ${input.grossProfit}`,
    `风险来自基础风险 ${input.baseRisk} 的结算折算、牌型、市场和杠杆，合计 +${input.riskGain}`,
    `当前浮盈 ${input.newFloatingProfit}，风险 ${input.newRisk}/${input.maxRisk}`
  ].join('；');
}

function sumBy<T>(items: readonly T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
