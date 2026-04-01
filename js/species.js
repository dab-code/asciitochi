// Species definitions and random hatching logic

export const SPECIES = {
  neko: {
    name: 'Neko',
    theme: 'Cat',
    rarity: 'common',
    weight: 35,
  },
  piku: {
    name: 'Piku',
    theme: 'Bird',
    rarity: 'common',
    weight: 35,
  },
  robo: {
    name: 'Robo',
    theme: 'Robot',
    rarity: 'uncommon',
    weight: 12,
  },
  blob: {
    name: 'Blob',
    theme: 'Slime',
    rarity: 'uncommon',
    weight: 12,
  },
  drak: {
    name: 'Drak',
    theme: 'Dragon',
    rarity: 'rare',
    weight: 3,
  },
  octo: {
    name: 'Octo',
    theme: 'Octopus',
    rarity: 'rare',
    weight: 3,
  },
};

export function rollSpecies() {
  const total = Object.values(SPECIES).reduce((s, sp) => s + sp.weight, 0);
  let roll = Math.random() * total;
  for (const [id, sp] of Object.entries(SPECIES)) {
    roll -= sp.weight;
    if (roll <= 0) return id;
  }
  return 'neko'; // fallback
}

export function getSpecies(id) {
  return SPECIES[id];
}

export function getRarityLabel(rarity) {
  return { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' }[rarity] || rarity;
}
