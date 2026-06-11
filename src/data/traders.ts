import { STOCK_CARDS } from './stockCards';
import type { Trader } from '../game/types';

const starter12 = STOCK_CARDS.slice(0, 12).map((c) => c.id);

export const TRADERS: Trader[] = [
  {
    id: 'old-hand',
    name: '老股民',
    title: '稳健止盈 / 风控',
    description: '现金更宽裕，止盈更强，适合先学会活下来。',
    startingCash: 150,
    startingDeckCardIds: [...starter12],
    startingToolIds: ['old-hand-cup'],
    passive: '止盈牌锁定比例 +10%；高风险牌收益 x0.9。'
  },
  {
    id: 'hot-money',
    name: '游资打板客',
    title: '追涨爆发',
    description: '追涨牌更猛，风险涨得更快，适合冲高打法。',
    startingCash: 100,
    startingDeckCardIds: [
      'chase-limit', 'extreme-chase', 'dragon-follow', 'late-ignite',
      'open-position', 'margin-add', 'theme-ignite', 'closing-sweep',
      'hedge', 'partial-profit', 'quant-turnover', 'full-exit'
    ],
    startingToolIds: ['hot-money-seat'],
    passive: '追涨牌收益 x1.2；风险增长 x1.25。'
  },
  {
    id: 'quant-newbie',
    name: '量化新人',
    title: '抽牌 / 复制 / 引擎',
    description: '容易做交易链引擎，但终结牌偏弱。',
    startingCash: 120,
    startingDeckCardIds: [
      'quant-turnover', 'wash-turnover', 'quant-clone', 'overnight-order',
      'stealth-build', 'open-position', 'hedge', 'volume-wash',
      'ap-rush', 'partial-profit', 'dip-rebound', 'full-exit'
    ],
    startingToolIds: ['quant-terminal'],
    passive: '每回合第一次抽牌额外 +1；终结牌收益 x0.8。'
  },
  {
    id: 'bankrupt-gambler',
    name: '破产赌徒',
    title: '杠杆边缘',
    description: '风险越高收益越高，爆仓惩罚更狠。',
    startingCash: 70,
    startingDeckCardIds: [
      'redline-leverage', 'dual-margin', 'emotion-pulse', 'extreme-chase',
      'limit-dip', 'margin-add', 'open-position', 'chase-limit',
      'black-swan-hedge', 'partial-profit', 'hedge', 'full-exit'
    ],
    startingToolIds: ['redline-margin'],
    passive: '风险越高收益越高；爆仓损失全部浮盈。'
  },
  {
    id: 'risk-manager',
    name: '风控经理',
    title: '保险 / 降风险 / 锁收益',
    description: '经济和安全性强，爆发较弱。',
    startingCash: 140,
    startingDeckCardIds: [
      'hedge', 'partial-profit', 'cash-defense', 'breakeven-stop',
      'black-swan-hedge', 'dip-rebound', 'open-position', 'volume-wash',
      'swing-take', 'stealth-build', 'quant-turnover', 'full-exit'
    ],
    startingToolIds: ['risk-stamp'],
    passive: '风控服务价格 x0.75；回报牌收益 x0.9。'
  }
];

export function getTrader(traderId = 'old-hand'): Trader {
  const trader = TRADERS.find((item) => item.id === traderId);

  if (!trader) {
    throw new Error(`Unknown trader: ${traderId}`);
  }

  return trader;
}




