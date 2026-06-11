import { describe, expect, it } from 'vitest';
import { NOISE_GLITCH_CARD } from '../data/stockCards';
import { STOCK_CARDS } from '../data/stockCards';
import { TOOLS } from '../data/tools';
import { INSURANCES } from '../data/insurance';
import { TRADERS } from '../data/traders';
import { ROUTE_EVENTS } from '../data/events';
import { createBossEncounter } from '../game/bosses';
import { createNewRun, applyGreedChoice, endTurn, finishEncounterReward, refreshTradeChainPreview, startEncounter } from '../game/encounters';
import { completeRouteNode, getRouteNode, selectRouteNode } from '../game/routeMap';
import { applyRiskControlChoice } from '../game/riskControl';
import { getRemoveCardPrice } from '../game/economy';
import { buyShopItem, createShop } from '../game/shop';
import { getTelemetrySummary } from '../game/telemetry';
import { RUN_STATUS_LABELS } from '../game/localization';
import { executeTradeChain, resolveTradeChain } from '../game/playCard';
import type { Run } from '../game/types';

describe('content expansion', () => {
  it('has 30 trade cards, 20 tools, 8 insurance, 5 traders, 12 events', () => {
    expect(STOCK_CARDS).toHaveLength(30);
    expect(TOOLS).toHaveLength(20);
    expect(INSURANCES).toHaveLength(8);
    expect(TRADERS).toHaveLength(5);
    expect(ROUTE_EVENTS).toHaveLength(12);
  });
});

describe('route map', () => {
  it('starts on route select and can enter first encounter', () => {
    const run = createNewRun();
    expect(run.status).toBe('ROUTE_SELECT');
    expect(run.currentEncounter).toBeNull();

    const firstNode = run.routeMap.availableNodeIds[0];
    const next = selectRouteNode(run, firstNode);
    expect(next.status).toBe('PLAYER_TURN');
    expect(next.currentEncounter).not.toBeNull();
    expect(next.hand.length).toBe(5);
  });

  it('shows node risk and reward info', () => {
    const run = createNewRun();
    const node = run.routeMap.nodes.find((n) => n.id === run.routeMap.availableNodeIds[0]);
    expect(node?.riskLevel).toBeDefined();
    expect(node?.rewardSummary).toBeTruthy();
    expect(node?.greedHint).toBeTruthy();
  });

  it('builds current act maps with starts, boss, and reachable upward paths', () => {
    const run = createNewRun('old-hand', 'route-structure');

    for (const act of [1, 2, 3]) {
      const nodes = run.routeMap.nodes.filter((node) => node.act === act);
      const layers = new Map<number, typeof nodes>();
      for (const node of nodes) {
        layers.set(node.layer, [...(layers.get(node.layer) ?? []), node]);
      }
      const maxLayer = Math.max(...layers.keys());
      const starts = layers.get(0) ?? [];
      const bosses = layers.get(maxLayer) ?? [];

      expect(starts.length).toBeGreaterThanOrEqual(2);
      expect(starts.length).toBeLessThanOrEqual(3);
      expect(bosses).toHaveLength(1);
      expect(bosses[0].type).toBe('BOSS');
      expect(layers.get(maxLayer - 1)?.some((node) => ['REST', 'SHOP', 'RISK_CONTROL'].includes(node.type))).toBe(true);

      const reachable = new Set<string>();
      const queue = starts.map((node) => node.id);
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (reachable.has(id)) continue;
        reachable.add(id);
        const node = nodes.find((item) => item.id === id);
        if (node) queue.push(...node.nextNodeIds.filter((nextId) => nodes.some((item) => item.id === nextId)));
      }

      expect(nodes.every((node) => reachable.has(node.id))).toBe(true);
      expect(reachable.has(bosses[0].id)).toBe(true);
    }
  });

  it('only opens connected upper nodes after completing a route node', () => {
    const run = createNewRun();
    const firstNode = getRouteNode(run.routeMap, run.routeMap.availableNodeIds[0]);
    expect(firstNode).toBeDefined();

    const selected = selectRouteNode(run, firstNode!.id);
    const completed = completeRouteNode(selected);

    expect(completed.status).toBe('ROUTE_SELECT');
    expect(completed.routeMap.completedNodeIds).toContain(firstNode!.id);
    expect(completed.routeMap.availableNodeIds).toEqual(firstNode!.nextNodeIds);
  });

  it('ignores unreachable route node choices', () => {
    const run = createNewRun();
    const locked = run.routeMap.nodes.find((node) => node.layer > 0 && !run.routeMap.availableNodeIds.includes(node.id));
    expect(locked).toBeDefined();

    const next = selectRouteNode(run, locked!.id);
    expect(next).toBe(run);
    expect(next.status).toBe('ROUTE_SELECT');
  });
});

