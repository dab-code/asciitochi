// Pet brain — behavioral AI for lifelike behavior
//
// Manages: mood momentum, wants, bonding, random events,
// time-awareness, self-initiated activities, care memory

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ============================================================
// MOODS — emotional state that drifts slowly
// ============================================================
const MOODS = {
  joyful:    { min: 80, weight: 'happiness', icon: '!' },
  content:   { min: 55, weight: 'happiness', icon: '' },
  restless:  { min: 0,  weight: 'energy',    icon: '~' },
  lonely:    { min: 0,  weight: 'bonding',   icon: '.' },
  playful:   { min: 50, weight: 'energy',    icon: '*' },
  anxious:   { min: 0,  weight: 'health',    icon: '?' },
  cozy:      { min: 0,  weight: 'comfort',   icon: '' },
};

// ============================================================
// WANTS — things the pet specifically desires right now
// ============================================================
const WANT_TYPES = {
  attention:  { duration: 180, cooldown: 600,  messages: [
    '{n} looks at you expectantly.',
    '{n} nudges your hand.',
    '{n} makes little noises to get your attention.',
    '{n} keeps glancing over at you.',
  ]},
  play:       { duration: 120, cooldown: 400,  messages: [
    '{n} brings you a toy.',
    '{n} bounces around, ready to play!',
    '{n} tugs at your sleeve.',
    '{n} runs circles around you.',
  ]},
  food:       { duration: 240, cooldown: 500,  messages: [
    '{n} hangs around the food area.',
    '{n} gives you puppy eyes near the kitchen.',
    '{n} sniffs the air hopefully.',
    '{n} points at their empty bowl.',
  ]},
  cuddle:     { duration: 150, cooldown: 500,  messages: [
    '{n} climbs into your lap.',
    '{n} leans against you.',
    '{n} reaches up to be held.',
    '{n} snuggles closer.',
  ]},
  explore:    { duration: 200, cooldown: 800,  messages: [
    '{n} stares at the door curiously.',
    '{n} wants to see something new.',
    '{n} is itching to explore.',
    '{n} paces around looking for adventure.',
  ]},
};

// ============================================================
// RANDOM EVENTS — unprompted things that happen
// ============================================================
const RANDOM_EVENTS = [
  { chance: 0.003, message: '{n} found a shiny pebble and is very proud of it.', happiness: 3 },
  { chance: 0.003, message: '{n} just sneezed adorably.', happiness: 1 },
  { chance: 0.002, message: '{n} chased their own tail for a solid minute.', happiness: 2, energy: -2 },
  { chance: 0.002, message: '{n} heard a weird noise and jumped!', happiness: -2 },
  { chance: 0.002, message: '{n} yawned so big their eyes watered.', energy: -1 },
  { chance: 0.003, message: '{n} is staring at a spot on the wall intently.', happiness: 0 },
  { chance: 0.002, message: '{n} just did the cutest stretch.', happiness: 1 },
  { chance: 0.001, message: '{n} rolled over and got stuck. Help!', happiness: -1 },
  { chance: 0.002, message: '{n} is making weird little sounds in their sleep.', happiness: 0 },
  { chance: 0.003, message: '{n} tried to catch a dust particle.', happiness: 2 },
  { chance: 0.001, message: '{n} suddenly got the zoomies!', happiness: 4, energy: -5 },
  { chance: 0.002, message: '{n} found a cozy spot and claimed it.', happiness: 2 },
  { chance: 0.001, message: '{n} brought you a "gift." It\'s a crumb.', happiness: 3 },
  { chance: 0.002, message: '{n} is watching something only they can see.', happiness: 0 },
  { chance: 0.001, message: '{n} did something funny and surprised even themselves.', happiness: 3 },
  { chance: 0.002, message: '{n} is grooming themselves carefully.', cleanliness: 3 },
  { chance: 0.003, message: '{n} perked up at a distant sound.', happiness: 1 },
  { chance: 0.001, message: '{n} accidentally scared themselves with their reflection.', happiness: -1 },
];

// ============================================================
// TIME-OF-DAY behaviors
// ============================================================
function getTimePhase() {
  const h = new Date().getHours();
  if (h >= 6 && h < 9) return 'morning';
  if (h >= 9 && h < 12) return 'midday';
  if (h >= 12 && h < 14) return 'afternoon';
  if (h >= 14 && h < 17) return 'lateday';
  if (h >= 17 && h < 20) return 'evening';
  if (h >= 20 && h < 23) return 'night';
  return 'latenight';
}

