export interface Rng {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(array: readonly T[]): T;
  shuffle<T>(array: readonly T[]): T[];
}

export function createRng(seed: string): Rng {
  let state = hashSeed(seed);

  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (min: number, max: number) => {
    assertIntegerRange(min, max);
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const pick = <T>(array: readonly T[]) => {
    if (array.length === 0) {
      throw new Error('Cannot pick from an empty array.');
    }

    return array[nextInt(0, array.length - 1)];
  };

  const shuffle = <T>(array: readonly T[]) => {
    const result = [...array];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = nextInt(0, index);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
  };

  return {
    next,
    nextInt,
    pick,
    shuffle
  };
}

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function assertIntegerRange(min: number, max: number) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('nextInt bounds must be integers.');
  }

  if (max < min) {
    throw new Error('nextInt max must be greater than or equal to min.');
  }
}