describe('shop economy', () => {
  it('creates four shop sections and charges for purchases', () => {
    const run = createNewRun();
    const shopRun = selectRouteNode(run, run.routeMap.nodes.find((n) => n.type === 'SHOP')?.id ?? run.routeMap.availableNodeIds[0]);
    if (shopRun.status !== 'SHOP') return;

    const item = shopRun.shop.items.find((i) => i.section === 'cards' && !i.sold);
    if (!item) return;

    const cashBefore = shopRun.cash;
    const bought = buyShopItem(shopRun, item.id);
    expect(bought.cash).toBeLessThan(cashBefore);
  });

  it('generates shop with cards tools insurance services', () => {
    const shop = createShop('test');
    expect(shop.items.some((i) => i.section === 'cards')).toBe(true);
    expect(shop.items.some((i) => i.section === 'tools')).toBe(true);
    expect(shop.items.some((i) => i.section === 'insurance')).toBe(true);
    expect(shop.items.some((i) => i.section === 'services')).toBe(true);
  });

  it('does not allow purchases without enough cash', () => {
    const run = { ...createNewRun(), cash: 0, shop: createShop('poor-shop') };
    const item = run.shop.items.find((entry) => entry.price > 0)!;
    const next = buyShopItem(run, item.id);

    expect(next.cash).toBe(0);
    expect(next.shop.items.find((entry) => entry.id === item.id)?.sold).toBe(false);
  });
});

describe('trade chain core', () => {
  it('limits trade chains to at most 3 cards', () => {
    const run = combatRun();
    expect(() =>
      resolveTradeChain({
        run,
        encounter: run.currentEncounter!,
        cardIds: ['open-position', 'chase-limit', 'hedge', 'late-ignite']
      })
    ).toThrow('more than 3 cards');
  });

  it('does not execute when AP is insufficient', () => {
    const run = withChain({ ...combatRun(), nextCardCostReduction: 0 }, ['redline-leverage', 'late-ignite']);
    const nextRun = executeTradeChain(run);
    expect(nextRun.turnSummary[0]).toContain('AP 不足');
  });

  it('keeps preview and actual chain settlement consistent', () => {
    const run = withChain(combatRun(), ['margin-add', 'open-position', 'late-ignite']);
    const preview = run.tradeChain.previewResult!;
    const nextRun = executeTradeChain(run);

    expect(nextRun.lastChainResult?.floatingProfitDelta).toBe(preview.floatingProfitDelta);
    expect(nextRun.lastChainResult?.riskDelta).toBe(preview.riskDelta);
    expect(nextRun.currentEncounter?.floatingProfit).toBe(preview.floatingProfitAfter);
  });

  it('margin add amplifies later cards', () => {
    const run = combatRun();
    const result = resolveTradeChain({
      run,
      encounter: run.currentEncounter!,
      cardIds: ['margin-add', 'open-position']
    });
    expect(result.steps[1].floatingProfitGained).toBe(120);
    expect(result.riskDelta).toBe(20);
  });

  it('redline leverage amplifies later cards and adds risk', () => {
    const run = combatRun();
    const result = resolveTradeChain({
      run,
      encounter: run.currentEncounter!,
      cardIds: ['redline-leverage', 'open-position']
    });
    expect(result.steps[1].floatingProfitGained).toBe(160);
    expect(result.riskDelta).toBe(30);
  });

  it('partial profit locks current floating profit', () => {
    const run = combatRun();
    const encounter = { ...run.currentEncounter!, floatingProfit: 200, risk: 20 };
    const result = resolveTradeChain({
      run,
      encounter,
      cardIds: ['partial-profit']
    });
    expect(result.lockedProfitDelta).toBe(70);
    expect(result.riskDelta).toBe(-8);
  });

  it('enters greed choice after reaching target profit', () => {
    const baseRun = combatRun();
    const run = withChain(
      { ...baseRun, currentEncounter: { ...baseRun.currentEncounter!, floatingProfit: 200 } },
      ['margin-add', 'quant-turnover', 'late-ignite']
    );
    const nextRun = executeTradeChain(run);
    expect(nextRun.currentEncounter!.floatingProfit).toBeGreaterThanOrEqual(nextRun.currentEncounter!.targetProfit);
    expect(nextRun.status).toBe('GREED_CHOICE');
  });

  it('enters run lost when risk reaches 100', () => {
    const run = withChain(
      { ...combatRun(), currentEncounter: { ...combatRun().currentEncounter!, risk: 90 } },
      ['redline-leverage']
    );
    const nextRun = executeTradeChain(run);
    expect(nextRun.status).toBe('RUN_LOST');
    expect(nextRun.currentEncounter!.floatingProfit).toBe(0);
  });
});

