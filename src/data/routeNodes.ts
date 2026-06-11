import type { BossId, RouteNode, RouteNodeType } from '../game/types';

interface NodeTemplate {
  type: RouteNodeType;
  name: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  rewardSummary: string;
  greedHint: string;
  encounterKey?: string;
  eventId?: string;
  bossId?: BossId;
}

const ACT_LAYER_COUNTS: Record<number, number> = {
  1: 8,
  2: 9,
  3: 10
};

const NORMAL_MARKETS: NodeTemplate[] = [
  { type: 'NORMAL', name: '夜盘异动', riskLevel: 'LOW', rewardSummary: '现金 / 卡牌', greedHint: '适合稳健起手', encounterKey: 'night-move' },
  { type: 'NORMAL', name: '玻璃涨停', riskLevel: 'MEDIUM', rewardSummary: '现金 / 卡牌', greedHint: '中等收益', encounterKey: 'glass-limit' },
  { type: 'NORMAL', name: '迟到利好', riskLevel: 'LOW', rewardSummary: '现金', greedHint: '安全路过', encounterKey: 'late-news' },
  { type: 'NORMAL', name: '假突破', riskLevel: 'MEDIUM', rewardSummary: '卡牌', greedHint: '可贪一把', encounterKey: 'fake-break' },
  { type: 'NORMAL', name: '空头回声', riskLevel: 'MEDIUM', rewardSummary: '现金 / 卡牌', greedHint: '波动适中', encounterKey: 'short-echo' }
];

const ELITE_MARKETS: NodeTemplate[] = [
  { type: 'ELITE', name: '杠杆围城', riskLevel: 'HIGH', rewardSummary: '强卡牌 / 工具', greedHint: '高收益高风险', encounterKey: 'leverage-siege' },
  { type: 'ELITE', name: '跌停回廊', riskLevel: 'HIGH', rewardSummary: '现金 / 工具', greedHint: '适合赌徒', encounterKey: 'limit-down' },
  { type: 'ELITE', name: '龙虎榜幽灵', riskLevel: 'HIGH', rewardSummary: '稀有卡牌', greedHint: '爆发路线', encounterKey: 'dragon-tiger' },
  { type: 'ELITE', name: '熔断前夜', riskLevel: 'HIGH', rewardSummary: '工具 / 现金', greedHint: '极限贪婪', encounterKey: 'circuit-eve' }
];

const EVENT_NODES: NodeTemplate[] = [
  { type: 'EVENT', name: '午夜传闻', riskLevel: 'MEDIUM', rewardSummary: '事件奖励', greedHint: '看脸', eventId: 'midnight-rumor' },
  { type: 'EVENT', name: '风控电话', riskLevel: 'MEDIUM', rewardSummary: '风控 / 现金', greedHint: '可能降风险', eventId: 'risk-call' },
  { type: 'EVENT', name: '无人认领的研报', riskLevel: 'MEDIUM', rewardSummary: '浮盈 / 现金', greedHint: '信息差', eventId: 'orphan-report' },
  { type: 'EVENT', name: '黑屏三分钟', riskLevel: 'HIGH', rewardSummary: '大起大落', greedHint: '赌性节点', eventId: 'blackout' }
];

const SHOP_NODES: NodeTemplate[] = [
  { type: 'SHOP', name: '地下交易所', riskLevel: 'MEDIUM', rewardSummary: '卡牌 / 工具 / 服务', greedHint: '花现金补强' }
];

const REST_NODES: NodeTemplate[] = [
  { type: 'REST', name: '散户休息室', riskLevel: 'LOW', rewardSummary: '升级 / 降风险', greedHint: '休整再继续' }
];

const RISK_CONTROL_NODES: NodeTemplate[] = [
  { type: 'RISK_CONTROL', name: '风控室', riskLevel: 'LOW', rewardSummary: '删牌 / 降风险', greedHint: '安全路线' }
];

const BOSS_NODES: Record<number, NodeTemplate> = {
  1: { type: 'BOSS', name: '红线审计', riskLevel: 'HIGH', rewardSummary: '大量现金 / 工具', greedHint: '考验风控', bossId: 'redline-audit', encounterKey: 'boss-act1' },
  2: { type: 'BOSS', name: '黑池枯潮', riskLevel: 'HIGH', rewardSummary: '稀有工具 / 卡牌', greedHint: '考验续航', bossId: 'black-pool-ebb', encounterKey: 'boss-act2' },
  3: { type: 'BOSS', name: '最后一根阳线', riskLevel: 'HIGH', rewardSummary: '通关大奖', greedHint: '最终贪婪', bossId: 'final-bull-candle', encounterKey: 'boss-act3' }
};

function pick<T>(items: T[], index: number): T {
  return items[Math.abs(index) % items.length];
}

function seedNumber(seed: string) {
  return Array.from(seed).reduce((sum, c, index) => sum + c.charCodeAt(0) * (index + 1), 0);
}

function createNode(
  act: number,
  layer: number,
  index: number,
  layerSize: number,
  template: NodeTemplate
): RouteNode {
  return {
    id: `act${act}-L${layer}-N${index}`,
    act,
    layer,
    index,
    type: template.type,
    name: template.name,
    riskLevel: template.riskLevel,
    rewardSummary: template.rewardSummary,
    greedHint: template.greedHint,
    x: getNodeX(index, layerSize),
    y: getNodeY(act, layer),
    nextNodeIds: [],
    previousNodeIds: [],
    encounterKey: template.encounterKey,
    eventId: template.eventId,
    bossId: template.bossId
  };
}

