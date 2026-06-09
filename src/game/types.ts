export type Sector =
  | 'TECH'
  | 'CONSUMER'
  | 'MEDICAL'
  | 'ENERGY'
  | 'FINANCE';

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export type StockTag =
  | 'leader'
  | 'momentum'
  | 'value'
  | 'growth'
  | 'turnaround'
  | 'concept'
  | 'chain'
  | 'blueChip'
  | 'volatile';

export interface StockCard {
  id: string;
  name: string;
  sector: Sector;
  rank: number;
  risk: RiskLevel;
  tags: StockTag[];
  baseReturn: number;
  baseRisk: number;
  description: string;
}

export type ToolCategory =
  | 'GREED'
  | 'RISK_CONTROL'
  | 'SECTOR'
  | 'LOSS_REBOUND'
  | 'LEVERAGE';

export type ToolEffect =
  | { type: 'HOLD_CARRY_BONUS'; bonus: number }
  | { type: 'FIRST_LOSS_LOCK_FLOATING_PROFIT'; ratio: number }
  | { type: 'SAME_SECTOR_COMBO_BONUS'; bonus: number }
  | { type: 'AFTER_LOSS_NEXT_PROFIT_MULTIPLIER'; multiplier: number }
  | { type: 'PREVENT_FIRST_BANKRUPTCY'; principalAfterSave: number }
  | { type: 'TOOL_RETURN_MULTIPLIER'; multiplier: number }
  | { type: 'RISK_GAIN_FLAT'; amount: number }
  | { type: 'HOT_SECTOR_RETURN_BONUS'; bonusPerCard: number }
  | { type: 'WEAK_SECTOR_RISK_REDUCTION'; amountPerCard: number }
  | { type: 'MOOD_RETURN_BONUS'; mood: MarketMood; bonus: number }
  | { type: 'LEVERAGE_RETURN_BONUS'; bonus: number }
  | { type: 'LEVERAGE_RISK_REDUCTION'; amount: number }
  | { type: 'VOLATILITY_RISK_REDUCTION'; threshold: number; amount: number }
  | { type: 'LOW_RISK_RETURN_BONUS'; bonus: number }
  | { type: 'HIGH_RISK_RETURN_BONUS'; bonus: number };

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  effects: ToolEffect[];
}

export interface ToolRuntimeState {
  triggeredToolIds: string[];
  nextProfitMultiplier: number;
}

export type MarketMood = 'BULL' | 'NEUTRAL' | 'BEAR';

export interface MarketState {
  day: number;
  mood: MarketMood;
  hotSector: Sector;
  weakSector: Sector;
  volatility: number;
  news: string;
}

export type ComboType =
  | 'NORMAL'
  | 'PAIR'
  | 'THREE'
  | 'FOUR'
  | 'STRAIGHT'
  | 'SAME_SECTOR'
  | 'FULL_HOUSE'
  | 'SECTOR_STRAIGHT'
  | 'HIGH_RISK_BASKET'
  | 'LOW_RISK_BASKET';

export interface ComboResult {
  comboType: ComboType;
  displayName: string;
  multiplier: number;
  riskModifier: number;
  description: string;
}

export type LeverageLevel = 0 | 1 | 2;
export type WarningLevel = 'SAFE' | 'CAUTION' | 'DANGER' | 'BANKRUPT';

export interface SettlementResult {
  baseReturn: number;
  comboMultiplier: number;
  marketMultiplier: number;
  toolMultiplier: number;
  leverageMultiplier: number;
  grossProfit: number;
  riskGain: number;
  newFloatingProfit: number;
  newRisk: number;
  isBankrupt: boolean;
  warningLevel: WarningLevel;
  summaryText: string;
  toolMessages: string[];
  toolLockedProfit: number;
  principalOverride?: number;
  updatedToolState: ToolRuntimeState;
}

export interface RunState {
  seed: string;
  day: number;
  deck: StockCard[];
  hand: StockCard[];
  discardPile: StockCard[];
  selectedCardIds: string[];
  reshuffleCount: number;
  tools: Tool[];
  market: MarketState;
  toolState: ToolRuntimeState;
  floatingProfit: number;
  floatingProfitCarryMultiplier: number;
  nextSettlementMultiplier: number;
  temporaryMaxRiskPenalty: number;
  leverage: number;
  risk: number;
  maxRisk: number;
  settlements: SettlementResult[];
  status: 'idle' | 'running' | 'won' | 'lost';
}
