// Action definitions — feed, play, clean, sleep, medicine

import { clamp } from './pet.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
      return { animation: 'eat', message: pick([
        `${pet.name} munches happily!`,
        `${pet.name} gobbles it up!`,
        `Nom nom nom! ${pet.name} loves it.`,
        `${pet.name} licks their lips.`,
        `${pet.name} eats with gusto!`,
      ])};
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
      return { animation: 'play', message: pick([
        `${pet.name} had a blast!`,
        `${pet.name} runs around excitedly!`,
        `Wheee! ${pet.name} loves playing!`,
        `${pet.name} does a little spin!`,
        `${pet.name} is having so much fun!`,
      ])};
    },
  },
  clean: {
    cooldown: 60,
    canUse: isAwakeAndAlive,
    apply(pet) {
      pet.cleanliness = 100;
      pet.happiness = clamp(pet.happiness + 5);
      return { animation: 'happy', message: pick([
        `${pet.name} is squeaky clean!`,
        `${pet.name} sparkles after a bath!`,
        `Fresh and clean! ${pet.name} looks great.`,
        `${pet.name} shakes off the water.`,
      ])};
    },
  },
  sleep: {
    cooldown: 600,
    canUse(pet) {
      return pet.alive && pet.stage !== 'egg';
    },
    apply(pet) {
      pet.sleeping = true;
      return { animation: 'sleep', message: pick([
        `${pet.name} curls up to sleep...`,
        `${pet.name} yawns and drifts off.`,
        `Goodnight, ${pet.name}...`,
        `${pet.name} closes their eyes.`,
      ]), duration: 300000 };
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
      return { animation: 'happy', message: pick([
        `${pet.name} took medicine. Feeling better!`,
        `${pet.name} makes a face but swallows it.`,
        `The medicine is working! ${pet.name} perks up.`,
      ])};
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
      return pick([
        `${pet.name} woke up!`,
        `${pet.name} blinks sleepily.`,
        `${pet.name} stretches and yawns.`,
        `Huh? ${pet.name} looks around groggily.`,
      ]);
    }
    return null;
  }
}
