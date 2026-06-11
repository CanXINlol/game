import { describe, expect, it } from 'vitest';
import { createTestEventGameState, playCard } from '../game/playCard';
import {
  applyRunFailureConditions,
  completeCurrentRouteNode,
  createRouteMap,
  generateRouteMap,
  getAvailableNextNodes,
  getRouteNode,
  selectRouteNode,
  validateRouteMap
} from '../game/routeMap';

describe('route map run structure', () => {
  it('generates a 3 Act route map with fixed Boss layers', () => {
    const routeMap = createRouteMap('route-seed');

    expect(routeMap.acts).toHaveLength(3);
    expect(routeMap.acts[0].nodes.at(-1)?.type).toBe('BOSS');
    expect(routeMap.acts[1].nodes.at(-1)?.type).toBe('BOSS');
    expect(routeMap.acts[2].nodes.at(-1)?.type).toBe('BOSS');
    expect(routeMap.acts[0].nodes.at(-1)?.title).toBe('红线审计');
    expect(routeMap.acts[1].nodes.at(-1)?.title).toBe('黑池枯潮');
    expect(routeMap.acts[2].nodes.at(-1)?.title).toBe('最后一根阳线');
  });

  it('generates the same route map for the same seed and act', () => {
    const first = generateRouteMap('stable-route', 2);
    const second = generateRouteMap('stable-route', 2);

    expect(first).toEqual(second);
  });

  it('uses styled route node display names instead of system labels', () => {
    const routeMap = createRouteMap('route-seed');
    const names = routeMap.acts.flatMap((act) => act.nodes.map((node) => node.title));

    expect(names).toContain('红线审计');
    expect(names).toContain('黑池枯潮');
    expect(names).toContain('最后一根阳线');
    expect(names.some((name) => ['散户踩踏', '夜盘异动', '玻璃涨停', '灰色研报', '迟到利好', '空头回声', '尾盘拉升', '假突破', '暗池波纹', '旧账重估'].includes(name))).toBe(true);
    expect(names.some((name) => ['龙虎榜幽灵', '杠杆围城', '跌停回廊', '量化黑箱', '熔断前夜', '高位接盘局'].includes(name))).toBe(true);
  });

  it('offers 2 to 5 nodes per non-boss layer with 2 to 3 starts', () => {
    const routeMap = createRouteMap('route-seed');

    for (const act of routeMap.acts) {
      const layers = new Map<number, number>();

      for (const node of act.nodes) {
        layers.set(node.layer, (layers.get(node.layer) ?? 0) + 1);
      }

      for (const [layer, count] of layers) {
        const isBossLayer = layer === Math.max(...layers.keys());
        expect(count).toBeGreaterThanOrEqual(isBossLayer ? 1 : 2);
        expect(count).toBeLessThanOrEqual(isBossLayer ? 1 : 5);

        if (layer === 1) {
          expect(count).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('starts each Act with combat, allows events from layer two, and guarantees safety before Boss', () => {
    const routeMap = createRouteMap('route-seed');

    for (const act of routeMap.acts) {
      const firstLayer = act.nodes.filter((node) => node.layer === 1);
      const secondLayer = act.nodes.filter((node) => node.layer === 2);
      const actOneEarly = act.nodes.filter((node) => act.act === 1 && node.layer <= 3);
      const preBossLayer = act.nodes.filter(
        (node) => node.layer === Math.max(...act.nodes.map((item) => item.layer)) - 1
      );

      expect(firstLayer.every((node) => node.type === 'NORMAL_MARKET')).toBe(true);
      expect(secondLayer.some((node) => node.type === 'EVENT')).toBe(true);
      expect(
        actOneEarly.every(
          (node) => node.type !== 'ELITE_MARKET' && node.type !== 'SHOP'
        )
      ).toBe(true);
      expect(
        preBossLayer.some((node) =>
          ['REST', 'SHOP', 'RISK_CONTROL'].includes(node.type)
        )
      ).toBe(true);
    }
  });

  it('validates that every node is reachable and can reach Boss', () => {
    const routeMap = createRouteMap('route-seed');
    const result = validateRouteMap(routeMap);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('only allows selecting reachable nodes', () => {
    const state = createTestEventGameState({ phase: 'ROUTE_SELECT' });
    const reachableNodeId = state.routeMap.availableNodeIds[0];
    const unreachableNode = state.routeMap.acts[0].nodes.find(
      (node) => node.layer > 1 && !state.routeMap.availableNodeIds.includes(node.id)
    );

    if (!reachableNodeId || !unreachableNode) {
      throw new Error('Expected reachable and unreachable route nodes.');
    }

    const blocked = selectRouteNode(state, unreachableNode.id);
    expect(blocked.success).toBe(false);
    expect(state.phase).toBe('ROUTE_SELECT');

    const selected = selectRouteNode(state, reachableNodeId);
    expect(selected.success).toBe(true);
    expect(['PLAYER_TURN', 'SHOP', 'REST', 'ROUTE_SELECT']).toContain(state.phase);
  });

  it('uses styled Boss names inside MarketPressure encounters', () => {
    const state = createTestEventGameState({ phase: 'ROUTE_SELECT' });
    const boss = state.routeMap.acts[0].nodes.find((node) => node.type === 'BOSS');

    if (!boss) {
      throw new Error('Expected boss node.');
    }

    state.routeMap.availableNodeIds = [boss.id];
    const selected = selectRouteNode(state, boss.id);

    expect(selected.success).toBe(true);
    expect(state.marketPressure.name).toBe('红线审计');
    expect(state.marketPressure.description).toContain('高风险追涨');
  });


  it('moves availability to adjacent next-layer nodes after completing a node', () => {
    const state = createTestEventGameState({ phase: 'ROUTE_SELECT' });
    const firstNodeId = state.routeMap.availableNodeIds[0];
    const firstNode = getRouteNode(state.routeMap, firstNodeId);

    if (!firstNode) {
      throw new Error('Expected first route node.');
    }

    selectRouteNode(state, firstNode.id);
    completeCurrentRouteNode(state);

    expect(state.phase).toBe('ROUTE_SELECT');
    expect(state.routeMap.completedNodeIds).toContain(firstNode.id);
    expect(state.routeMap.availableNodeIds).toEqual(firstNode.nextNodeIds);
    expect(getAvailableNextNodes(state.routeMap).map((node) => node.id)).toEqual(
      firstNode.nextNodeIds
    );
  });

  it('event nodes open an event choice instead of auto-resolving', () => {
    const state = createTestEventGameState({ phase: 'ROUTE_SELECT' });
    const eventNode = state.routeMap.acts
      .flatMap((act) => act.nodes)
      .find((node) => node.type === 'EVENT');

    if (!eventNode) {
      throw new Error('Expected event node.');
    }

    state.routeMap.availableNodeIds = [eventNode.id];
    const result = selectRouteNode(state, eventNode.id);

    expect(result.success).toBe(true);
    expect(state.phase).toBe('DAY_END');
    expect(state.routeMap.currentNodeId).toBe(eventNode.id);
    expect(state.routeMap.completedNodeIds).not.toContain(eventNode.id);
  });

  it('sets RUN_WON when Act 3 Final Boss is defeated', () => {
    const state = createTestEventGameState({ phase: 'ROUTE_SELECT', tools: [] });
    const finalBoss = state.routeMap.acts[2].nodes.find(
      (node) => node.type === 'BOSS'
    );

    if (!finalBoss) {
      throw new Error('Expected final boss node.');
    }

    state.routeMap.currentNodeId = finalBoss.id;
    state.marketPressure = {
      ...state.marketPressure,
      hp: 10,
      maxHp: 10
    };
    state.phase = 'PLAYER_TURN';

    const nextState = playCard(state, 'test-card-tech-buy');

    expect(nextState.phase).toBe('RUN_WON');
    expect(nextState.runHistory.at(-1)).toContain('通关');
  });

  it('sets RUN_LOST when risk reaches maxRisk', () => {
    const state = createTestEventGameState({
      risk: 100,
      maxRisk: 100
    });

    expect(applyRunFailureConditions(state)).toBe(true);
    expect(state.phase).toBe('RUN_LOST');
  });

  it('does not trigger Boss insurance outside Boss encounters', () => {
    const state = createTestEventGameState({
      risk: 100,
      maxRisk: 100,
      hasBossInsurance: true,
      bossInsuranceUsed: false
    });

    expect(applyRunFailureConditions(state)).toBe(true);
    expect(state.phase).toBe('RUN_LOST');
    expect(state.hasBossInsurance).toBe(true);
  });

  it('triggers Boss insurance during Boss risk bankruptcy', () => {
    const state = createTestEventGameState({
      risk: 100,
      maxRisk: 100,
      cash: 80,
      hasBossInsurance: true,
      bossInsuranceUsed: false
    });
    const boss = state.routeMap.acts[0].nodes.find((node) => node.type === 'BOSS');

    if (!boss) throw new Error('Expected boss node.');

    state.routeMap.currentNodeId = boss.id;

    expect(applyRunFailureConditions(state)).toBe(false);
    expect(state.phase).not.toBe('RUN_LOST');
    expect(state.risk).toBe(75);
    expect(state.cash).toBe(30);
    expect(state.hasBossInsurance).toBe(false);
    expect(state.bossInsuranceUsed).toBe(true);
  });

  it('Boss insurance only triggers once', () => {
    const state = createTestEventGameState({
      risk: 100,
      maxRisk: 100,
      hasBossInsurance: true,
      bossInsuranceUsed: false
    });
    const boss = state.routeMap.acts[0].nodes.find((node) => node.type === 'BOSS');

    if (!boss) throw new Error('Expected boss node.');

    state.routeMap.currentNodeId = boss.id;
    applyRunFailureConditions(state);
    state.risk = 100;

    expect(applyRunFailureConditions(state)).toBe(true);
    expect(state.phase).toBe('RUN_LOST');
  });

  it('Boss risk bankruptcy fails normally without insurance', () => {
    const state = createTestEventGameState({
      risk: 100,
      maxRisk: 100,
      hasBossInsurance: false
    });
    const boss = state.routeMap.acts[0].nodes.find((node) => node.type === 'BOSS');

    if (!boss) throw new Error('Expected boss node.');

    state.routeMap.currentNodeId = boss.id;

    expect(applyRunFailureConditions(state)).toBe(true);
    expect(state.phase).toBe('RUN_LOST');
  });

  it('sets RUN_LOST when cash is negative and cannot be repaid', () => {
    const state = createTestEventGameState({
      cash: -50,
      lockedProfit: 0,
      combo: {
        ...createTestEventGameState().combo,
        currentChainProfit: 10
      }
    });

    expect(applyRunFailureConditions(state)).toBe(true);
    expect(state.phase).toBe('RUN_LOST');
  });
});
