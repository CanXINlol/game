import type { EventCard, EventTool, FormalCardType } from './effects';
import type { EventCardCost, EventCardRole } from './types';

export interface MigrationListItem {
  cardName: string;
  type: FormalCardType;
  triggerEvents: string[];
  archetypes: string[];
  riskPoint: string;
  note: string;
}

type FormalEventCardDefinition = Omit<EventCard, 'cost' | 'cardRole'>;

const FORMAL_EVENT_CARD_DEFINITIONS: FormalEventCardDefinition[] = [
  {
    id: 'formal-tech-001',
    name: '算力买入',
    sector: 'TECH',
    rank: 9,
    risk: 'high',
    tags: ['leader', 'growth', 'concept'],
    baseReturn: 18,
    baseRisk: 15,
    cardType: 'BUY',
    playEffect: '获得收益，触发 TECH，并让 combo +1。\n高风险成长牌，适合 0→1→2→3 的启动中段。',
    effects: [
      { type: 'GAIN_PROFIT', value: 18, sector: 'TECH' },
      { type: 'TRIGGER_SECTOR', sector: 'TECH' },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'formal-tech-002',
    name: '矩阵抽牌',
    sector: 'TECH',
    rank: 7,
    risk: 'medium',
    tags: ['chain', 'growth'],
    baseReturn: 12,
    baseRisk: 9,
    cardType: 'DRAW',
    playEffect: '获得收益并抽 1 张牌，延长科技链。\n中等风险，主要价值是补手牌。',
    effects: [
      { type: 'GAIN_PROFIT', value: 12, sector: 'TECH' },
      { type: 'DRAW_CARD', value: 1 }
    ]
  },
  {
    id: 'formal-tech-003',
    name: '涨停追击',
    sector: 'TECH',
    rank: 8,
    risk: 'high',
    tags: ['momentum', 'chain', 'volatile'],
    baseReturn: 16,
    baseRisk: 14,
    cardType: 'CHASE',
    playEffect: '已有收益时触发 LIMIT_UP，获得追击收益并 combo +1。\n高风险追涨牌，断链时不会爆发。',
    effects: [{ type: 'TRIGGER_LIMIT_UP_IF_PROFIT', profit: 22, comboGain: 1 }]
  },
  {
    id: 'formal-tech-004',
    name: '低吸反弹',
    sector: 'TECH',
    rank: 5,
    risk: 'medium',
    tags: ['value', 'turnaround'],
    baseReturn: 9,
    baseRisk: 7,
    cardType: 'DIP_BUY',
    playEffect: '发生过风险或亏损后获得反弹收益并降 risk。\n需要先吃到风险事件，空打收益较弱。',
    effects: [
      {
        type: 'REBOUND_IF_EVENT',
        eventTypes: ['RISK_GAINED', 'LOSS_TAKEN'],
        profit: 14,
        riskReduction: 6
      }
    ]
  },
  {
    id: 'formal-tech-005',
    name: '融资加仓',
    sector: 'TECH',
    rank: 10,
    risk: 'extreme',
    tags: ['concept', 'momentum', 'volatile'],
    baseReturn: 24,
    baseRisk: 22,
    cardType: 'LEVERAGE',
    playEffect: '获得高收益，触发 LIMIT_UP，combo +2。\n同时 risk +18，是爽感和爆仓一起加速的牌。',
    effects: [
      { type: 'GAIN_PROFIT', value: 24, sector: 'TECH' },
      { type: 'TRIGGER_LIMIT_UP', comboGain: 2 },
      { type: 'GAIN_RISK', value: 18 }
    ]
  },
  {
    id: 'formal-tech-006',
    name: '科技护盘',
    sector: 'TECH',
    rank: 6,
    risk: 'medium',
    tags: ['chain', 'blueChip'],
    baseReturn: 10,
    baseRisk: 8,
    cardType: 'SECTOR',
    playEffect: '触发 TECH，获得收益并少量降 risk。\n收益不高，但能稳住板块连锁。',
    effects: [
      { type: 'TRIGGER_SECTOR', sector: 'TECH' },
      { type: 'GAIN_PROFIT', value: 10, sector: 'TECH' },
      { type: 'REDUCE_RISK', value: 3 }
    ]
  },
  {
    id: 'formal-consumer-001',
    name: '止盈保险',
    sector: 'CONSUMER',
    rank: 4,
    risk: 'low',
    tags: ['blueChip', 'value'],
    baseReturn: 5,
    baseRisk: 3,
    cardType: 'CASH_OUT',
    playEffect: '锁定 20% 浮盈并降低 risk。\n低收益防守牌，会牺牲一部分继续爆发空间。',
    effects: [{ type: 'CASH_OUT', ratio: 0.2, riskReduction: 8 }]
  },
  {
    id: 'formal-consumer-002',
    name: '消费轮动',
    sector: 'CONSUMER',
    rank: 6,
    risk: 'medium',
    tags: ['growth', 'concept'],
    baseReturn: 10,
    baseRisk: 8,
    cardType: 'SECTOR',
    playEffect: '触发 CONSUMER 并抽 1 张牌。\n本身不直接赚钱，依赖工具和后续牌接力。',
    effects: [
      { type: 'TRIGGER_SECTOR', sector: 'CONSUMER' },
      { type: 'DRAW_CARD', value: 1 }
    ]
  },
  {
    id: 'formal-consumer-003',
    name: '蓝筹买入',
    sector: 'CONSUMER',
    rank: 5,
    risk: 'low',
    tags: ['blueChip', 'chain'],
    baseReturn: 7,
    baseRisk: 4,
    cardType: 'BUY',
    playEffect: '获得小额收益并 risk -4。\n低风险慢牌，适合给高风险连锁垫底。',
    effects: [
      { type: 'GAIN_PROFIT', value: 7, sector: 'CONSUMER' },
      { type: 'REDUCE_RISK', value: 4 }
    ]
  },
  {
    id: 'formal-consumer-004',
    name: '抄底反弹',
    sector: 'CONSUMER',
    rank: 7,
    risk: 'medium',
    tags: ['turnaround', 'value'],
    baseReturn: 11,
    baseRisk: 9,
    cardType: 'DIP_BUY',
    playEffect: '风险事件后获得反弹收益并 combo +1。\n需要前置风险，节奏偏防守反击。',
    effects: [
      {
        type: 'REBOUND_IF_EVENT',
        eventTypes: ['RISK_GAINED', 'LOSS_TAKEN'],
        profit: 16,
        riskReduction: 4
      },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'formal-consumer-005',
    name: '题材追击',
    sector: 'CONSUMER',
    rank: 8,
    risk: 'high',
    tags: ['concept', 'momentum', 'volatile'],
    baseReturn: 16,
    baseRisk: 14,
    cardType: 'CHASE',
    playEffect: '已有收益时触发 LIMIT_UP，获得追击收益并 combo +1。\n高风险题材牌，适合接在收益事件后。',
    effects: [{ type: 'TRIGGER_LIMIT_UP_IF_PROFIT', profit: 20, comboGain: 1 }]
  },
  {
    id: 'formal-consumer-006',
    name: '复苏抽牌',
    sector: 'CONSUMER',
    rank: 6,
    risk: 'medium',
    tags: ['turnaround', 'momentum'],
    baseReturn: 12,
    baseRisk: 10,
    cardType: 'DRAW',
    playEffect: '获得收益，触发 CONSUMER，并抽 1 张牌。\n中等风险，适合轮动流补牌。',
    effects: [
      { type: 'GAIN_PROFIT', value: 12, sector: 'CONSUMER' },
      { type: 'TRIGGER_SECTOR', sector: 'CONSUMER' },
      { type: 'DRAW_CARD', value: 1 }
    ]
  },
  {
    id: 'formal-medical-001',
    name: '药研买入',
    sector: 'MEDICAL',
    rank: 9,
    risk: 'high',
    tags: ['growth', 'concept', 'volatile'],
    baseReturn: 19,
    baseRisk: 16,
    cardType: 'BUY',
    playEffect: '获得高收益，触发 MEDICAL，并 combo +1。\n高风险概念牌，适合板块共振开路。',
    effects: [
      { type: 'GAIN_PROFIT', value: 19, sector: 'MEDICAL' },
      { type: 'TRIGGER_SECTOR', sector: 'MEDICAL' },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'formal-medical-002',
    name: '医械共振',
    sector: 'MEDICAL',
    rank: 6,
    risk: 'medium',
    tags: ['chain', 'value'],
    baseReturn: 10,
    baseRisk: 8,
    cardType: 'SECTOR',
    playEffect: '触发 MEDICAL，获得收益并降 risk。\n中等风险，负责把医药链接稳。',
    effects: [
      { type: 'TRIGGER_SECTOR', sector: 'MEDICAL' },
      { type: 'GAIN_PROFIT', value: 10, sector: 'MEDICAL' },
      { type: 'REDUCE_RISK', value: 3 }
    ]
  },
  {
    id: 'formal-medical-003',
    name: '药箱锁利',
    sector: 'MEDICAL',
    rank: 5,
    risk: 'low',
    tags: ['blueChip', 'value'],
    baseReturn: 7,
    baseRisk: 4,
    cardType: 'CASH_OUT',
    playEffect: '锁定 25% 浮盈并 risk -10。\n低风险防守牌，会降低继续贪的浮盈弹性。',
    effects: [{ type: 'CASH_OUT', ratio: 0.25, riskReduction: 10 }]
  },
  {
    id: 'formal-medical-004',
    name: '概念爆发',
    sector: 'MEDICAL',
    rank: 10,
    risk: 'extreme',
    tags: ['concept', 'growth', 'volatile'],
    baseReturn: 25,
    baseRisk: 23,
    cardType: 'RISK',
    playEffect: '获得巨大收益并 combo +1。\n同时 risk +22，可能直接把自己送到爆仓线。',
    effects: [
      { type: 'GAIN_PROFIT', value: 28, sector: 'MEDICAL' },
      { type: 'GAIN_RISK', value: 22 },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'formal-medical-005',
    name: '量化复制',
    sector: 'MEDICAL',
    rank: 7,
    risk: 'medium',
    tags: ['growth', 'chain'],
    baseReturn: 12,
    baseRisk: 9,
    cardType: 'COPY',
    playEffect: '复制上一张牌的基础效果，触发 CARD_COPIED。\n中等风险，强度取决于上一张牌。',
    effects: [{ type: 'COPY_PREVIOUS_CARD' }]
  },
  {
    id: 'formal-medical-006',
    name: '防守低吸',
    sector: 'MEDICAL',
    rank: 4,
    risk: 'low',
    tags: ['blueChip', 'value'],
    baseReturn: 5,
    baseRisk: 3,
    cardType: 'DIP_BUY',
    playEffect: '有风险事件时回补收益并 risk -8。\n低风险防守牌，空打需要等待触发。',
    effects: [
      {
        type: 'REBOUND_IF_EVENT',
        eventTypes: ['RISK_GAINED', 'LOSS_TAKEN'],
        profit: 12,
        riskReduction: 8
      }
    ]
  },
  {
    id: 'formal-energy-001',
    name: '电池买入',
    sector: 'ENERGY',
    rank: 9,
    risk: 'high',
    tags: ['leader', 'chain', 'volatile'],
    baseReturn: 18,
    baseRisk: 16,
    cardType: 'BUY',
    playEffect: '获得收益，触发 ENERGY，并 combo +1。\n高风险龙头牌，适合新能源链启动。',
    effects: [
      { type: 'GAIN_PROFIT', value: 18, sector: 'ENERGY' },
      { type: 'TRIGGER_SECTOR', sector: 'ENERGY' },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'formal-energy-002',
    name: '风塔抽牌',
    sector: 'ENERGY',
    rank: 6,
    risk: 'medium',
    tags: ['chain', 'value'],
    baseReturn: 10,
    baseRisk: 8,
    cardType: 'DRAW',
    playEffect: '获得收益并抽 1 张牌。\n中等风险，主要负责延长回合。',
    effects: [
      { type: 'GAIN_PROFIT', value: 10, sector: 'ENERGY' },
      { type: 'DRAW_CARD', value: 1 }
    ]
  },
  {
    id: 'formal-energy-003',
    name: '储能追击',
    sector: 'ENERGY',
    rank: 8,
    risk: 'high',
    tags: ['growth', 'concept', 'momentum'],
    baseReturn: 17,
    baseRisk: 14,
    cardType: 'CHASE',
    playEffect: '已有收益时触发 LIMIT_UP，获得追击收益并 combo +1。\n高风险追涨牌，需要先有收益铺垫。',
    effects: [{ type: 'TRIGGER_LIMIT_UP_IF_PROFIT', profit: 21, comboGain: 1 }]
  },
  {
    id: 'formal-energy-004',
    name: '光伏回补',
    sector: 'ENERGY',
    rank: 5,
    risk: 'medium',
    tags: ['turnaround', 'chain'],
    baseReturn: 9,
    baseRisk: 8,
    cardType: 'SECTOR',
    playEffect: '触发 ENERGY，压力低于半血时追加伤害。\n中等风险，适合收割 MarketPressure。',
    effects: [
      { type: 'TRIGGER_SECTOR', sector: 'ENERGY' },
      { type: 'DAMAGE_PRESSURE_IF_HP_BELOW', thresholdRatio: 0.5, damage: 20 }
    ]
  },
  {
    id: 'formal-energy-005',
    name: '氢能点火',
    sector: 'ENERGY',
    rank: 10,
    risk: 'extreme',
    tags: ['concept', 'momentum', 'volatile'],
    baseReturn: 24,
    baseRisk: 23,
    cardType: 'LEVERAGE',
    playEffect: '触发 LIMIT_UP，获得高收益并 combo +2。\n同时 risk +20，是高爆发高危险牌。',
    effects: [
      { type: 'TRIGGER_LIMIT_UP', comboGain: 2 },
      { type: 'GAIN_PROFIT', value: 24, sector: 'ENERGY' },
      { type: 'GAIN_RISK', value: 20 }
    ]
  },
  {
    id: 'formal-energy-006',
    name: '产业复制',
    sector: 'ENERGY',
    rank: 7,
    risk: 'medium',
    tags: ['chain', 'growth'],
    baseReturn: 12,
    baseRisk: 9,
    cardType: 'COPY',
    playEffect: '复制上一张牌的基础效果。\n中等风险，适合接在抽牌或追击之后。',
    effects: [{ type: 'COPY_PREVIOUS_CARD' }]
  },
  {
    id: 'formal-finance-001',
    name: '盘口追击',
    sector: 'FINANCE',
    rank: 8,
    risk: 'high',
    tags: ['momentum', 'leader', 'volatile'],
    baseReturn: 16,
    baseRisk: 14,
    cardType: 'CHASE',
    playEffect: '已有收益时触发 LIMIT_UP，获得追击收益并 combo +1。\n额外 risk +6，追涨时会推高爆仓风险。',
    effects: [
      { type: 'TRIGGER_LIMIT_UP_IF_PROFIT', profit: 20, comboGain: 1 },
      { type: 'GAIN_RISK', value: 6 }
    ]
  },
  {
    id: 'formal-finance-002',
    name: '蓝筹锁利',
    sector: 'FINANCE',
    rank: 5,
    risk: 'low',
    tags: ['blueChip', 'value'],
    baseReturn: 6,
    baseRisk: 3,
    cardType: 'CASH_OUT',
    playEffect: '锁定 20% 浮盈并 risk -8。\n低风险落袋牌，适合在爆仓前刹车。',
    effects: [{ type: 'CASH_OUT', ratio: 0.2, riskReduction: 8 }]
  },
  {
    id: 'formal-finance-003',
    name: '保险反弹',
    sector: 'FINANCE',
    rank: 6,
    risk: 'medium',
    tags: ['value', 'turnaround'],
    baseReturn: 9,
    baseRisk: 7,
    cardType: 'DIP_BUY',
    playEffect: '风险事件后获得反弹收益并降低 risk。\n中等风险，需要先承受风险再回血。',
    effects: [
      {
        type: 'REBOUND_IF_EVENT',
        eventTypes: ['RISK_GAINED', 'LOSS_TAKEN'],
        profit: 14,
        riskReduction: 7
      }
    ]
  },
  {
    id: 'formal-finance-004',
    name: '金科爆发',
    sector: 'FINANCE',
    rank: 9,
    risk: 'high',
    tags: ['concept', 'growth', 'volatile'],
    baseReturn: 18,
    baseRisk: 16,
    cardType: 'RISK',
    playEffect: '获得高收益并 combo +1。\n同时 risk +14，适合有风控工具时使用。',
    effects: [
      { type: 'GAIN_PROFIT', value: 20, sector: 'FINANCE' },
      { type: 'GAIN_RISK', value: 14 },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'formal-finance-005',
    name: '融资抽牌',
    sector: 'FINANCE',
    rank: 4,
    risk: 'medium',
    tags: ['value', 'chain'],
    baseReturn: 8,
    baseRisk: 7,
    cardType: 'DRAW',
    playEffect: '触发 FINANCE 并抽 1 张牌。\n中等风险，用来接金融工具和延长手牌。',
    effects: [
      { type: 'TRIGGER_SECTOR', sector: 'FINANCE' },
      { type: 'DRAW_CARD', value: 1 }
    ]
  },
  {
    id: 'formal-finance-006',
    name: '杠杆终结',
    sector: 'FINANCE',
    rank: 10,
    risk: 'extreme',
    tags: ['momentum', 'concept', 'volatile'],
    baseReturn: 23,
    baseRisk: 22,
    cardType: 'FINISHER',
    playEffect: '按 comboCount 获得爆发收益并结束当前交易。\n同时 risk +10，最好在高 combo 时打出。',
    effects: [
      { type: 'GAIN_PROFIT_FROM_COMBO', profitPerCombo: 16 },
      { type: 'GAIN_RISK', value: 10 },
      { type: 'END_TRADE' }
    ]
  }
];

export const FORMAL_EVENT_CARDS: EventCard[] = FORMAL_EVENT_CARD_DEFINITIONS.map(
  withTurboturnShape
);

function withTurboturnShape(card: FormalEventCardDefinition): EventCard {
  return {
    ...card,
    cost: getCostForCardType(card.cardType ?? 'BUY'),
    cardRole: getRoleForCardType(card.cardType ?? 'BUY')
  };
}

function getCostForCardType(cardType: FormalCardType): EventCardCost {
  if (cardType === 'DRAW' || cardType === 'CASH_OUT') {
    return 0;
  }

  if (cardType === 'BUY' || cardType === 'DIP_BUY' || cardType === 'SECTOR') {
    return 1;
  }

  if (
    cardType === 'CHASE' ||
    cardType === 'LEVERAGE' ||
    cardType === 'COPY' ||
    cardType === 'RISK'
  ) {
    return 2;
  }

  return 3;
}

function getRoleForCardType(cardType: FormalCardType): EventCardRole {
  if (cardType === 'DRAW' || cardType === 'COPY') {
    return 'EXTENDER';
  }

  if (cardType === 'CASH_OUT' || cardType === 'DIP_BUY') {
    return 'DEFENSE';
  }

  if (cardType === 'FINISHER') {
    return 'FINISHER';
  }

  if (cardType === 'CHASE' || cardType === 'LEVERAGE' || cardType === 'RISK') {
    return 'PAYOFF';
  }

  return 'STARTER';
}

export const FORMAL_EVENT_TOOLS: EventTool[] = [
  {
    id: 'formal-tool-limit-up-calculator',
    name: '涨停板计算器',
    description: '触发条件：LIMIT_UP。效果：combo +2，并获得追涨收益。',
    triggerEvents: ['LIMIT_UP'],
    trigger: { type: 'LIMIT_UP' },
    effects: [
      { type: 'GAIN_COMBO', value: 2 },
      { type: 'GAIN_PROFIT', value: 12, sector: 'TECH' }
    ]
  },
  {
    id: 'formal-tool-red-candle-stamp',
    name: '连击终端',
    description: '触发条件：COMBO_GAINED。效果：每回合最多 4 次，获得小额收益。',
    triggerEvents: ['COMBO_GAINED'],
    trigger: { type: 'COMBO_GAINED', minValue: 1 },
    limitPerTurn: 4,
    effects: [{ type: 'GAIN_PROFIT', value: 5, sector: 'FINANCE' }]
  },
  {
    id: 'formal-tool-hot-money-compass',
    name: '科技扩音器',
    description: '触发条件：TECH 板块事件。效果：获得收益，并 combo +1。',
    triggerEvents: ['SECTOR_TRIGGERED'],
    trigger: { type: 'SECTOR_TRIGGERED', meta: { sector: 'TECH' } },
    effects: [
      { type: 'GAIN_PROFIT', value: 8, sector: 'TECH' },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'formal-tool-bubble-loupe',
    name: '游资席位',
    description: '触发条件：LIMIT_UP。效果：每回合最多 3 次，获得收益，但 risk +4。',
    triggerEvents: ['LIMIT_UP'],
    trigger: { type: 'LIMIT_UP' },
    limitPerTurn: 3,
    effects: [
      { type: 'GAIN_PROFIT', value: 10, sector: 'ENERGY' },
      { type: 'GAIN_RISK', value: 4 }
    ]
  },
  {
    id: 'formal-tool-old-trader-cup',
    name: '老股民茶杯',
    description: '触发条件：RISK_GAINED。效果：每天最多 1 次，risk -8。',
    triggerEvents: ['RISK_GAINED'],
    trigger: { type: 'RISK_GAINED' },
    limitPerDay: 1,
    effects: [{ type: 'REDUCE_RISK', value: 8 }]
  },
  {
    id: 'formal-tool-broker-insurance',
    name: '券商保险单',
    description: '触发条件：BANKRUPTCY_WARNING。效果：每天最多 1 次，锁定部分浮盈。',
    triggerEvents: ['BANKRUPTCY_WARNING'],
    trigger: { type: 'BANKRUPTCY_WARNING' },
    limitPerDay: 1,
    effects: [{ type: 'LOCK_FLOATING_PROFIT', ratio: 0.25 }]
  },
  {
    id: 'formal-tool-stop-loss-ruler',
    name: '风险补偿器',
    description: '触发条件：RISK_GAINED 且数值至少 10。效果：risk -6。',
    triggerEvents: ['RISK_GAINED'],
    trigger: { type: 'RISK_GAINED', minValue: 10 },
    effects: [{ type: 'REDUCE_RISK', value: 6 }]
  },
  {
    id: 'formal-tool-calm-bell',
    name: '冷静铃',
    description: '触发条件：LIMIT_DOWN。效果：每回合最多 2 次，risk -5。',
    triggerEvents: ['LIMIT_DOWN'],
    trigger: { type: 'LIMIT_DOWN' },
    limitPerTurn: 2,
    effects: [{ type: 'REDUCE_RISK', value: 5 }]
  },
  {
    id: 'formal-tool-industry-reports',
    name: '行业研报库',
    description: '触发条件：任意板块事件。效果：每回合最多 4 次，combo +1。',
    triggerEvents: ['SECTOR_TRIGGERED'],
    trigger: { type: 'SECTOR_TRIGGERED' },
    limitPerTurn: 4,
    effects: [{ type: 'GAIN_COMBO', value: 1 }]
  },
  {
    id: 'formal-tool-sector-thermometer',
    name: '板块温度计',
    description: '触发条件：CONSUMER 板块事件。效果：抽 1 张牌。',
    triggerEvents: ['SECTOR_TRIGGERED'],
    trigger: { type: 'SECTOR_TRIGGERED', meta: { sector: 'CONSUMER' } },
    effects: [{ type: 'DRAW_CARD', value: 1 }]
  },
  {
    id: 'formal-tool-weak-sector-umbrella',
    name: '弱势雨伞',
    description: '触发条件：MEDICAL 板块事件。效果：risk -5。',
    triggerEvents: ['SECTOR_TRIGGERED'],
    trigger: { type: 'SECTOR_TRIGGERED', meta: { sector: 'MEDICAL' } },
    effects: [{ type: 'REDUCE_RISK', value: 5 }]
  },
  {
    id: 'formal-tool-blue-chip-ledger',
    name: '现金保险箱',
    description: '触发条件：CASH_OUT。效果：额外锁定 10% 浮盈。',
    triggerEvents: ['CASH_OUT'],
    trigger: { type: 'CASH_OUT' },
    effects: [{ type: 'LOCK_FLOATING_PROFIT', ratio: 0.1 }]
  },
  {
    id: 'formal-tool-chive-notebook',
    name: '韭菜笔记本',
    description: '触发条件：LOSS_TAKEN。效果：抽 1 张牌，并 combo +1。',
    triggerEvents: ['LOSS_TAKEN'],
    trigger: { type: 'LOSS_TAKEN' },
    effects: [
      { type: 'DRAW_CARD', value: 1 },
      { type: 'GAIN_COMBO', value: 1 }
    ]
  },
  {
    id: 'formal-tool-rebound-spring',
    name: '反弹弹簧',
    description: '触发条件：RISK_REDUCED。效果：每回合最多 3 次，获得反弹收益。',
    triggerEvents: ['RISK_REDUCED'],
    trigger: { type: 'RISK_REDUCED' },
    limitPerTurn: 3,
    effects: [{ type: 'GAIN_PROFIT', value: 9, sector: 'MEDICAL' }]
  },
  {
    id: 'formal-tool-bargain-basket',
    name: '抄底菜篮',
    description: '触发条件：RISK_GAINED 且数值至少 10。效果：获得补偿收益。',
    triggerEvents: ['RISK_GAINED'],
    trigger: { type: 'RISK_GAINED', minValue: 10 },
    effects: [{ type: 'GAIN_PROFIT', value: 10, sector: 'CONSUMER' }]
  },
  {
    id: 'formal-tool-paper-hands-gloves',
    name: '纸手套',
    description: '触发条件：CASH_OUT。效果：risk -5。',
    triggerEvents: ['CASH_OUT'],
    trigger: { type: 'CASH_OUT' },
    effects: [{ type: 'REDUCE_RISK', value: 5 }]
  },
  {
    id: 'formal-tool-margin-stamp',
    name: '融资印章',
    description: '触发条件：LEVERAGE_ADDED。效果：combo +1，并获得收益。',
    triggerEvents: ['LEVERAGE_ADDED'],
    trigger: { type: 'LEVERAGE_ADDED' },
    effects: [
      { type: 'GAIN_COMBO', value: 1 },
      { type: 'GAIN_PROFIT', value: 8, sector: 'FINANCE' }
    ]
  },
  {
    id: 'formal-tool-margin-seatbelt',
    name: '杠杆安全带',
    description: '触发条件：LEVERAGE_ADDED。效果：每回合最多 2 次，risk -7。',
    triggerEvents: ['LEVERAGE_ADDED'],
    trigger: { type: 'LEVERAGE_ADDED' },
    limitPerTurn: 2,
    effects: [{ type: 'REDUCE_RISK', value: 7 }]
  },
  {
    id: 'formal-tool-double-or-nothing-coin',
    name: '梭哈硬币',
    description: '触发条件：combo 达到 5/10/20。效果：获得阶段爆发收益。',
    triggerEvents: ['COMBO_GAINED'],
    trigger: { type: 'COMBO_GAINED', comboThresholds: [5, 10, 20] },
    effects: [{ type: 'GAIN_PROFIT_BY_COMBO_THRESHOLD', values: { 5: 18, 10: 45, 20: 110 } }]
  },
  {
    id: 'formal-tool-liquidation-helmet',
    name: '爆仓头盔',
    description: '触发条件：BANKRUPTCY_WARNING。效果：每天最多 1 次，risk -12。',
    triggerEvents: ['BANKRUPTCY_WARNING'],
    trigger: { type: 'BANKRUPTCY_WARNING' },
    limitPerDay: 1,
    effects: [{ type: 'REDUCE_RISK', value: 12 }]
  }
];

export const FORMAL_MIGRATION_LIST: MigrationListItem[] = FORMAL_EVENT_CARDS.map(
  (card) => ({
    cardName: card.name,
    type: card.cardType ?? 'BUY',
    triggerEvents: getTriggerEvents(card),
    archetypes: getArchetypes(card),
    riskPoint: getRiskPoint(card),
    note: card.playEffect ?? ''
  })
);

function getTriggerEvents(card: EventCard) {
  const events = new Set<string>(['CARD_PLAYED']);

  for (const effect of card.effects) {
    if (effect.type === 'GAIN_PROFIT') events.add('PROFIT_GAINED');
    if (effect.type === 'GAIN_RISK') events.add('RISK_GAINED');
    if (effect.type === 'REDUCE_RISK') events.add('RISK_REDUCED');
    if (effect.type === 'GAIN_COMBO') events.add('COMBO_GAINED');
    if (effect.type === 'TRIGGER_SECTOR') events.add('SECTOR_TRIGGERED');
    if (effect.type === 'TRIGGER_HOT_SECTOR') events.add('SECTOR_TRIGGERED');
    if (effect.type === 'TRIGGER_LIMIT_UP') events.add('LIMIT_UP');
    if (effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT') events.add('LIMIT_UP');
    if (effect.type === 'COPY_PREVIOUS_CARD') events.add('CARD_COPIED');
    if (effect.type === 'DRAW_CARD') events.add('CARD_DRAWN');
    if (effect.type === 'CASH_OUT') events.add('CASH_OUT');
    if (effect.type === 'REBOUND_IF_EVENT') events.add('PROFIT_GAINED');
    if (effect.type === 'DAMAGE_PRESSURE_IF_HP_BELOW') events.add('MARKET_PRESSURE_DAMAGED');
    if (effect.type === 'END_TRADE') events.add('TRADE_ENDED');
  }

  return [...events];
}

function getArchetypes(card: EventCard) {
  const archetypes = new Set<string>();

  if (card.effects.some((effect) => effect.type === 'TRIGGER_SECTOR')) {
    archetypes.add('板块共振');
  }

  if (
    card.effects.some(
      (effect) => effect.type === 'TRIGGER_LIMIT_UP' || effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT'
    )
  ) {
    archetypes.add('追涨连击');
  }

  if (
    card.effects.some(
      (effect) =>
        effect.type === 'CASH_OUT' ||
        effect.type === 'REDUCE_RISK' ||
        effect.type === 'REBOUND_IF_EVENT'
    )
  ) {
    archetypes.add('风控低吸');
  }

  if (
    card.effects.some(
      (effect) => effect.type === 'DRAW_CARD' || effect.type === 'COPY_PREVIOUS_CARD'
    )
  ) {
    archetypes.add('抽复制链');
  }

  if (card.effects.some((effect) => effect.type === 'END_TRADE')) {
    archetypes.add('终结爆发');
  }

  return [...archetypes];
}

function getRiskPoint(card: EventCard) {
  if (card.effects.some((effect) => effect.type === 'GAIN_RISK')) {
    return '主动增加 risk，适合爆发但可能触发爆仓。';
  }

  if (card.risk === 'high' || card.risk === 'extreme') {
    return '牌面风险高，依赖工具或止盈牌兜底。';
  }

  return '风险较低，主要风险是节奏偏慢。';
}
