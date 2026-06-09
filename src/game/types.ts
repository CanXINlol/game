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

export interface MarketState {
  day: number;
  sentiment: number;
  hotSectors: Sector[];
  riskLevel: RiskLevel;
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

export interface SettlementResult {
  day: number;
  combo: ComboResult | null;
  baseReturn: number;
  finalReturn: number;
  floatingProfit: number;
  risk: number;
  isBust: boolean;
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
  settlements: SettlementResult[];
  status: 'idle' | 'running' | 'won' | 'lost';
}
