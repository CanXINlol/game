import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DeckViewer } from '../components/DeckViewer';
import { HandArea } from '../components/HandArea';
import { ShopPanel } from '../components/ShopPanel';
import { ToolViewer } from '../components/ToolViewer';
import { createShopState } from '../game/shop';
import { createFormalEventGameState, createTestEventGameState } from '../game/playCard';

describe('combat UI hierarchy', () => {
  it('DeckViewer can open and close without occupying the combat layout', () => {
    const state = createFormalEventGameState();
    const closed = renderToStaticMarkup(
      createElement(DeckViewer, { open: false, state, onClose: () => undefined })
    );
    const open = renderToStaticMarkup(
      createElement(DeckViewer, { open: true, state, onClose: () => undefined })
    );

    expect(closed).toBe('');
    expect(open).toContain('牌组查看器');
    expect(open).toContain('完整牌组');
    expect(open).toContain('抽牌堆');
    expect(open).toContain('已移除牌');
  });

  it('ToolViewer can open and close', () => {
    const state = createFormalEventGameState();
    const closed = renderToStaticMarkup(
      createElement(ToolViewer, {
        open: false,
        tools: state.tools,
        onClose: () => undefined
      })
    );
    const open = renderToStaticMarkup(
      createElement(ToolViewer, {
        open: true,
        tools: state.tools,
        onClose: () => undefined
      })
    );

    expect(closed).toBe('');
    expect(open).toContain('工具查看器');
  });

  it('hand cards are direct clickable cards without repeated play buttons or enum text', () => {
    const state = createTestEventGameState();
    const rendered = renderToStaticMarkup(
      createElement(HandArea, {
        hand: state.hand,
        state,
        canPlay: true,
        onPlayCard: () => undefined
      })
    );

    expect(rendered).toContain('当前手牌');
    expect(rendered).toContain('可点击');
    expect(rendered).not.toContain('ghost-button');
    expect(rendered).not.toContain('>打出<');
    expect(rendered).not.toContain('STARTER');
    expect(rendered).not.toContain('TECH');
  });

  it('shop cards expose readable disabled copy for unaffordable items', () => {
    const state = createFormalEventGameState({ cash: 0 });
    state.shop = createShopState(state);
    const rendered = renderToStaticMarkup(
      createElement(ShopPanel, {
        cash: state.cash,
        shop: state.shop,
        onBuyItem: () => undefined,
        onRefreshShop: () => undefined,
        onCompleteNode: () => undefined
      })
    );

    expect(rendered).toContain('现金不足');
    expect(rendered).toContain('shop-card');
    expect(rendered).toContain('disabled');
    expect(rendered).toContain('现金');
  });
});