describe('tools and insurance', () => {
  it('profit-mirror boosts first profit card in chain', () => {
    const run = withTools(combatRun(), ['profit-mirror']);
    const result = resolveTradeChain({
      run,
      encounter: run.currentEncounter!,
      cardIds: ['open-position', 'hedge']
    });
    expect(result.steps[0].floatingProfitGained).toBe(100);
  });

  it('margin-delay prevents first bankruptcy', () => {
    const base = combatRun();
    const run = {
      ...base,
      insurances: [{ insuranceId: 'margin-delay', encounterScoped: true, used: false }],
      currentEncounter: { ...base.currentEncounter!, risk: 95 }
    };
    const next = executeTradeChain(
      withChain(run, ['redline-leverage'])
    );
    expect(next.status).toBe('PLAYER_TURN');
    expect(next.currentEncounter!.risk).toBe(90);
  });

  it('risk-hedge lowers risk gain on encounter', () => {
    const run = {
      ...combatRun(),
      insurances: [{ insuranceId: 'risk-hedge', encounterScoped: true, used: false }]
    };
    const encounter = {
      ...run.currentEncounter!,
      riskGainMultiplier: 1
    };
    const result = resolveTradeChain({
      run,
      encounter: { ...encounter, riskGainMultiplier: 0.7 },
      cardIds: ['open-position']
    });
    expect(result.riskDelta).toBe(4);
  });

  it('trend-lens discounts shop service prices', () => {
    const run = { ...createNewRun(), tools: ['trend-lens'], shop: createShop('discount-test') };
    const expected = getRemoveCardPrice(run);
    const discounted = buyShopItem(run, 'service-remove');
    expect(discounted.cash).toBe(run.cash - expected);
    expect(expected).toBe(Math.floor(80 * 0.85));
  });
});

describe('boss encounters', () => {
  it('creates boss with phases and target profit', () => {
    const encounter = createBossEncounter('redline-audit', 1);
    expect(encounter.boss?.name).toBe('红线审计');
    expect(encounter.targetProfit).toBe(600);
    expect(encounter.boss?.phases).toHaveLength(3);
  });

  it('injects temporary noise on black-pool boss turn start', () => {
    const encounter = createBossEncounter('black-pool-ebb', 1);
    let run = startEncounter(createNewRun(), encounter);
    run = endTurn(run);
    expect(run.hand).toContain('noise-glitch');
  });

  it('noise-filter blocks boss noise injection', () => {
    const encounter = createBossEncounter('black-pool-ebb', 1);
    let run = startEncounter({ ...createNewRun(), tools: ['noise-filter'] }, encounter);
    run = endTurn(run);
    expect(run.hand.filter((id) => id === 'noise-glitch')).toHaveLength(0);
  });

  it('temporary noise does not cycle back into discard piles', () => {
    const encounter = createBossEncounter('black-pool-ebb', 1);
    let run = startEncounter(createNewRun(), encounter);
    run = { ...run, hand: [NOISE_GLITCH_CARD.id], drawPile: [], discardPile: ['open-position'] };
    const next = endTurn(run);

    expect(next.discardPile).not.toContain(NOISE_GLITCH_CARD.id);
    expect(next.deck).not.toContain(NOISE_GLITCH_CARD.id);
  });

  it('reshuffles discard pile when draw pile is empty', () => {
    const run = withChain({
      ...combatRun(),
      hand: ['quant-turnover'],
      drawPile: [],
      discardPile: ['open-position']
    }, ['quant-turnover']);
    const next = executeTradeChain(run);

    expect(next.hand).toContain('open-position');
  });
});

