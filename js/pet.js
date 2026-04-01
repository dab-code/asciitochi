// Pet class — stats, aging, evolution logic

import {
  TEMPERAMENTS, APPETITES, rollPersonality,
  getPersonalityQuirkMessage, getSpeciesFlavorMessage,
} from './personality.js';
import { Brain } from './brain.js';

export const STAGES = {
  EGG: 'egg',
  BABY: 'baby',
  TEEN_HAPPY: 'teen_happy',
  TEEN_NEUTRAL: 'teen_neutral',
  TEEN_SAD: 'teen_sad',
  ADULT_ANGEL: 'adult_angel',
  ADULT_NORMAL: 'adult_normal',
  ADULT_GREMLIN: 'adult_gremlin',
  ADULT_SECRET: 'adult_secret',
};

const STAGE_LABELS = {
  egg: 'Egg',
  baby: 'Baby',
  teen_happy: 'Teen \u00B7 Happy',
  teen_neutral: 'Teen \u00B7 Neutral',
  teen_sad: 'Teen \u00B7 Sad',
  adult_angel: 'Adult \u00B7 Angel',
  adult_normal: 'Adult \u00B7 Normal',
  adult_gremlin: 'Adult \u00B7 Gremlin',
  adult_secret: 'Adult \u00B7 \u2605 Secret \u2605',
};

const EGG_HATCH_AGE = 5;
const BABY_EVOLVE_AGE = 60;
const TEEN_EVOLVE_AGE = 180;

const DECAY = {
  hunger: 0.0035,
  happiness: 0.002,
  energy: 0.0015,
  cleanliness: 0.001,
};