const TIME_MESSAGES = {
  morning: [
    '{n} stretches and greets the new day.',
    '{n} blinks awake slowly.',
    '{n} seems energized by the morning light.',
    '{n} is bright-eyed and ready for the day.',
  ],
  midday: [
    '{n} is at their most active.',
    '{n} is full of energy right now.',
    '{n} soaks in the midday warmth.',
  ],
  afternoon: [
    '{n} starts to get a little drowsy.',
    '{n} finds a sunny spot to lounge.',
    '{n} is in a mellow afternoon mood.',
  ],
  lateday: [
    '{n} is winding down a bit.',
    '{n} watches the shadows grow longer.',
    '{n} settles into a calm rhythm.',
  ],
  evening: [
    '{n} is getting cozy for the evening.',
    '{n} seems calmer as night approaches.',
    '{n} enjoys the quiet of the evening.',
  ],
  night: [
    '{n} is getting sleepy...',
    '{n} yawns and blinks slowly.',
    '{n} is fighting to stay awake.',
  ],
  latenight: [
    '{n} is barely keeping their eyes open.',
    '{n} should really be asleep by now.',
    '{n} nods off and catches themselves.',
  ],
};

// ============================================================
// SELF-ACTIVITIES — things the pet does on its own
// ============================================================
const SELF_ACTIVITIES = [
  { name: 'exploring', duration: 30, messages: [
    '{n} is wandering around, exploring.',
    '{n} is poking around in corners.',
    '{n} discovered something interesting!',
  ], endMessages: [
    '{n} finished exploring and seems satisfied.',
    '{n} comes back from their little adventure.',
  ]},
  { name: 'playing_alone', duration: 20, messages: [
    '{n} is playing by themselves.',
    '{n} is entertaining themselves somehow.',
    '{n} tosses around an imaginary toy.',
  ], endMessages: [
    '{n} got tired of playing alone.',
    '{n} wishes someone would play with them.',
  ]},
  { name: 'grooming', duration: 15, messages: [
    '{n} is grooming themselves.',
    '{n} is cleaning up a bit.',
    '{n} wants to look their best.',
  ], endMessages: [
    '{n} looks nice and tidy now.',
    '{n} finished freshening up.',
  ], effect: { cleanliness: 5 } },
  { name: 'daydreaming', duration: 25, messages: [
    '{n} is lost in a daydream.',
    '{n} stares off with a distant smile.',
    '{n} imagines faraway places.',
  ], endMessages: [
    '{n} snaps back to reality.',
    '{n} returns from dreamland.',
  ]},
  { name: 'nesting', duration: 20, messages: [
    '{n} is rearranging their spot.',
    '{n} is making a little nest.',
    '{n} fluffs up their favorite blanket.',
  ], endMessages: [
    '{n} is happy with their cozy nest.',
    '{n} settles into their newly arranged spot.',
  ]},
];

// ============================================================
// BRAIN CLASS
// ============================================================
export class Brain {
  constructor() {
    this.mood = 'content';
    this.moodTimer = 0;
    this.currentWant = null;
    this.wantTimer = 0;
    this.wantCooldowns = {};
    this.activity = null;
    this.activityTimer = 0;
    this.bonding = 50;          // 0-100, grows with care
    this.lastInteraction = 0;   // ticks since last action
    this.interactionCount = 0;  // total actions taken today
    this.pendingEvent = null;
    this._tickCount = 0;
  }

  static fromSave(data) {
    const b = new Brain();
    if (!data) return b;
    b.mood = data.mood || 'content';
    b.bonding = data.bonding ?? 50;
    b.interactionCount = data.interactionCount || 0;
    return b;
  }

  toSave() {
    return {
      mood: this.mood,
      bonding: this.bonding,
      interactionCount: this.interactionCount,
    };
  }

  /**
   * Called when the player does any action (feed, play, etc.)
   */
  onInteraction(actionId, pet) {
    this.lastInteraction = 0;
    this.interactionCount++;

    // Bonding grows with care, faster when pet is happy
    const bondGain = pet.happiness > 60 ? 0.5 : 0.2;
    this.bonding = Math.min(100, this.bonding + bondGain);

    // Fulfill wants
    if (this.currentWant) {
      const fulfilled =
        (this.currentWant === 'food' && actionId === 'feed') ||
        (this.currentWant === 'play' && actionId === 'play') ||
        (this.currentWant === 'cuddle' && (actionId === 'clean' || actionId === 'feed')) ||
        (this.currentWant === 'attention' && actionId !== 'sleep');
      if (fulfilled) {
        this.currentWant = null;
        this.wantTimer = 0;
        // Bonus happiness for fulfilling a want
        pet.happiness = Math.min(100, pet.happiness + 5);
      }
    }

    // Interrupt self-activity
    if (this.activity) {
      this.activity = null;
      this.activityTimer = 0;
    }
  }

