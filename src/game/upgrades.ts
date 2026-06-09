import type { CardEffect, EventCard } from './effects';
import type { EventCardCost } from './types';

export interface CardUpgradePreview {
  title: string;
  description: string;
}

export function getCardUpgradePreview(card: EventCard): CardUpgradePreview {
  if (card.cardRole === 'FINISHER') {
    return {
      title: `升级 ${card.name}`,
      description: '终结牌倍率提高，combo 越高回报越大。'
    };
  }

  if (card.effects.some((effect) => effect.type === 'DRAW_CARD')) {
    return {
      title: `升级 ${card.name}`,
      description: '抽牌数量 +1，更容易延长回合。'
    };
  }

  if (card.effects.some((effect) => effect.type === 'GAIN_RISK')) {
    return {
      title: `升级 ${card.name}`,
      description: '降低主动 risk，爆发牌更安全。'
    };
  }

  if (card.cost > 0) {
    return {
      title: `升级 ${card.name}`,
      description: 'cost -1，更容易接 Turboturn。'
    };
  }

  return {
    title: `升级 ${card.name}`,
    description: '收益提高，低费启动牌更扎实。'
  };
}

export function upgradeCard(card: EventCard): EventCard {
  if (card.cardRole === 'FINISHER') {
    return {
      ...card,
      rank: Math.min(10, card.rank + 1),
      playEffect: appendUpgradeNote(card.playEffect, '升级：终结牌倍率提高。'),
      effects: card.effects.map((effect) => upgradeFinisherEffect(effect))
    };
  }

  if (card.effects.some((effect) => effect.type === 'DRAW_CARD')) {
    return {
      ...card,
      rank: Math.min(10, card.rank + 1),
      playEffect: appendUpgradeNote(card.playEffect, '升级：多抽 1 张牌。'),
      effects: card.effects.map((effect) => {
        if (effect.type === 'DRAW_CARD') {
          return { ...effect, value: effect.value + 1 };
        }

        return effect;
      })
    };
  }

  if (card.effects.some((effect) => effect.type === 'GAIN_RISK')) {
    return {
      ...card,
      rank: Math.min(10, card.rank + 1),
      playEffect: appendUpgradeNote(card.playEffect, '升级：主动 risk 降低。'),
      effects: card.effects.map((effect) => {
        if (effect.type === 'GAIN_RISK') {
          return { ...effect, value: Math.max(1, Math.floor(effect.value * 0.75)) };
        }

        return effect;
      })
    };
  }

  if (card.cost > 0) {
    return {
      ...card,
      rank: Math.min(10, card.rank + 1),
      cost: Math.max(0, card.cost - 1) as EventCardCost,
      playEffect: appendUpgradeNote(card.playEffect, '升级：cost -1。')
    };
  }

  return {
    ...card,
    rank: Math.min(10, card.rank + 1),
    playEffect: appendUpgradeNote(card.playEffect, '升级：收益提高。'),
    effects: card.effects.map((effect) => {
      if (effect.type === 'GAIN_PROFIT') {
        return { ...effect, value: roundToTwoDecimals(effect.value * 1.25) };
      }

      return effect;
    })
  };
}

function upgradeFinisherEffect(effect: CardEffect): CardEffect {
  if (effect.type === 'GAIN_PROFIT_FROM_COMBO') {
    return {
      ...effect,
      profitPerCombo: roundToTwoDecimals(effect.profitPerCombo * 1.3)
    };
  }

  return effect;
}

function appendUpgradeNote(playEffect: string | undefined, note: string) {
  const base = playEffect ?? '升级牌。';
  const lines = base.split('\n');
  return `${lines[0]}\n${note}`;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
