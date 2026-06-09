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

export interface ComboResult {
  id: string;
  name: string;
  matchedCardIds: string[];
  multiplier: number;
  riskBonus: number;
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
  selectedCardIds: string[];
  tools: Tool[];
  market: MarketState;
  floatingProfit: number;
  leverage: number;
  risk: number;
  settlements: SettlementResult[];
  status: 'idle' | 'running' | 'won' | 'lost';
}