  /**
   * Main brain tick — called every second from pet.tick()
   */
  tick(pet) {
    if (!pet.alive || pet.sleeping) return;
    this._tickCount++;
    this.lastInteraction++;

    // Bonding slowly decays if neglected
    if (this.lastInteraction > 600) { // 10 min no interaction
      this.bonding = Math.max(0, this.bonding - 0.002);
    }

    // Update mood every ~30 seconds
    if (this._tickCount % 30 === 0) {
      this._updateMood(pet);
    }

    // Wants system — generate a new want occasionally
    if (!this.currentWant && this._tickCount % 60 === 0) {
      this._maybeGenerateWant(pet);
    }
    if (this.currentWant) {
      this.wantTimer++;
      const wt = WANT_TYPES[this.currentWant];
      if (this.wantTimer > wt.duration) {
        // Want expired unfulfilled — slight sadness
        pet.happiness = Math.max(0, pet.happiness - 2);
        this.wantCooldowns[this.currentWant] = this._tickCount;
        this.currentWant = null;
        this.wantTimer = 0;
      }
    }

    // Self-activities — start one if idle for a while
    if (!this.activity && this.lastInteraction > 120 && Math.random() < 0.005) {
      this.activity = pick(SELF_ACTIVITIES);
      this.activityTimer = 0;
    }
    if (this.activity) {
      this.activityTimer++;
      if (this.activityTimer >= this.activity.duration) {
        // Apply effects
        if (this.activity.effect) {
          for (const [stat, val] of Object.entries(this.activity.effect)) {
            pet[stat] = Math.min(100, Math.max(0, pet[stat] + val));
          }
        }
        this.pendingEvent = {
          message: pick(this.activity.endMessages).replace('{n}', pet.name),
        };
        this.activity = null;
        this.activityTimer = 0;
      }
    }

    // Random events
    if (this._tickCount % 5 === 0) {
      for (const event of RANDOM_EVENTS) {
        if (Math.random() < event.chance) {
          this.pendingEvent = {
            message: event.message.replace('{n}', pet.name),
          };
          if (event.happiness) pet.happiness = Math.min(100, Math.max(0, pet.happiness + event.happiness));
          if (event.energy) pet.energy = Math.min(100, Math.max(0, pet.energy + event.energy));
          if (event.cleanliness) pet.cleanliness = Math.min(100, Math.max(0, pet.cleanliness + event.cleanliness));
          break; // only one event at a time
        }
      }
    }
  }

  /**
   * Get a brain-driven status message, or null to fall through to default.
   */
  getMessage(pet) {
    const n = pet.name;

    // Pending event takes priority
    if (this.pendingEvent) {
      const msg = this.pendingEvent.message;
      this.pendingEvent = null;
      return msg;
    }

    // Current want
    if (this.currentWant && Math.random() < 0.4) {
      const wt = WANT_TYPES[this.currentWant];
      return pick(wt.messages).replace('{n}', n);
    }

    // Self-activity
    if (this.activity && Math.random() < 0.5) {
      return pick(this.activity.messages).replace('{n}', n);
    }

    // Time-of-day awareness (~15% chance)
    if (Math.random() < 0.15) {
      const phase = getTimePhase();
      return pick(TIME_MESSAGES[phase]).replace('{n}', n);
    }

    // Bonding-based messages (~10% chance)
    if (Math.random() < 0.1) {
      if (this.bonding > 80) return pick([
        `${n} trusts you completely.`,
        `${n} lights up when they see you.`,
        `${n} feels safe and loved.`,
        `You and ${n} have a deep bond.`,
      ]);
      if (this.bonding > 50) return pick([
        `${n} is warming up to you.`,
        `${n} seems comfortable around you.`,
        `${n} enjoys your company.`,
      ]);
      if (this.bonding < 20) return pick([
        `${n} seems wary of you.`,
        `${n} keeps their distance.`,
        `${n} doesn't fully trust you yet.`,
      ]);
    }

    // Loneliness if neglected
    if (this.lastInteraction > 300 && Math.random() < 0.2) {
      return pick([
        `${n} wonders where you went.`,
        `${n} looks around for you.`,
        `${n} seems a little lonely.`,
        `${n} hasn't seen you in a while...`,
      ]);
    }

    return null; // fall through to default messages
  }

  _updateMood(pet) {
    if (pet.happiness > 80 && pet.energy > 50) this.mood = 'joyful';
    else if (pet.happiness > 55) this.mood = pet.energy > 60 ? 'playful' : 'content';
    else if (pet.energy < 30) this.mood = 'restless';
    else if (this.bonding < 30) this.mood = 'lonely';
    else if (pet.health < 40) this.mood = 'anxious';
    else this.mood = 'cozy';
  }

  _maybeGenerateWant(pet) {
    const candidates = [];
    if (pet.hunger > 40) candidates.push('food');
    if (pet.happiness < 70 && pet.energy > 30) candidates.push('play');
    if (this.bonding < 60 || this.lastInteraction > 180) candidates.push('attention');
    if (pet.happiness > 40) candidates.push('cuddle');
    if (pet.energy > 50 && pet.happiness > 40) candidates.push('explore');

    // Filter by cooldowns
    const available = candidates.filter(w => {
      const cd = this.wantCooldowns[w];
      if (!cd) return true;
      const elapsed = this._tickCount - cd;
      return elapsed > (WANT_TYPES[w].cooldown || 300);
    });

    if (available.length > 0 && Math.random() < 0.3) {
      this.currentWant = pick(available);
      this.wantTimer = 0;
    }
  }
}