const HUNGER_PENALTY = 0.003;
const DIRTY_PENALTY = 0.002;
const NIGHT_ENERGY_MULT = 2;

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export class Pet {
  constructor(name, species) {
    this.name = name;
    this.species = species;
    this.hunger = 50;     // 0 = full, 100 = starving
    this.happiness = 80;
    this.energy = 80;
    this.cleanliness = 80;
    this.health = 100;
    this.age = 0;
    this.stage = STAGES.BABY;
    this.alive = true;
    this.careHistory = [];
    this.birthTime = Date.now();
    this.deathTimer = 0;
    this.sleeping = false;
    this.personality = rollPersonality();
    this.brain = new Brain();
    this._tickCount = 0;
  }

  static fromSave(data) {
    const p = new Pet(data.name, data.species);
    p.hunger = data.hunger;
    p.happiness = data.happiness;
    p.energy = data.energy;
    p.cleanliness = data.cleanliness;
    p.health = data.health ?? 100;
    p.age = data.age;
    p.stage = data.stage;
    p.alive = data.alive;
    p.careHistory = data.careHistory || [];
    p.birthTime = data.birthTime;
    p.deathTimer = data.deathTimer || 0;
    p.sleeping = data.sleeping || false;
    p.personality = data.personality || rollPersonality();
    p.brain = Brain.fromSave(data.brain);
    return p;
  }

  applyOfflineDecay(elapsedSeconds) {
    const capped = Math.min(elapsedSeconds, 8 * 3600);
    this.hunger = clamp(this.hunger + DECAY.hunger * capped);
    this.happiness = clamp(this.happiness - DECAY.happiness * capped);
    if (this.sleeping) {
      // Sleeping pets regenerate energy offline
      this.energy = clamp(this.energy + 0.02 * capped);
      this.sleeping = false; // wake after offline period
    } else {
      this.energy = clamp(this.energy - DECAY.energy * capped);
    }
    this.cleanliness = clamp(this.cleanliness - DECAY.cleanliness * capped);
    this.age += Math.floor(capped / 60);
    this._updateHealth();
    while (this._checkEvolution()) {}
  }

  tick(isNight) {
    if (!this.alive) return;

    this._tickCount++;

    const temper = TEMPERAMENTS[this.personality.temperament] || TEMPERAMENTS.chill;
    const appetite = APPETITES[this.personality.appetite] || APPETITES.normal;

    this.hunger = clamp(this.hunger + DECAY.hunger * appetite.hungerDecay);

    let happinessDecay = DECAY.happiness * temper.happinessDecay;
    if (this.hunger > 80) happinessDecay += HUNGER_PENALTY;
    if (this.cleanliness < 20) happinessDecay += DIRTY_PENALTY;
    this.happiness = clamp(this.happiness - happinessDecay);

    let energyDecay = DECAY.energy * temper.energyDecay;
    if (isNight && !this.sleeping) energyDecay *= NIGHT_ENERGY_MULT;
    if (this.sleeping) {
      this.energy = clamp(this.energy + 0.02);
      if (this.energy >= 100) this.sleeping = false;
    } else {
      this.energy = clamp(this.energy - energyDecay);
    }

    this.cleanliness = clamp(this.cleanliness - DECAY.cleanliness);

    this._updateHealth();

    if (this.health < 10) {
      this.deathTimer++;
      if (this.deathTimer >= 1800) {
        this.alive = false;
      }
    } else {
      this.deathTimer = Math.max(0, this.deathTimer - 1);
    }

    if (this._tickCount % 60 === 0) {
      this.age++;
      if (this.age % 10 === 0) {
        this.careHistory.push(Math.round(this.happiness));
        if (this.careHistory.length > 100) this.careHistory.shift();
      }
      this._checkEvolution();
    }

    // Auto-sleep at night if very tired
    if (isNight && this.energy < 30 && !this.sleeping && this.stage !== STAGES.EGG) {
      this.sleeping = true;
    }

    // Brain tick
    this.brain.tick(this);
  }

  getDisplayState() {
    if (!this.alive) return 'dead';
    if (this.sleeping) return 'sleep';
    if (this.health < 20) return 'sick';
    if (this.happiness > 80) return 'happy';
    return 'idle';
  }

  getStatusMessage() {
    const n = this.name;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    if (!this.alive) return pick([
      `${n} has passed away...`,
      `Goodbye, ${n}...`,
      `${n} is at peace now.`,
    ]);
    if (this.sleeping) return pick([
      `${n} is sleeping... zzz`,
      `${n} is dreaming about snacks.`,
      `Shhh... ${n} is napping.`,
      `${n} mumbles in their sleep.`,
      `${n} is snoring softly.`,
    ]);
    if (this.stage === STAGES.EGG) return 'The egg is wiggling...';

    // Urgent needs (prioritized)
    if (this.health < 20) return pick([
      `${n} is feeling very sick!`,
      `${n} looks pale and weak...`,
      `${n} needs help!`,
    ]);
    if (this.hunger > 80) return pick([
      `${n} is starving!`,
      `${n}'s tummy is growling loudly!`,
      `${n} stares at you... feed me?`,
      `${n} is eyeing your snacks.`,
    ]);
    if (this.hunger > 60) return pick([
      `${n} is getting hungry...`,
      `${n}'s stomach rumbles.`,
      `${n} sniffs around for food.`,
    ]);
    if (this.happiness < 20) return pick([
      `${n} is really down...`,
      `${n} sits in the corner quietly.`,
      `${n} looks like they need a friend.`,
    ]);
    if (this.energy < 20) return pick([
      `${n} can barely keep their eyes open.`,
      `${n} yawns widely...`,
      `${n} is dragging their feet.`,
    ]);
    if (this.cleanliness < 20) return pick([
      `${n} is getting a bit smelly...`,
      `${n} leaves little footprints everywhere.`,
      `${n} could really use a bath.`,
    ]);

    // Brain-driven message (wants, events, activities, time-awareness)
    const brainMsg = this.brain.getMessage(this);
    if (brainMsg) return brainMsg;

    // ~25% chance of personality quirk or species flavor
    if (Math.random() < 0.25) {
      const msg = Math.random() < 0.5
        ? getPersonalityQuirkMessage(this.personality, n)
        : getSpeciesFlavorMessage(this.species, n);
      if (msg) return msg;
    }

    // Mood-based idle thoughts
    if (this.happiness > 80 && this.hunger < 30) return pick([
      `${n} is beaming with joy!`,
      `${n} does a happy little dance.`,
      `${n} feels loved and full.`,
      `Life is good for ${n}!`,
    ]);
    if (this.happiness > 70) return pick([
      `${n} is in a great mood!`,
      `${n} hums a little tune.`,
      `${n} looks at you adoringly.`,
      `${n} bounces around happily.`,
      `${n} seems really content.`,
    ]);
    if (this.happiness > 50) return pick([
      `${n} is doing alright.`,
      `${n} looks around curiously.`,
      `${n} stretches and yawns.`,
      `${n} is chilling.`,
      `${n} watches a bug crawl by.`,
      `${n} tilts their head at you.`,
    ]);
    if (this.happiness > 30) return pick([
      `${n} seems a bit restless.`,
      `${n} fidgets around.`,
      `${n} looks like they want attention.`,
      `${n} sighs softly.`,
    ]);
    return pick([
      `${n} stares into the distance.`,
      `${n} is being quiet.`,
      `${n} seems lost in thought.`,
      `${n} is just hanging out.`,
    ]);
  }

  getStageLabel() {
    return STAGE_LABELS[this.stage] || this.stage;
  }

  _avgHappiness() {
    if (this.careHistory.length === 0) return this.happiness;
    const sum = this.careHistory.reduce((a, b) => a + b, 0);
    return sum / this.careHistory.length;
  }

  _updateHealth() {
    const hungerHealth = 100 - this.hunger;
    this.health = clamp(Math.round(
      hungerHealth * 0.3 + this.happiness * 0.3 + this.energy * 0.2 + this.cleanliness * 0.2
    ));
  }

  _checkEvolution() {
    const age = this.age;

    if (this.stage === STAGES.EGG && age >= EGG_HATCH_AGE) {
      this.stage = STAGES.BABY;
      return 'hatch';
    }

    if (this.stage === STAGES.BABY && age >= BABY_EVOLVE_AGE) {
      const avg = this._avgHappiness();
      if (avg > 70) this.stage = STAGES.TEEN_HAPPY;
      else if (avg > 40) this.stage = STAGES.TEEN_NEUTRAL;
      else this.stage = STAGES.TEEN_SAD;
      return 'evolve_teen';
    }

    if (this.stage.startsWith('teen_') && age >= TEEN_EVOLVE_AGE) {
      const avg = this._avgHappiness();
      if (this.hunger < 10 && this.happiness > 90 && this.energy > 90 && this.cleanliness > 90) {
        this.stage = STAGES.ADULT_SECRET;
      } else if (avg > 70) {
        this.stage = STAGES.ADULT_ANGEL;
      } else if (avg > 40) {
        this.stage = STAGES.ADULT_NORMAL;
      } else {
        this.stage = STAGES.ADULT_GREMLIN;
      }
      return 'evolve_adult';
    }

    return null;
  }
}
