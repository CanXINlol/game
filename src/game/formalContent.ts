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
    archetype: '板块',
    playEffect: '买入科技主线，获得收益并推进连锁。\n科技工具在场时更强，适合开局启动板块。\n风险 +15。',
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
    archetype: '板块',
    playEffect: '获得科技收益，并补 1 张手牌。\n手牌不足或想继续接科技牌时更强。\n风险 +9。',
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
    archetype: '追涨',
    playEffect: '点燃一轮追涨，获得高额收益并提高连锁。\n如果本回合已经赚钱，效果更强。\n风险 +14。',
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
    archetype: '低吸',
    playEffect: '在回撤后低吸，赚回收益并降低风险。\n本回合已经承受风险或亏损时更强。\n风险 +7。',
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
    archetype: '杠杆',
    playEffect: '用融资放大仓位，获得爆发收益和连锁。\n已有追涨或杠杆工具时更强。\n额外风险 +18。',
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
    archetype: '板块',
    playEffect: '护住科技板块，获得收益并小幅降风险。\n需要稳定板块连锁时更强。\n风险 +8。',
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
    archetype: '止盈',
    playEffect: '锁定一部分浮盈，并降低风险。\n风险接近警戒线或已赚到钱时更强。\n会减少继续滚动的浮盈。',
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
    archetype: '板块',
    playEffect: '切入消费板块，并补 1 张手牌。\n有板块工具或需要换路线时更强。\n风险 +8。',
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
    archetype: '风控',
    playEffect: '买入稳健蓝筹，获得小额收益并降风险。\n准备接高风险牌前更强。\n爆发较低。',
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
    archetype: '低吸',
    playEffect: '在消费回撤后抄底，获得反弹收益和连锁。\n本回合已经承受风险时更强。\n风险 +9。',
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
    archetype: '追涨',
    playEffect: '追入热门题材，获得追击收益并提高连锁。\n接在赚钱牌后更强。\n风险 +14。',
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
    archetype: '板块',
    playEffect: '抓住消费复苏，获得收益并补 1 张牌。\n轮动到消费板块时更强。\n风险 +10。',
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
    archetype: '板块',
    playEffect: '买入药研主线，获得高收益并推进连锁。\n医药板块工具在场时更强。\n风险 +16。',
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
    archetype: '板块',
    playEffect: '打出医械共振，获得收益并小幅降风险。\n需要维持医药板块时更强。\n风险 +8。',
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
    archetype: '止盈',
    playEffect: '把医药浮盈装进药箱，并大幅降风险。\n浮盈较高或风险偏高时更强。\n会削弱继续爆发空间。',
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
    archetype: '追涨',
    playEffect: '押注医药概念爆发，获得巨大收益和连锁。\n有保险或降风险工具时更强。\n额外风险 +22。',
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
    archetype: '复制',
    playEffect: '复制上一张牌的核心效果。\n接在高收益或强功能牌后更强。\n风险 +9。',
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
    archetype: '风控',
    playEffect: '防守低吸，回补收益并大幅降风险。\n本回合已经吃到风险时更强。\n空打收益有限。',
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
    archetype: '板块',
    playEffect: '买入电池龙头，获得收益并推进连锁。\n新能源工具在场时更强。\n风险 +16。',
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
    archetype: '板块',
    playEffect: '获得风电收益，并补 1 张手牌。\n需要延长新能源回合时更强。\n风险 +8。',
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
    archetype: '追涨',
    playEffect: '追击储能行情，获得高额收益并提高连锁。\n本回合已经赚钱时更强。\n风险 +14。',
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
    archetype: '终结',
    playEffect: '回补光伏仓位，并对低血量市场压力追加打击。\n市场压力低于半血时更强。\n风险 +8。',
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
    archetype: '杠杆',
    playEffect: '用氢能题材点火，获得高收益和大量连锁。\n追涨工具或杠杆工具在场时更强。\n额外风险 +20。',
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
    archetype: '复制',
    playEffect: '复制上一张产业牌的核心效果。\n接在抽牌、追涨或板块牌后更强。\n风险 +9。',
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
    archetype: '追涨',
    playEffect: '追击盘口异动，获得高额收益并提高连锁。\n本回合已经赚钱时更强。\n额外风险 +6。',
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
    archetype: '止盈',
    playEffect: '锁定蓝筹浮盈，并降低风险。\n爆仓前刹车或保存胜势时更强。\n收益爆发较低。',
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
    archetype: '低吸',
    playEffect: '在金融回撤后反弹，获得收益并降低风险。\n本回合已经承受风险时更强。\n风险 +7。',
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
    archetype: '杠杆',
    playEffect: '押注金科爆发，获得高收益并提高连锁。\n有风控或保险兜底时更强。\n额外风险 +14。',
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
    archetype: '杠杆',
    playEffect: '打开融资通道，并补 1 张手牌。\n需要延长金融或杠杆回合时更强。\n风险 +7。',
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
    archetype: '终结',
    playEffect: '按当前连锁层数结算爆发收益，并结束交易。\n连锁越高越强，适合作为最后一张牌。\n额外风险 +10。',
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
    return 1;
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
    description: '触发条件：打出追涨或点火效果。效果：连锁 +2，并获得追涨收益。',
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
    description: '触发条件：连锁增加。效果：每回合最多 4 次，获得小额收益。',
    triggerEvents: ['COMBO_GAINED'],
    trigger: { type: 'COMBO_GAINED', minValue: 1 },
    limitPerTurn: 4,
    effects: [{ type: 'GAIN_PROFIT', value: 5, sector: 'FINANCE' }]
  },
  {
    id: 'formal-tool-hot-money-compass',
    name: '科技扩音器',
    description: '触发条件：科技板块被激活。效果：获得收益，并连锁 +1。',
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
    description: '触发条件：打出追涨或点火效果。效果：每回合最多 3 次，获得收益，但风险 +4。',
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
    description: '触发条件：风险上升。效果：每天最多 1 次，风险 -8。',
    triggerEvents: ['RISK_GAINED'],
    trigger: { type: 'RISK_GAINED' },
    limitPerDay: 1,
    effects: [{ type: 'REDUCE_RISK', value: 8 }]
  },
  {
    id: 'formal-tool-broker-insurance',
    name: '券商保险单',
    description: '触发条件：接近爆仓。效果：每天最多 1 次，锁定部分浮盈。',
    triggerEvents: ['BANKRUPTCY_WARNING'],
    trigger: { type: 'BANKRUPTCY_WARNING' },
    limitPerDay: 1,
    effects: [{ type: 'LOCK_FLOATING_PROFIT', ratio: 0.25 }]
  },
  {
    id: 'formal-tool-stop-loss-ruler',
    name: '风险补偿器',
    description: '触发条件：单次风险上升至少 10。效果：风险 -6。',
    triggerEvents: ['RISK_GAINED'],
    trigger: { type: 'RISK_GAINED', minValue: 10 },
    effects: [{ type: 'REDUCE_RISK', value: 6 }]
  },
  {
    id: 'formal-tool-calm-bell',
    name: '冷静铃',
    description: '触发条件：追涨失败或行情转弱。效果：每回合最多 2 次，风险 -5。',
    triggerEvents: ['LIMIT_DOWN'],
    trigger: { type: 'LIMIT_DOWN' },
    limitPerTurn: 2,
    effects: [{ type: 'REDUCE_RISK', value: 5 }]
  },
  {
    id: 'formal-tool-industry-reports',
    name: '行业研报库',
    description: '触发条件：任意板块被激活。效果：每回合最多 4 次，连锁 +1。',
    triggerEvents: ['SECTOR_TRIGGERED'],
    trigger: { type: 'SECTOR_TRIGGERED' },
    limitPerTurn: 4,
    effects: [{ type: 'GAIN_COMBO', value: 1 }]
  },
  {
    id: 'formal-tool-sector-thermometer',
    name: '板块温度计',
    description: '触发条件：消费板块被激活。效果：抽 1 张牌。',
    triggerEvents: ['SECTOR_TRIGGERED'],
    trigger: { type: 'SECTOR_TRIGGERED', meta: { sector: 'CONSUMER' } },
    effects: [{ type: 'DRAW_CARD', value: 1 }]
  },
  {
    id: 'formal-tool-weak-sector-umbrella',
    name: '弱势雨伞',
    description: '触发条件：医药板块被激活。效果：风险 -5。',
    triggerEvents: ['SECTOR_TRIGGERED'],
    trigger: { type: 'SECTOR_TRIGGERED', meta: { sector: 'MEDICAL' } },
    effects: [{ type: 'REDUCE_RISK', value: 5 }]
  },
  {
    id: 'formal-tool-blue-chip-ledger',
    name: '现金保险箱',
    description: '触发条件：锁定浮盈。效果：额外锁定 10% 浮盈。',
    triggerEvents: ['CASH_OUT'],
    trigger: { type: 'CASH_OUT' },
    effects: [{ type: 'LOCK_FLOATING_PROFIT', ratio: 0.1 }]
  },
  {
    id: 'formal-tool-chive-notebook',
    name: '韭菜笔记本',
    description: '触发条件：承受亏损。效果：抽 1 张牌，并连锁 +1。',
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
    description: '触发条件：风险下降。效果：每回合最多 3 次，获得反弹收益。',
    triggerEvents: ['RISK_REDUCED'],
    trigger: { type: 'RISK_REDUCED' },
    limitPerTurn: 3,
    effects: [{ type: 'GAIN_PROFIT', value: 9, sector: 'MEDICAL' }]
  },
  {
    id: 'formal-tool-bargain-basket',
    name: '抄底菜篮',
    description: '触发条件：单次风险上升至少 10。效果：获得补偿收益。',
    triggerEvents: ['RISK_GAINED'],
    trigger: { type: 'RISK_GAINED', minValue: 10 },
    effects: [{ type: 'GAIN_PROFIT', value: 10, sector: 'CONSUMER' }]
  },
  {
    id: 'formal-tool-paper-hands-gloves',
    name: '纸手套',
    description: '触发条件：锁定浮盈。效果：风险 -5。',
    triggerEvents: ['CASH_OUT'],
    trigger: { type: 'CASH_OUT' },
    effects: [{ type: 'REDUCE_RISK', value: 5 }]
  },
  {
    id: 'formal-tool-margin-stamp',
    name: '融资印章',
    description: '触发条件：打出杠杆牌。效果：连锁 +1，并获得收益。',
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
    description: '触发条件：打出杠杆牌。效果：每回合最多 2 次，风险 -7。',
    triggerEvents: ['LEVERAGE_ADDED'],
    trigger: { type: 'LEVERAGE_ADDED' },
    limitPerTurn: 2,
    effects: [{ type: 'REDUCE_RISK', value: 7 }]
  },
  {
    id: 'formal-tool-double-or-nothing-coin',
    name: '梭哈硬币',
    description: '触发条件：连锁达到 5/10/20。效果：获得阶段爆发收益。',
    triggerEvents: ['COMBO_GAINED'],
    trigger: { type: 'COMBO_GAINED', comboThresholds: [5, 10, 20] },
    effects: [{ type: 'GAIN_PROFIT_BY_COMBO_THRESHOLD', values: { 5: 18, 10: 45, 20: 110 } }]
  },
  {
    id: 'formal-tool-liquidation-helmet',
    name: '爆仓头盔',
    description: '触发条件：接近爆仓。效果：每天最多 1 次，风险 -12。',
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

  if (card.archetype) {
    archetypes.add(card.archetype);
  }

  if (card.effects.some((effect) => effect.type === 'TRIGGER_SECTOR')) {
    archetypes.add('板块');
  }

  if (
    card.effects.some(
      (effect) => effect.type === 'TRIGGER_LIMIT_UP' || effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT'
    )
  ) {
    archetypes.add('追涨');
  }

  if (
    card.effects.some(
      (effect) =>
        effect.type === 'CASH_OUT' ||
        effect.type === 'REDUCE_RISK' ||
        effect.type === 'REBOUND_IF_EVENT'
    )
  ) {
    archetypes.add('风控');
  }

  if (
    card.effects.some(
      (effect) => effect.type === 'DRAW_CARD' || effect.type === 'COPY_PREVIOUS_CARD'
    )
  ) {
    archetypes.add('复制');
  }

  if (card.effects.some((effect) => effect.type === 'END_TRADE')) {
    archetypes.add('终结');
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
