import { localizeText } from '../game/localization';
import type { ShopState } from '../game/shop';

export function ShopPanel(props: {
  cash: number;
  shop: ShopState;
  onBuyItem: (itemId: string) => void;
  onRefreshShop: () => void;
  onCompleteNode: () => void;
}) {
  const refreshCost =
    25 + props.shop.refreshCount * 15;

  return (
    <section className="panel shop-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">商店</p>
          <h2>用现金换构筑</h2>
        </div>
        <span className="status-pill">现金 {props.cash.toFixed(1)}</span>
      </div>
      <ShopSection
        title="卡牌区"
        description="购买新牌，扩展构筑组件。"
        items={props.shop.sections.cards}
        cash={props.cash}
        onBuyItem={props.onBuyItem}
      />
      <ShopSection
        title="工具区"
        description="购买长期被动工具。"
        items={props.shop.sections.tools}
        cash={props.cash}
        onBuyItem={props.onBuyItem}
      />
      <ShopSection
        title="保险区"
        description="购买一次性消耗保险。"
        items={props.shop.sections.insurance}
        cash={props.cash}
        onBuyItem={props.onBuyItem}
      />
      <ShopSection
        title="服务区"
        description="删牌、升级、降风险。"
        items={props.shop.sections.services}
        cash={props.cash}
        onBuyItem={props.onBuyItem}
      />
      <div className="reward-action-row">
        <button
          className="ghost-button"
          type="button"
          disabled={props.cash < refreshCost}
          onClick={props.onRefreshShop}
        >
          {props.cash < refreshCost
            ? `现金不足：刷新需要 ${refreshCost}`
            : `刷新商店（${refreshCost} 现金）`}
        </button>
        <button className="primary-action" type="button" onClick={props.onCompleteNode}>
          离开商店
        </button>
      </div>
    </section>
  );
}

function ShopSection(props: {
  title: string;
  description: string;
  items: ShopState['items'];
  cash: number;
  onBuyItem: (itemId: string) => void;
}) {
  return (
    <section className="shop-section">
      <div className="section-heading">
        <div>
          <h3>{props.title}</h3>
          <p className="muted">{props.description}</p>
        </div>
      </div>
      <div className="shop-grid">
        {props.items.map((item) => {
          const disabled = item.sold || props.cash < item.price;
          const reason = item.sold
            ? '已售出'
            : props.cash < item.price
              ? `现金不足：需要 ${item.price}`
              : `花费 ${item.price} 现金`;

          return (
            <button
              key={item.id}
              className="shop-card"
              type="button"
              disabled={disabled}
              onClick={() => props.onBuyItem(item.id)}
            >
              <strong>{item.title}</strong>
              <span>{item.price} 现金</span>
              <p>{localizeText(item.description)}</p>
              <em>{reason}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
