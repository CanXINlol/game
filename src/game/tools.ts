import { TOOLS } from '../data/tools';
import { createRng } from './rng';
import type {
  ComboResult,
  LeverageLevel,
  MarketState,
  SettlementResult,
  StockCard,
  Tool,
  ToolRuntimeState,
  WarningLevel
} from './types';

export interface ToolEffectContext {
  selectedCards: readonly StockCard[];
  comboResult: ComboResult;
  marketState: MarketState;
  tools: readonly Tool[];
  toolState: ToolRuntimeState;
  floatingProfit: number;
  risk: number;
  maxRisk: number;
  leverageLevel: LeverageLevel;
  baseReturn: number;
  baseRisk: number;
  comboMultiplier: number;
  marketMultiplier: number;
  leverageMultiplier: number;
  riskGain: number;
}

export interface ToolEffectResult {
  comboMultiplier: number;
  toolMultiplier: number;
  grossProfit: number;
  riskGain: number;
  newFloatingProfit: number;
  newRisk: number;
  isBankrupt: boolean;
  warningLevel: WarningLevel;
  toolMessages: string[];
  toolLockedProfit: number;
  principalOverride?: number;
  updatedToolState: ToolRuntimeState;
}

export function createStartingTools(seed: string, count = 5) {
  return createRng(`${seed}:tools`).shuffle(TOOLS).slice(0, count);
}

export function createInitialToolState(): ToolRuntimeState {
  return {
    triggeredToolIds: [],
    nextProfitMultiplier: 1
  };
}

export function getHoldCarryMultiplier(tools: readonly Tool[], baseMultiplier: number) {
  return roundToTwoDecimals(
    tools.reduce((multiplier, tool) => {
      const bonus = tool.effects.reduce((total, effect) => {
        return effect.type === 'HOLD_CARRY_BONUS' ? total + effect.bonus : total;
      }, 0);

      return multiplier + bonus;
    }, baseMultiplier)
  );
}

