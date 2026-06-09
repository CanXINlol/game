import type { CardEffect, EventCard } from '../game/effects';
import {
  localizeCardRole,
  localizeCardType,
  localizeSector,
  localizeText
} from '../game/localization';
import type { EventGameState } from '../game/playCard';

export function HandArea(props: {
  hand: EventCard[];
  state: EventGameState;
  canPlay: boolean;
  onPlayCard: (cardId: string) => void;
}) {
  return (
    <section className="panel hand-area combat-hand-area">
      <div className="section-heading">
        <div>
          <p className="section-label">手牌</p>
          <h2>当前手牌</h2>
        </div>
        <span className="status-pill">{props.hand.length} 张</span>
      </div>
      <div className="event-card-grid combat-card-grid">
        {props.hand.map((card) => {
          const disabledReason = getDisabledReason(card, props.state, props.canPlay);

          return (
            <button
              key={card.id}
              data-card-id={card.id}
              className={`event-card combat-card ${disabledReason ? 'disabled-card' : ''}`}
              type="button"
              disabled={Boolean(disabledReason)}
              title={disabledReason ?? card.name}
              onClick={() => props.onPlayCard(card.id)}
            >
              <span className="card-topline">
                <strong>{card.name}</strong>
                <em>费用 {card.cost}</em>
              </span>
              <span>
                {localizeCardRole(card.cardRole)} ·{' '}
                {card.cardType ? localizeCardType(card.cardType) : '事件'} ·{' '}
                {localizeSector(card.sector)}
              </span>
              <small>评级 {card.rank}</small>
              <p>{getCardLine(card, 0)}</p>
              <p className="card-hint">{getCardLine(card, 1)}</p>
              <em className={disabledReason ? 'play-reason blocked' : 'play-reason'}>
                {disabledReason ?? '可点击'}
              </em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function getDisabledReason(card: EventCard, state: EventGameState, canPlay: boolean) {
  if (!canPlay || state.phase !== 'PLAYER_TURN') {
    return '阶段不可用';
  }

  if (card.cost > state.actionPoints) {
    return 'AP 不足';
  }

  if (!areCardConditionsMet(card.effects, state)) {
    return '条件不满足';
  }

  return null;
}

function areCardConditionsMet(effects: CardEffect[], state: EventGameState) {
  return effects.every((effect) => {
    if (effect.type === 'TRIGGER_LIMIT_UP_IF_PROFIT') {
      return state.combo.currentChainProfit > 0;
    }

    if (effect.type === 'COPY_PREVIOUS_CARD') {
      return Boolean(state.lastPlayedCard);
    }

    if (effect.type === 'REBOUND_IF_EVENT') {
      return effect.eventTypes.some((eventType) => state.resolvedEventTypes.includes(eventType));
    }

    if (effect.type === 'DAMAGE_PRESSURE_IF_HP_BELOW') {
      return state.marketPressure.hp / state.marketPressure.maxHp < effect.thresholdRatio;
    }

    if (effect.type === 'CASH_OUT') {
      return state.combo.currentChainProfit > 0 || effect.riskReduction > 0;
    }

    return true;
  });
}

function getCardLine(card: EventCard, index: number) {
  return localizeText(card.playEffect ?? describeCard(card.id))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[index] ?? '';
}

function describeCard(cardId: string) {
  const descriptions: Record<string, string> = {
    'test-card-tech-buy': '获得 20 收益，并触发科技板块。',
    'test-card-limit-chase': '已有收益时触发涨停，获得收益并增加连击。',
    'test-card-margin-add': '获得 40 收益，但增加 20 风险。',
    'test-card-quant-copy': '复制上一张牌的基础效果。',
    'test-card-hot-rotation': '触发当前热门板块，并抽 1 张牌。',
    'test-card-cash-insurance': '锁定部分浮盈，风险 -10，触发止盈。',
    'test-card-hot-stock-ignite': '触发涨停，连击 +2，风险 +15。',
    'test-card-dip-rebound': '发生过风险或亏损事件后，获得收益并风险 -5。',
    'test-card-short-cover': '市场压力低于 50% 时，造成额外压力伤害。',
    'test-card-closeout': '根据连击数获得爆发收益，并结束交易。'
  };

  return descriptions[cardId] ?? '测试牌。';
}
