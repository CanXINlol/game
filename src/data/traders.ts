export type TraderDifficulty = '新手' | '标准' | '进阶' | '高难';

export interface TraderDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  startingCash: number;
  startingDeckIds: string[];
  startingToolIds: string[];
  passive: string;
  riskRule: string;
  rewardBias: string;
  unlockCondition: string;
  difficulty: TraderDifficulty;
}

export const TRADERS: TraderDefinition[] = [
  {
    id: 'old-hand',
    name: '老股民',
    title: '稳健止盈 / 风控',
    description: '现金更宽裕，止盈牌锁得更多，适合先学会活下来。',
    startingCash: 170,
    startingDeckIds: [
      'formal-consumer-003',
      'formal-consumer-003',
      'formal-tech-006',
      'formal-medical-002',
      'formal-consumer-001',
      'formal-medical-003',
      'formal-tech-002',
      'formal-energy-002',
      'formal-tech-004',
      'formal-finance-003',
      'formal-finance-006',
      'market-noise'
    ],
    startingToolIds: ['formal-tool-old-trader-cup'],
    passive: '止盈牌锁定比例 +10%；高风险牌收益 x0.9。',
    riskRule: '更容易把浮盈变成现金，但爆发上限略低。',
    rewardBias: '更容易走风控、锁利和删牌路线。',
    unlockCondition: '默认解锁',
    difficulty: '新手'
  },
  {
    id: 'hot-money',
    name: '游资打板客',
    title: '追涨 / 涨停 / 高风险',
    description: '追涨和涨停牌更猛，风险也涨得更快。',
    startingCash: 110,
    startingDeckIds: [
      'formal-tech-001',
      'formal-energy-001',
      'formal-tech-003',
      'formal-consumer-005',
      'formal-finance-001',
      'formal-tech-005',
      'formal-consumer-001',
      'formal-tech-004',
      'formal-finance-005',
      'formal-energy-005',
      'formal-finance-006',
      'market-noise'
    ],
    startingToolIds: ['formal-tool-limit-up-calculator'],
    passive: '追涨牌和杠杆牌收益 x1.2；风险增长 x1.25。',
    riskRule: '爆发越快，越需要提前准备止盈或保险。',
    rewardBias: '更偏追涨、涨停和高奖励市场压力。',
    unlockCondition: '默认解锁',
    difficulty: '进阶'
  },
  {
    id: 'quant-newbie',
    name: '量化新人',
    title: '抽牌 / 复制 / 低成本连锁',
    description: '每回合第一次抽牌或复制会给额外收益，但终结牌偏弱。',
    startingCash: 125,
    startingDeckIds: [
      'formal-tech-002',
      'formal-finance-005',
      'formal-energy-002',
      'formal-medical-005',
      'formal-energy-006',
      'formal-consumer-002',
      'formal-tech-001',
      'formal-consumer-003',
      'formal-medical-006',
      'formal-consumer-001',
      'formal-finance-006',
      'market-noise'
    ],
    startingToolIds: ['formal-tool-red-candle-stamp'],
    passive: '每回合第一次抽牌或复制获得 8 收益；终结牌收益 x0.8。',
    riskRule: '连锁强，但拖太久会被敌方意图压垮。',
    rewardBias: '更偏抽牌、复制、低费用和升级。',
    unlockCondition: '默认解锁',
    difficulty: '标准'
  },
  {
    id: 'bankrupt-gambler',
    name: '破产赌徒',
    title: '杠杆 / 低血高收益',
    description: '风险越高收益越高，但爆仓惩罚更狠。',
    startingCash: 80,
    startingDeckIds: [
      'formal-tech-005',
      'formal-energy-005',
      'formal-finance-004',
      'formal-medical-004',
      'formal-tech-003',
      'formal-finance-001',
      'formal-consumer-001',
      'formal-medical-006',
      'formal-finance-005',
      'formal-consumer-003',
      'formal-finance-006',
      'market-noise'
    ],
    startingToolIds: ['formal-tool-margin-stamp'],
    passive: '风险越高收益越高；爆仓线 -10。',
    riskRule: '爆仓时会损失更多已锁定收益。',
    rewardBias: '更偏杠杆、爆发和高危节点。',
    unlockCondition: '默认解锁',
    difficulty: '高难'
  },
  {
    id: 'risk-manager',
    name: '风控经理',
    title: '保险 / 降风险 / 锁浮盈',
    description: '风控服务更便宜，锁利更稳，但爆发较弱。',
    startingCash: 140,
    startingDeckIds: [
      'formal-consumer-003',
      'formal-finance-002',
      'formal-medical-003',
      'formal-tech-006',
      'formal-medical-002',
      'formal-finance-003',
      'formal-consumer-001',
      'formal-tech-002',
      'formal-energy-002',
      'formal-medical-006',
      'formal-finance-006',
      'market-noise'
    ],
    startingToolIds: ['formal-tool-stop-loss-ruler'],
    passive: '风控室和商店服务价格 x0.75；回报牌和终结牌收益 x0.9。',
    riskRule: '更容易修牌和降风险，但击穿速度偏慢。',
    rewardBias: '更偏保险、删牌、升级和降风险。',
    unlockCondition: '默认解锁',
    difficulty: '标准'
  }
];
