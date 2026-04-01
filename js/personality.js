// Personality system — each pet gets random traits at birth

// Temperaments affect behavior and stat decay
export const TEMPERAMENTS = {
  energetic:  { label: 'Energetic',  energyDecay: 1.3, happinessDecay: 0.8 },
  lazy:       { label: 'Lazy',       energyDecay: 0.7, happinessDecay: 1.0 },
  cheerful:   { label: 'Cheerful',   energyDecay: 1.0, happinessDecay: 0.7 },
  grumpy:     { label: 'Grumpy',     energyDecay: 1.0, happinessDecay: 1.4 },
  chill:      { label: 'Chill',      energyDecay: 0.9, happinessDecay: 0.9 },
};

// Appetites affect hunger decay
export const APPETITES = {
  glutton:    { label: 'Big Eater',    hungerDecay: 1.4 },
  picky:      { label: 'Picky Eater',  hungerDecay: 0.8 },
  normal:     { label: 'Normal',       hungerDecay: 1.0 },
};

// Quirks are flavor — they add unique idle messages
export const QUIRKS = {
  mischievous: {
    label: 'Mischievous',
    messages: [
      '{n} is plotting something...',
      '{n} hides behind a corner, giggling.',
      '{n} just knocked something over.',
      '{n} gives you an innocent look. Too innocent.',
      '{n} is rearranging things when you\'re not looking.',
    ],
  },
  cuddly: {
    label: 'Cuddly',
    messages: [
      '{n} nuzzles up against you.',
      '{n} wants to be held.',
      '{n} purrs softly near you.',
      '{n} leans into your hand.',
      '{n} follows you around closely.',
    ],
  },
  curious: {
    label: 'Curious',
    messages: [
      '{n} pokes at something on the ground.',
      '{n} stares intensely at a shadow.',
      '{n} is investigating a strange noise.',
      '{n} sniffs everything in sight.',
      '{n} discovered a new corner of the room!',
    ],
  },
  dramatic: {
    label: 'Dramatic',
    messages: [
      '{n} flops over with a big sigh.',
      '{n} stares out the window longingly.',
      '{n} acts like they haven\'t eaten in days.',
      '{n} does everything with extra flair.',
      '{n} gasps at absolutely nothing.',
    ],
  },
  shy: {
    label: 'Shy',
    messages: [
      '{n} peeks at you from behind something.',
      '{n} hides when they see you looking.',
      '{n} blushes and looks away.',
      '{n} quietly watches from a distance.',
      '{n} slowly warms up to your presence.',
    ],
  },
  goofy: {
    label: 'Goofy',
    messages: [
      '{n} trips over their own feet.',
      '{n} makes a silly face.',
      '{n} spins around and gets dizzy.',
      '{n} walks into a wall. On purpose?',
      '{n} does a weird little wiggle.',
    ],
  },
  proud: {
    label: 'Proud',
    messages: [
      '{n} strikes a pose.',
      '{n} admires their reflection.',
      '{n} struts around confidently.',
      '{n} shows off for nobody in particular.',
      '{n} holds their head up high.',
    ],
  },
  dreamy: {
    label: 'Dreamy',
    messages: [
      '{n} gazes at the clouds.',
      '{n} seems lost in a daydream.',
      '{n} smiles at nothing in particular.',
      '{n} hums a tune only they can hear.',
      '{n} drifts off in thought...',
    ],
  },
};

// Species-specific flavor messages (mixed in occasionally)
export const SPECIES_FLAVOR = {
  neko: [
    '{n} chases an invisible mouse.',
    '{n} knocks a cup off the table.',
    '{n} kneads the air with their paws.',
    '{n} fits perfectly inside a small box.',
    '{n} licks their paw thoughtfully.',
  ],
  piku: [
    '{n} tweets a little song.',
    '{n} fluffs their feathers.',
    '{n} hops from perch to perch.',
    '{n} preens their wings carefully.',
    '{n} tilts their head at a shiny thing.',
  ],
  robo: [
    '{n} whirs and clicks softly.',
    '{n} runs a self-diagnostic. All clear!',
    '{n} blinks their LED eyes.',
    '{n} makes dial-up modem sounds.',
    '{n} polishes their own chassis.',
  ],
  blob: [
    '{n} jiggles happily.',
    '{n} absorbs a nearby crumb.',
    '{n} changes shape for fun.',
    '{n} bounces gently in place.',
    '{n} oozes contentedly.',
  ],
  drak: [
    '{n} puffs a tiny smoke ring.',
    '{n} curls their tail around themselves.',
    '{n} breathes a small flame at a leaf.',
    '{n} looks for treasure to hoard.',
    '{n} spreads their wings and stretches.',
  ],
  octo: [
    '{n} waves a tentacle at you.',
    '{n} changes color slightly.',
    '{n} stacks things with their arms.',
    '{n} squirts a tiny jet of water.',
    '{n} solves a puzzle with 8 hands.',
  ],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function rollPersonality() {
  const temperament = pick(Object.keys(TEMPERAMENTS));
  const appetite = pick(Object.keys(APPETITES));
  // Pick 2 unique quirks
  const quirkKeys = Object.keys(QUIRKS);
  const q1 = pick(quirkKeys);
  let q2 = pick(quirkKeys);
  while (q2 === q1) q2 = pick(quirkKeys);
  return { temperament, appetite, quirks: [q1, q2] };
}

export function getPersonalityLabel(personality) {
  const t = TEMPERAMENTS[personality.temperament].label;
  const a = APPETITES[personality.appetite].label;
  const q = personality.quirks.map(q => QUIRKS[q].label).join(' & ');
  return `${t} \u00B7 ${a} \u00B7 ${q}`;
}

export function getPersonalityQuirkMessage(personality, name) {
  const pool = [];
  for (const q of personality.quirks) {
    pool.push(...QUIRKS[q].messages);
  }
  return pick(pool).replace('{n}', name);
}

export function getSpeciesFlavorMessage(species, name) {
  const pool = SPECIES_FLAVOR[species];
  if (!pool) return null;
  return pick(pool).replace('{n}', name);
}
