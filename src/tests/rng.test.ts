import { describe, expect, it } from 'vitest';
import { createRng } from '../game/rng';

describe('createRng', () => {
  it('produces the same shuffle result for the same seed', () => {
    const cards = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'];

    const firstShuffle = createRng('limit-up-before').shuffle(cards);
    const secondShuffle = createRng('limit-up-before').shuffle(cards);

    expect(firstShuffle).toEqual(secondShuffle);
  });
});
