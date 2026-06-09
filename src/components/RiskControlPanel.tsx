import { useMemo, useState } from 'react';
import { getAllDeckCards, isCardUpgraded } from '../game/economy';
import {
  localizeCardRole,
  localizeSector,
  localizeText
} from '../game/localization';
import type { EventGameState } from '../game/playCard';
import type { RiskControlAction, RiskControlOption } from '../game/shop';

export function RiskControlPanel(props: {
  state: EventGameState;
  options: RiskControlOption[];
  onApply: (action: RiskControlAction, cardId?: string) => void;
  onCompleteNode: () => void;
}) {
  const cards = useMemo(() => getAllDeckCards(props.state), [props.state]);
  const [selectedAction, setSelectedAction] = useState<RiskControlAction>('REMOVE_CARD');
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id ?? '');
  const selectedOption = props.options.find((option) => option.id === selectedAction);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0];
  const needsCard =
    selectedAction === 'REMOVE_CARD' || selectedAction === 'UPGRADE_CARD';
  const upgraded = selectedCard ? isCardUpgraded(selectedCard) : false;
  const selectedPrice = selectedOption?.price ?? 0;
  const cannotUpgrade = selectedAction === 'UPGRADE_CARD' && upgraded;
  const disabled =
    props.state.nodeActionUsed ||
    props.state.cash < selectedPrice ||
    (needsCard && !selectedCard) ||
    cannotUpgrade;
  const disabledReason =
    props.state.nodeActionUsed
      ? '本节点已经完成过一次操作'
      : props.state.cash < selectedPrice
      ? `现金不足：需要 ${selectedPrice}`
      : needsCard && !selectedCard
        ? '没有可操作的牌'
        : cannotUpgrade
          ? '已升级过，不能重复升级'
          : selectedPrice > 0
            ? `确认花费 ${selectedPrice} 现金`
            : '确认操作';

  return (
    <section className="panel risk-control-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">风控室</p>
          <h2>删牌、升级、降低风险</h2>
        </div>
        <span className="status-pill">
          现金 {props.state.cash.toFixed(1)} · 风险 {props.state.risk.toFixed(1)}
        </span>
      </div>
      <div className="risk-control-layout">
        <div className="risk-control-column">
          <h3>操作类型</h3>
        {props.options.map((option) => {
          return (
            <button
              key={option.id}
              className={`risk-control-option ${selectedAction === option.id ? 'selected' : ''}`}
              type="button"
              onClick={() => setSelectedAction(option.id)}
            >
              <strong>{option.title}</strong>
              <span>{option.price} 现金</span>
              <p>{option.description}</p>
            </button>
          );
        })}
        </div>
        <div className="risk-control-column">
          <h3>选择卡牌</h3>
          {needsCard ? (
            <div className="risk-card-list">
              {cards.map((card) => {
                const cardUpgraded = isCardUpgraded(card);
                const disabledCard = selectedAction === 'UPGRADE_CARD' && cardUpgraded;

                return (
                  <button
                    key={card.id}
                    className={`risk-card-option ${selectedCard?.id === card.id ? 'selected' : ''}`}
                    type="button"
                    disabled={disabledCard}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <strong>{card.name}</strong>
                    <span>
                      {localizeSector(card.sector)} · {localizeCardRole(card.cardRole)}
                      {card.archetype ? ` · ${card.archetype}` : ''}
                    </span>
                    <em>{cardUpgraded ? '已升级：不能重复升级' : '可选择'}</em>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="muted">该操作不需要选择卡牌。</p>
          )}
        </div>
        <div className="risk-control-column">
          <h3>确认</h3>
          {selectedOption ? (
            <div className="risk-control-detail">
              <strong>{selectedOption.title}</strong>
              <p>{selectedOption.description}</p>
              {selectedCard && needsCard ? (
                <>
                  <span>
                    目标：{selectedCard.name} · 费用 {selectedCard.cost} · 评级{' '}
                    {selectedCard.rank}
                  </span>
                  <p>{getCardDescriptionLine(selectedCard.playEffect, 0)}</p>
                  <p>{getCardDescriptionLine(selectedCard.playEffect, 1)}</p>
                </>
              ) : null}
              <em>{disabledReason}</em>
              <button
                className="primary-action"
                type="button"
                disabled={disabled}
                onClick={() =>
                  props.onApply(
                    selectedAction,
                    needsCard ? selectedCard?.id : undefined
                  )
                }
              >
                确认{selectedOption.title}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="reward-action-row">
        <button className="primary-action" type="button" onClick={props.onCompleteNode}>
          离开风控室
        </button>
      </div>
    </section>
  );
}

function getCardDescriptionLine(playEffect: string | undefined, index: number) {
  return localizeText(playEffect ?? '无牌面说明。')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[index] ?? '';
}
