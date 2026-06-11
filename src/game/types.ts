export type TradeCardRarity = 'COMMON' | 'UNCOMMON' | 'RARE';
export type TradeCardArchetype = 'STEADY' | 'MOMENTUM' | 'LEVERAGE' | 'RISK_CONTROL' | 'QUANT';
export type TradeCardRole = 'STARTER' | 'BOOSTER' | 'PAYOFF' | 'DEFENSE' | 'CASH_OUT' | 'ENGINE';

export interface TradeCardNumericEffects {
  floatingProfit?: number;
  extraProfit?: number;
  lockRatio?: number;
  cashLock?: number;
  cashRatio?: number;
  subsequentProfitMultiplier?: number;
  nextProfitMultiplier?: number;
  nextCostReduction?: number;
  endsEncounter?: boolean;
  profitFromRisk?: number;
  upgradeLevel?: number;
}

export interface TradeCard {
  id: string;
  name: string;
  cost: number;
  rarity: TradeCardRarity;
  archetype: TradeCardArchetype;
  role: TradeCardRole;
  shortText: string;
  detailText: string;
  numericEffects: TradeCardNumericEffects;
  riskDelta: number;
  multiplierDelta: number;
  drawDelta: number;
  apDelta: number;
  upgradePreview: string;
  tags: string[];
}

export interface TradeChainStep {
  cardId: string;
  cardName: string;
  cost: number;
  baseFloatingProfit: number;
  multiplier: number;
  extraFloatingProfit: number;
  floatingProfitGained: number;
  cashGained: number;
  lockedProfitGained: number;
  riskDelta: number;
  note: string;
}

export interface TradeChainResult {
  steps: TradeChainStep[];
  totalCost: number;
  floatingProfitBefore: number;
  floatingProfitAfter: number;
  floatingProfitDelta: number;
  lockedProfitBefore: number;
  lockedProfitAfter: number;
  lockedProfitDelta: number;
  cashDelta: number;
  riskBefore: number;
  riskAfter: number;
  riskDelta: number;
  drawDelta: number;
  apDelta: number;
  reachedTarget: boolean;
  bankrupt: boolean;
  endedEncounter: boolean;
}

export interface TradeChain {
  selectedCardIds: string[];
  maxCards: 3;
  totalCost: number;
  previewResult: TradeChainResult | null;
}

export type EncounterType = 'NORMAL' | 'ELITE' | 'BOSS';
export type EncounterStatus = 'ACTIVE' | 'GREED_CHOICE' | 'REWARD' | 'ENDED' | 'BANKRUPT';

export interface MarketIntent {
  title: string;
  description: string;
}

export type BossId = 'redline-audit' | 'black-pool-ebb' | 'final-bull-candle';

export interface BossPhase {
  id: string;
  label: string;
  hpThreshold: number;
  description: string;
}

export interface BossState {
  bossId: BossId;
  name: string;
  phases: BossPhase[];
  currentPhaseIndex: number;
  hp: number;
  maxHp: number;
}

export interface Encounter {
  id: string;
  name: string;
  type: EncounterType;
  targetProfit: number;
  targetProfitBonus: number;
  floatingProfit: number;
  lockedProfit: number;
  cashReward: number;
  risk: number;
  maxRisk: 100;
  rewardMultiplier: number;
  turnCount: number;
  marketIntent: MarketIntent;
  status: EncounterStatus;
  nextTurnProfitMultiplier: number;
  initialRisk: number;
  boss?: BossState;
  noiseCardsInDiscard: number;
  handCostPenalty: number;
  profitBonus: number;
  riskGainMultiplier: number;
}

export interface Trader {
  id: string;
  name: string;
  title: string;
  description: string;
  startingCash: number;
  startingDeckCardIds: string[];
  startingToolIds: string[];
  passive: string;
}

export type RunStatus =
  | 'START'
  | 'ROUTE_SELECT'
  | 'PLAYER_TURN'
  | 'GREED_CHOICE'
  | 'REWARD'
  | 'SHOP'
  | 'REST'
  | 'RISK_CONTROL'
  | 'EVENT'
  | 'RUN_WON'
  | 'RUN_LOST';

export type RouteNodeType =
  | 'NORMAL'
  | 'ELITE'
  | 'SHOP'
  | 'RISK_CONTROL'
  | 'REST'
  | 'EVENT'
  | 'BOSS';

