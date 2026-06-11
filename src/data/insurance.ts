import type { Insurance } from '../game/types';

export const INSURANCES: Insurance[] = [
  { id: 'bankruptcy-buffer', name: '爆仓缓冲', description: '本场行情第一次爆仓时，风险降到 85，失去 50% 浮盈。', price: 100, effectType: 'BANKRUPTCY_BUFFER', value: 85 },
  { id: 'profit-lock', name: '收益锁', description: '本场行情结束时，自动锁定 40% 浮盈。', price: 90, effectType: 'END_LOCK', value: 0.4 },
  { id: 'risk-hedge', name: '风险对冲', description: '本场行情风险增长降低 30%。', price: 80, effectType: 'RISK_GAIN_REDUCE', value: 0.3 },
  { id: 'floating-shield', name: '浮盈护盾', description: '爆仓时保留 30% 浮盈。', price: 120, effectType: 'FLOATING_SHIELD', value: 0.3 },
  { id: 'margin-delay', name: '追保延迟', description: '风险达到 100 时延迟一回合才爆仓。', price: 110, effectType: 'MARGIN_DELAY', value: 1 },
  { id: 'audit-pass', name: '审计通行证', description: 'Boss 战初始 风险 -10。', price: 90, effectType: 'AUDIT_PASS', value: 10 },
  { id: 'black-pool-umbrella', name: '黑池雨伞', description: '高危行情初始 风险 -8。', price: 85, effectType: 'BLACK_POOL', value: 8 },
  { id: 'final-stop', name: '终极止损', description: '风险 >= 90 时自动锁定 50% 浮盈。', price: 140, effectType: 'FINAL_STOP', value: 0.5 }
];

export const INSURANCE_BY_ID = Object.fromEntries(INSURANCES.map((i) => [i.id, i])) as Record<string, Insurance>;

export function getInsurance(id: string): Insurance {
  const item = INSURANCE_BY_ID[id];
  if (!item) throw new Error(`Unknown insurance: ${id}`);
  return item;
}




