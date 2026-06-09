import { MARKET_NEWS } from '../data/marketEvents';
import { createRng } from './rng';
import type { MarketMood, MarketState, Sector, StockCard } from './types';

const SECTORS: Sector[] = ['TECH', 'CONSUMER', 'MEDICAL', 'ENERGY', 'FINANCE'];
const MOODS: MarketMood[] = ['BULL', 'NEUTRAL', 'BEAR'];

const MOOD_RETURN_MULTIPLIER: Record<MarketMood, number> = {
  BULL: 1.18,
  NEUTRAL: 1,
  BEAR: 0.82
};

const MOOD_RISK_MODIFIER: Record<MarketMood, number> = {
  BULL: 0.88,
  NEUTRAL: 1,
  BEAR: 1.22
};

export function generateMarketForDay(day: number, seed: string): MarketState {
  if (!Number.isInteger(day) || day < 1) {
    throw new Error('generateMarketForDay day must be a positive integer.');
  }

  const rng = createRng(`${seed}:market:${day}`);
  const hotSector = rng.pick(SECTORS);
  const weakSector = rng.pick(SECTORS.filter((sector) => sector !== hotSector));
  const mood = rng.pick(MOODS);
  const volatility = rng.nextInt(80, 140) / 100;
  const news = rng.pick(MARKET_NEWS[mood]);

  return {
    day,
    mood,
    hotSector,
    weakSector,
    volatility,
    news
  };
}

export function getMarketMultiplier(
  cards: readonly StockCard[],
  market: MarketState
) {
  const sectorBias = getSectorBias(cards, market);

  return roundToTwoDecimals(MOOD_RETURN_MULTIPLIER[market.mood] + sectorBias);
}

export function getMarketRiskModifier(
  cards: readonly StockCard[],
  market: MarketState
) {
  const hotSectorCount = countSector(cards, market.hotSector);
  const weakSectorCount = countSector(cards, market.weakSector);
  const sectorRiskOffset = weakSectorCount * 0.03 - hotSectorCount * 0.02;
  const volatilityRisk = (market.volatility - 1) * 0.4;

  return roundToTwoDecimals(
    Math.max(
      0.4,
      MOOD_RISK_MODIFIER[market.mood] + volatilityRisk + sectorRiskOffset
    )
  );
}

function getSectorBias(cards: readonly StockCard[], market: MarketState) {
  const hotSectorCount = countSector(cards, market.hotSector);
  const weakSectorCount = countSector(cards, market.weakSector);

  return hotSectorCount * 0.08 - weakSectorCount * 0.08;
}

function countSector(cards: readonly StockCard[], sector: Sector) {
  return cards.filter((card) => card.sector === sector).length;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