export type RouteriskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RouteNode {
  id: string;
  act: number;
  layer: number;
  index: number;
  type: RouteNodeType;
  name: string;
  riskLevel: RouteriskLevel;
  rewardSummary: string;
  greedHint: string;
  x: number;
  y: number;
  nextNodeIds: string[];
  previousNodeIds: string[];
  encounterKey?: string;
  eventId?: string;
  bossId?: BossId;
}

export interface RouteMapState {
  act: number;
  nodes: RouteNode[];
  currentNodeId: string | null;
  availableNodeIds: string[];
  completedNodeIds: string[];
}

export type ToolRarity = 'COMMON' | 'UNCOMMON' | 'RARE';

export type ToolEffectType =
  | 'FIRST_TARGET_AP'
  | 'FIRST_TAKE_PROFIT_CASH'
  | 'FIRST_DRAW_COST_REDUCE'
  | 'FIRST_HIGH_RISK_REDUCE'
  | 'AP_OVERDRAFT'
  | 'ELITE_REWARD_BONUS'
  | 'INSURANCE_RISK_REDUCE'
  | 'LAST_CARD_PROFIT'
  | 'DIP_BONUS'
  | 'FREE_TAKE_PROFIT'
  | 'SHOP_DISCOUNT'
  | 'REST_BONUS'
  | 'LEVERAGE_PROFIT'
  | 'RISK_PROFIT'
  | 'NOISE_IMMUNE'
  | 'CHAIN_START_BONUS'
  | 'LOCK_BONUS'
  | 'GREED_REWARD'
  | 'BOSS_SHIELD'
  | 'DRAW_BONUS';

export interface Tool {
  id: string;
  name: string;
  rarity: ToolRarity;
  description: string;
  effectType: ToolEffectType;
  value: number;
}

export interface Insurance {
  id: string;
  name: string;
  description: string;
  price: number;
  effectType:
    | 'BANKRUPTCY_BUFFER'
    | 'END_LOCK'
    | 'RISK_GAIN_REDUCE'
    | 'FLOATING_SHIELD'
    | 'MARGIN_DELAY'
    | 'AUDIT_PASS'
    | 'BLACK_POOL'
    | 'FINAL_STOP';
  value: number;
}

export interface ActiveInsurance {
  insuranceId: string;
  encounterScoped: boolean;
  used: boolean;
}

export type ShopSection = 'cards' | 'tools' | 'insurance' | 'services';

export interface ShopItem {
  id: string;
  section: ShopSection;
  name: string;
  description: string;
  price: number;
  cardId?: string;
  toolId?: string;
  insuranceId?: string;
  serviceType?: 'REMOVE_CARD' | 'UPGRADE_CARD' | 'REDUCE_RISK' | 'REFRESH';
  sold: boolean;
}

export interface ShopState {
  items: ShopItem[];
  removeCardCount: number;
  refreshCount: number;
}

export interface RouteEventChoice {
  id: string;
  label: string;
  description: string;
  cost?: number;
  cashDelta?: number;
  riskDelta?: number;
  cardId?: string;
  toolId?: string;
}

export interface RouteEvent {
  id: string;
  title: string;
  description: string;
  choices: RouteEventChoice[];
}

export interface RunTelemetry {
  encounterTurns: number[];
  takeProfitCount: number;
  holdCount: number;
  leverageCount: number;
  bankruptcyReason: string | null;
  peakFloatingProfit: number;
  shopPurchases: Record<string, number>;
  traderId: string;
  toolPickCounts: Record<string, number>;
  reachedTargetThenGreed: number;
}

export interface Run {
  trader: Trader;
  cash: number;
  deck: string[];
  drawPile: string[];
  discardPile: string[];
  hand: string[];
  tools: string[];
  insurances: ActiveInsurance[];
  currentEncounter: Encounter | null;
  act: number;
  nodeIndex: number;
  status: RunStatus;
  maxAP: number;
  ap: number;
  tradeChain: TradeChain;
  lastChainResult: TradeChainResult | null;
  turnSummary: string[];
  rngSeed: string;
  routeMap: RouteMapState;
  shop: ShopState;
  currentEvent: RouteEvent | null;
  telemetry: RunTelemetry;
  toolTriggers: Record<string, boolean>;
  encounterScopedToolUses: Record<string, number>;
  nextCardCostReduction: number;
  apOverdraftAvailable: boolean;
  freeTakeProfitAvailable: boolean;
  pendingRewardCash: number;
  cardsRemovedCount: number;
  upgradedCardIds: string[];
}

export type GreedChoice = 'TAKE_PROFIT' | 'HOLD' | 'LEVERAGE';