export function buildRouteMap(seed: string): RouteNode[] {
  const offset = seedNumber(seed);
  const nodes: RouteNode[] = [];

  for (let act = 1; act <= 3; act += 1) {
    const layers: RouteNode[][] = [];
    const layerCount = ACT_LAYER_COUNTS[act];

    for (let layer = 0; layer < layerCount; layer += 1) {
      const templates = getLayerTemplates(act, layer, offset);
      const layerSize = layer === layerCount - 1 ? 1 : getLayerSize(act, layer, offset);
      const layerNodes = Array.from({ length: layerSize }, (_, index) =>
        createNode(act, layer, index, layerSize, pick(templates, offset + act * 13 + layer * 5 + index))
      );
      layers.push(layerNodes);
      nodes.push(...layerNodes);
    }

    linkActLayers(layers);
  }

  for (let act = 1; act < 3; act += 1) {
    const boss = nodes.find((node) => node.act === act && node.type === 'BOSS');
    const nextStarts = nodes.filter((node) => node.act === act + 1 && node.layer === 0);
    if (boss) {
      boss.nextNodeIds = nextStarts.map((node) => node.id);
      for (const start of nextStarts) {
        start.previousNodeIds.push(boss.id);
      }
    }
  }

  return nodes;
}

function getLayerSize(act: number, layer: number, offset: number) {
  const layerCount = ACT_LAYER_COUNTS[act];
  if (layer === 0) return 2 + ((offset + act) % 2);
  if (layer === layerCount - 2) return 2 + ((offset + act + layer) % 2);
  return 2 + ((offset + act * 3 + layer * 2) % 4);
}

function getLayerTemplates(act: number, layer: number, offset: number): NodeTemplate[] {
  const bossLayer = ACT_LAYER_COUNTS[act] - 1;

  if (layer === bossLayer) return [BOSS_NODES[act]];
  if (layer === 0) return [pick(NORMAL_MARKETS, offset + act), pick(NORMAL_MARKETS, offset + act + 1)];
  if (layer === bossLayer - 1) {
    return act === 3
      ? [...REST_NODES, ...SHOP_NODES]
      : [...REST_NODES, ...RISK_CONTROL_NODES, ...SHOP_NODES];
  }
  if (act === 1 && layer <= 2) {
    return layer === 1
      ? [pick(NORMAL_MARKETS, offset + layer), pick(EVENT_NODES, offset + layer)]
      : [pick(NORMAL_MARKETS, offset + layer), ...REST_NODES, pick(EVENT_NODES, offset + layer)];
  }
  if (act === 1) {
    return [
      pick(NORMAL_MARKETS, offset + layer),
      pick(EVENT_NODES, offset + layer),
      ...SHOP_NODES,
      ...RISK_CONTROL_NODES,
      pick(ELITE_MARKETS, offset + layer)
    ];
  }
  if (act === 2) {
    return [
      pick(NORMAL_MARKETS, offset + layer),
      pick(EVENT_NODES, offset + layer),
      pick(ELITE_MARKETS, offset + layer),
      ...SHOP_NODES,
      ...REST_NODES,
      ...RISK_CONTROL_NODES
    ];
  }
  return [
    pick(NORMAL_MARKETS, offset + layer),
    pick(EVENT_NODES, offset + layer),
    pick(ELITE_MARKETS, offset + layer),
    pick(ELITE_MARKETS, offset + layer + 1),
    ...SHOP_NODES,
    ...REST_NODES,
    ...RISK_CONTROL_NODES
  ];
}

function linkActLayers(layers: RouteNode[][]) {
  for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex += 1) {
    const currentLayer = layers[layerIndex];
    const nextLayer = layers[layerIndex + 1];

    for (const node of currentLayer) {
      addEdge(node, nextLayer[getProjectedIndex(node, currentLayer, nextLayer)]);
      const branchTarget = getBranchTarget(node, currentLayer, nextLayer);
      if (branchTarget) addEdge(node, branchTarget);
    }

    for (const target of nextLayer) {
      if (target.previousNodeIds.length > 0) continue;
      addEdge(currentLayer[getProjectedIndex(target, nextLayer, currentLayer)], target);
    }
  }
}

function getProjectedIndex(source: RouteNode, sourceLayer: RouteNode[], targetLayer: RouteNode[]) {
  if (targetLayer.length === 1) return 0;
  const ratio = sourceLayer.length === 1 ? 0.5 : source.index / Math.max(1, sourceLayer.length - 1);
  return Math.round(ratio * (targetLayer.length - 1));
}

function getBranchTarget(source: RouteNode, sourceLayer: RouteNode[], targetLayer: RouteNode[]) {
  if (targetLayer.length <= 2 || source.layer % 2 === 0 || source.index !== Math.floor(sourceLayer.length / 2)) {
    return null;
  }
  const primaryIndex = getProjectedIndex(source, sourceLayer, targetLayer);
  const branchIndex = Math.min(targetLayer.length - 1, primaryIndex + 1);
  if (branchIndex === primaryIndex) return null;
  return targetLayer[branchIndex];
}

function addEdge(source: RouteNode, target: RouteNode) {
  if (!source.nextNodeIds.includes(target.id)) source.nextNodeIds.push(target.id);
  if (!target.previousNodeIds.includes(source.id)) target.previousNodeIds.push(source.id);
}

function getNodeX(index: number, layerSize: number) {
  if (layerSize === 1) return 50;
  return Math.round((14 + index * (72 / (layerSize - 1))) * 100) / 100;
}

function getNodeY(act: number, layer: number) {
  const layerCount = ACT_LAYER_COUNTS[act];
  return Math.round((layer / Math.max(1, layerCount - 1)) * 10000) / 100;
}

export function getNodesForAct(nodes: RouteNode[], act: number) {
  return nodes.filter((node) => node.act === act);
}