export function applyToolEffects(context: ToolEffectContext): ToolEffectResult {
  let comboMultiplier = context.comboMultiplier;
  let toolMultiplier = context.toolState.nextProfitMultiplier;
  let riskGain = context.riskGain;
  const toolMessages: string[] = [];
  let toolLockedProfit = 0;
  let principalOverride: number | undefined;
  const triggeredToolIds = new Set(context.toolState.triggeredToolIds);

  for (const tool of context.tools) {
    for (const effect of tool.effects) {
      switch (effect.type) {
        case 'HOLD_CARRY_BONUS':
          break;
        case 'FIRST_LOSS_LOCK_FLOATING_PROFIT':
        case 'AFTER_LOSS_NEXT_PROFIT_MULTIPLIER':
        case 'PREVENT_FIRST_BANKRUPTCY':
          break;
        case 'SAME_SECTOR_COMBO_BONUS':
          if (isSameSector(context.selectedCards)) {
            comboMultiplier += effect.bonus;
            toolMessages.push(`${tool.name}：同板块牌型倍率 +${effect.bonus}`);
          }
          break;
        case 'TOOL_RETURN_MULTIPLIER':
          toolMultiplier *= effect.multiplier;
          toolMessages.push(`${tool.name}：工具收益倍率 x${effect.multiplier}`);
          break;
        case 'RISK_GAIN_FLAT':
          riskGain += effect.amount;
          toolMessages.push(`${tool.name}：风险 ${formatSigned(effect.amount)}`);
          break;
        case 'HOT_SECTOR_RETURN_BONUS': {
          const hotCount = countSector(
            context.selectedCards,
            context.marketState.hotSector
          );
          if (hotCount > 0) {
            const bonus = hotCount * effect.bonusPerCard;
            toolMultiplier += bonus;
            toolMessages.push(`${tool.name}：热门板块收益倍率 +${roundToTwoDecimals(bonus)}`);
          }
          break;
        }
        case 'WEAK_SECTOR_RISK_REDUCTION': {
          const weakCount = countSector(
            context.selectedCards,
            context.marketState.weakSector
          );
          if (weakCount > 0) {
            const reduction = weakCount * effect.amountPerCard;
            riskGain -= reduction;
            toolMessages.push(`${tool.name}：弱势板块风险 -${reduction}`);
          }
          break;
        }
        case 'MOOD_RETURN_BONUS':
          if (context.marketState.mood === effect.mood) {
            toolMultiplier += effect.bonus;
            toolMessages.push(`${tool.name}：市场情绪收益倍率 +${effect.bonus}`);
          }
          break;
        case 'LEVERAGE_RETURN_BONUS':
          if (context.leverageLevel > 0) {
            toolMultiplier += effect.bonus;
            toolMessages.push(`${tool.name}：杠杆收益倍率 +${effect.bonus}`);
          }
          break;
        case 'LEVERAGE_RISK_REDUCTION':
          if (context.leverageLevel > 0) {
            riskGain -= effect.amount;
            toolMessages.push(`${tool.name}：杠杆风险 -${effect.amount}`);
          }
          break;
        case 'VOLATILITY_RISK_REDUCTION':
          if (context.marketState.volatility >= effect.threshold) {
            riskGain -= effect.amount;
            toolMessages.push(`${tool.name}：高波动风险 -${effect.amount}`);
          }
          break;
        case 'LOW_RISK_RETURN_BONUS':
          if (context.selectedCards.every((card) => card.risk === 'low')) {
            toolMultiplier += effect.bonus;
            toolMessages.push(`${tool.name}：低风险组合收益倍率 +${effect.bonus}`);
          }
          break;
        case 'HIGH_RISK_RETURN_BONUS':
          if (
            context.selectedCards.every(
              (card) => card.risk === 'high' || card.risk === 'extreme'
            )
          ) {
            toolMultiplier += effect.bonus;
            toolMessages.push(`${tool.name}：高风险组合收益倍率 +${effect.bonus}`);
          }
          break;
      }
    }
  }

  riskGain = roundToTwoDecimals(Math.max(0, riskGain));
  toolMultiplier = roundToTwoDecimals(toolMultiplier);
  comboMultiplier = roundToTwoDecimals(comboMultiplier);
  let grossProfit = roundToTwoDecimals(
    context.baseReturn *
      comboMultiplier *
      context.marketMultiplier *
      toolMultiplier *
      context.leverageMultiplier
  );

  for (const tool of context.tools) {
    for (const effect of tool.effects) {
      if (
        effect.type === 'FIRST_LOSS_LOCK_FLOATING_PROFIT' &&
        grossProfit < 0 &&
        context.floatingProfit > 0 &&
        !triggeredToolIds.has(tool.id)
      ) {
        const lockedProfit = roundToTwoDecimals(
          context.floatingProfit * effect.ratio
        );
        toolLockedProfit += lockedProfit;
        triggeredToolIds.add(tool.id);
        toolMessages.push(`${tool.name}：首次亏损，自动锁定浮盈 ${lockedProfit}`);
      }
    }
  }

  let nextProfitMultiplier = grossProfit < 0 ? 1 : 1;

  for (const tool of context.tools) {
    for (const effect of tool.effects) {
      if (effect.type === 'AFTER_LOSS_NEXT_PROFIT_MULTIPLIER' && grossProfit < 0) {
        nextProfitMultiplier = Math.max(nextProfitMultiplier, effect.multiplier);
        toolMessages.push(`${tool.name}：亏损后，下一次收益 x${effect.multiplier}`);
      }
    }
  }

  let newFloatingProfit = roundToTwoDecimals(
    context.floatingProfit - toolLockedProfit + grossProfit
  );
  let newRisk = roundToTwoDecimals(context.risk + riskGain);
  let isBankrupt = newRisk >= context.maxRisk;

  for (const tool of context.tools) {
    for (const effect of tool.effects) {
      if (
        effect.type === 'PREVENT_FIRST_BANKRUPTCY' &&
        isBankrupt &&
        !triggeredToolIds.has(tool.id)
      ) {
        triggeredToolIds.add(tool.id);
        principalOverride = effect.principalAfterSave;
        newFloatingProfit = 0;
        newRisk = Math.max(0, context.maxRisk - 1);
        isBankrupt = false;
        toolMessages.push(`${tool.name}：抵消首次爆仓，本金变为 ${effect.principalAfterSave}`);
      }
    }
  }

  return {
    comboMultiplier,
    toolMultiplier,
    grossProfit,
    riskGain,
    newFloatingProfit,
    newRisk,
    isBankrupt,
    warningLevel: getWarningLevel(newRisk, context.maxRisk),
    toolMessages,
    toolLockedProfit,
    principalOverride,
    updatedToolState: {
      triggeredToolIds: [...triggeredToolIds],
      nextProfitMultiplier
    }
  };
}

export function appendToolSummary(summaryText: string, result: ToolEffectResult) {
  if (result.toolMessages.length === 0) {
    return `${summaryText}；工具未触发额外效果`;
  }

  return `${summaryText}；工具效果：${result.toolMessages.join('；')}`;
}

function isSameSector(cards: readonly StockCard[]) {
  return cards.length > 0 && cards.every((card) => card.sector === cards[0].sector);
}

function countSector(cards: readonly StockCard[], sector: string) {
  return cards.filter((card) => card.sector === sector).length;
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

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function formatSigned(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}