describe('risk control room', () => {
  it('risk manager gets insurance discount in risk control', () => {
    const run = {
      ...createNewRun('risk-manager'),
      status: 'RISK_CONTROL' as const,
      cash: 200
    };
    const next = applyRiskControlChoice(run, 'BUY_INSURANCE', undefined, 'risk-hedge');
    expect(next.cash).toBe(200 - Math.floor(80 * 0.75));
    expect(next.insurances.some((i) => i.insuranceId === 'risk-hedge')).toBe(true);
  });
});

describe('greed choices and telemetry', () => {
  it('take profit converts floating profit into cash and enters reward', () => {
    const run = greedRun({ floatingProfit: 600, risk: 40 });
    const nextRun = applyGreedChoice(run, 'TAKE_PROFIT');
    expect(nextRun.cash).toBeGreaterThan(run.cash);
    expect(nextRun.status).toBe('REWARD');
  });

  it('hold raises reward multiplier and risk', () => {
    const run = greedRun({ floatingProfit: 600, risk: 40 });
    const nextRun = applyGreedChoice(run, 'HOLD');
    expect(nextRun.currentEncounter!.rewardMultiplier).toBeGreaterThan(1);
    expect(nextRun.currentEncounter!.risk).toBe(55);
  });

  it('leverage sets next turn profit x2', () => {
    const run = greedRun({ floatingProfit: 600, risk: 40 });
    const nextRun = applyGreedChoice(run, 'LEVERAGE');
    expect(nextRun.currentEncounter!.nextTurnProfitMultiplier).toBe(2);
  });

  it('leverage multiplier affects the next turn profit result', () => {
    const run = greedRun({ floatingProfit: 600, risk: 40 });
    const leveraged = applyGreedChoice(run, 'LEVERAGE');
    const result = resolveTradeChain({
      run: leveraged,
      encounter: leveraged.currentEncounter!,
      cardIds: ['open-position']
    });

    expect(result.steps[0].floatingProfitGained).toBe(160);
  });

  it('bankruptcy loses floating profit', () => {
    const run = greedRun({ floatingProfit: 800, risk: 85 });
    const nextRun = applyGreedChoice(run, 'LEVERAGE');
    expect(nextRun.status).toBe('RUN_LOST');
    expect(nextRun.currentEncounter!.floatingProfit).toBe(0);
  });

  it('records telemetry summaries', () => {
    const run = greedRun({ floatingProfit: 600, risk: 40 });
    const nextRun = applyGreedChoice(run, 'TAKE_PROFIT');
    const summary = getTelemetrySummary(nextRun);
    expect(summary.takeProfitCount).toBe(1);
    expect(summary.traderId).toBe('quant-newbie');
  });

  it('does not grant encounter reward more than once', () => {
    const run = greedRun({ floatingProfit: 600, risk: 40 });
    const rewarded = applyGreedChoice(run, 'TAKE_PROFIT');
    const cashAfterReward = rewarded.cash;
    const repeated = finishEncounterReward(rewarded);

    expect(repeated.cash).toBe(cashAfterReward);
    expect(repeated.pendingRewardCash).toBe(rewarded.pendingRewardCash);
  });
});

describe('UI readability', () => {
  it('localizes run status labels instead of showing internal enum values', () => {
    const labels = Object.values(RUN_STATUS_LABELS);

    expect(labels).toContain('玩家回合');
    expect(labels).toContain('贪婪选择');
    expect(labels).not.toContain('PLAYER_TURN');
    expect(labels).not.toContain('GREED_CHOICE');
  });
});

function combatRun(traderId = 'quant-newbie'): Run {
  const run = createNewRun(traderId);
  const nodeId = run.routeMap.availableNodeIds[0];
  return selectRouteNode(run, nodeId);
}

function withChain(run: Run, selectedCardIds: string[]) {
  return { ...refreshTradeChainPreview(run, selectedCardIds), hand: selectedCardIds };
}

function withTools(run: Run, toolIds: string[]) {
  return { ...run, tools: [...run.tools, ...toolIds] };
}

function greedRun(options: { floatingProfit: number; risk: number }) {
  const run = combatRun();
  return {
    ...run,
    status: 'GREED_CHOICE' as const,
    currentEncounter: {
      ...run.currentEncounter!,
      status: 'GREED_CHOICE' as const,
      floatingProfit: options.floatingProfit,
      risk: options.risk
    }
  };
}


