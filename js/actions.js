// Action definitions — feed, play, clean, sleep, discipline, medicine

import { clamp } from './pet.js';

function isAwakeAndAlive(pet) {
  return pet.alive && pet.stage !== 'egg' && !pet.sleeping;
}

const ACTIONS = {
  feed: {
    cooldown: 30,
    canUse: isAwakeAndAlive,
    apply(pet) {
      pet.hunger = clamp(pet.hunger - 30);
      pet.happiness = clamp(pet.happiness + 5);
      return { animation: 'eat', message: `${pet.name} munches happily!` };
    },
  },
  play: {
    cooldown: 45,
    canUse(pet) {
      if (!isAwakeAndAlive(pet)) return false;
      return !(pet.happiness < 10 && pet.hunger > 80);
    },
    apply(pet) {
      pet.happiness = clamp(pet.happiness + 25);
      pet.energy = clamp(pet.energy - 15);
      pet.cleanliness = clamp(pet.cleanliness - 5);
      return { animation: 'play', message: `${pet.name} had fun playing!` };
    },
  },
  clean: {
    cooldown: 60,
    canUse: isAwakeAndAlive,
    apply(pet) {
      pet.cleanliness = 100;
      pet.happiness = clamp(pet.happiness + 5);
      return { animation: 'happy', message: `${pet.name} is squeaky clean!` };
    },
  },
  sleep: {
    cooldown: 600,
    canUse(pet) {
      return pet.alive && pet.stage !== 'egg';
    },
    apply(pet) {
      pet.sleeping = true;
      return { animation: 'sleep', message: `${pet.name} is going to sleep...`, duration: 300000 };
    },
  },
  discipline: {
    cooldown: 120,
    canUse: isAwakeAndAlive,
    apply(pet) {
      pet.happiness = clamp(pet.happiness - 10);
      return { animation: 'idle', message: `${pet.name} looks chastened.` };
    },
  },
  medicine: {
    cooldown: 300,
    canUse(pet) {
      return isAwakeAndAlive(pet) && pet.health < 50;
    },
    apply(pet) {
      pet.hunger = clamp(pet.hunger - 15);
      pet.happiness = clamp(pet.happiness + 10);
      pet.energy = clamp(pet.energy + 10);
      return { animation: 'happy', message: `${pet.name} took medicine. Feeling better!` };
    },
  },
};

export class ActionManager {
  constructor() {
    this.cooldowns = {};
  }

  canDo(actionId, pet) {
    const action = ACTIONS[actionId];
    if (!action) return false;
    if (this.isOnCooldown(actionId)) return false;
    return action.canUse(pet);
  }

  doAction(actionId, pet) {
    const action = ACTIONS[actionId];
    if (!action || !this.canDo(actionId, pet)) return null;

    const result = action.apply(pet);
    this.cooldowns[actionId] = Date.now() + action.cooldown * 1000;

    if (actionId !== 'sleep' && pet.sleeping) {
      pet.sleeping = false;
    }

    return result;
  }

  isOnCooldown(actionId) {
    const expiry = this.cooldowns[actionId];
    return expiry ? Date.now() < expiry : false;
  }

  wakeUp(pet) {
    if (pet.sleeping) {
      pet.sleeping = false;
      return `${pet.name} woke up!`;
    }
    return null;
  }
}
