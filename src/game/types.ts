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

export interface Tool {
  id: string;
  name: string;
  description: string;
  riskModifier: number;
  returnModifier: number;
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
  floatingProfit: number;
  leverage: number;
  risk: number;
  maxRisk: number;
  settlements: SettlementResult[];
  status: 'idle' | 'running' | 'won' | 'lost';
}
