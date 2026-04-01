// Main — boot, game loop, event wiring

import { Pet, STAGES, clamp } from './pet.js';
import { Renderer } from './renderer.js';
import { ActionManager } from './actions.js';
import { Clock } from './clock.js';
import { savePet, loadPet, deleteSave, exportSave, importSave } from './save.js';
import { rollSpecies, getSpecies, getRarityLabel } from './species.js';
import { getEggSprite } from './sprites.js';
import { openMiniGameMenu } from './minigames.js';
import { getPersonalityLabel } from './personality.js';

// ============================================================
// DOM References
// ============================================================
const $ = (id) => document.getElementById(id);

const clockEl = $('clock');
const dayCounterEl = $('day-counter');
const dayNightEl = $('day-night-icon');
const deviceEl = $('device');

const hungerBar = $('hunger-bar');
const happyBar = $('happy-bar');
const energyBar = $('energy-bar');
const cleanBar = $('clean-bar');
const hungerVal = $('hunger-val');
const happyVal = $('happy-val');
const energyVal = $('energy-val');
const cleanVal = $('clean-val');

const petDisplay = $('pet-display');
const petNameEl = $('pet-name');
const petStageEl = $('pet-stage');
const statusMsg = $('status-msg');

const modalEl = $('modal');
const modalTitle = $('modal-title');
const modalBody = $('modal-body');
const modalClose = $('modal-close');

const newGameOverlay = $('new-game-overlay');
const newGameForm = $('new-game-form');
const eggDisplay = $('egg-display');
const petNameInput = $('pet-name-input');
const startBtn = $('start-btn');
const hatchMsg = $('hatch-msg');

const deathOverlay = $('death-overlay');
const deathDisplay = $('death-display');
const deathMsg = $('death-msg');
const restartBtn = $('restart-btn');

const actionBtns = document.querySelectorAll('.action-btn');

// ============================================================
// State
// ============================================================
let pet = null;
let renderer = null;
let actions = null;
let clock = null;
let tickInterval = null;
let saveInterval = null;
let uiInterval = null;
let lastNightState = null;

// ============================================================
// Boot
// ============================================================
function boot() {
  clock = new Clock();
  renderer = new Renderer(petDisplay);
  actions = new ActionManager();
  wireActions();
  wireSettings();

  const saved = loadPet();
  if (saved && saved.alive !== false) {
    pet = Pet.fromSave(saved);
    const elapsed = clock.getElapsedSeconds(saved.lastSave);
    if (elapsed > 10) {
      pet.applyOfflineDecay(elapsed);
    }
    startGame();
  } else if (saved && !saved.alive) {
    pet = Pet.fromSave(saved);
    showDeath();
  } else {
    showNewGame();
  }
}

// ============================================================
// New Game Flow
// ============================================================
function showNewGame() {
  newGameOverlay.classList.remove('hidden');
  deathOverlay.classList.add('hidden');

  const eggFrames = getEggSprite('idle');
  let fi = 0;
  eggDisplay.textContent = eggFrames[0];
  const eggAnim = setInterval(() => {
    fi = (fi + 1) % eggFrames.length;
    eggDisplay.textContent = eggFrames[fi];
  }, 600);

  hatchMsg.textContent = 'An egg appeared!';
  newGameForm.classList.remove('hidden');
  petNameInput.value = '';
  petNameInput.focus();

  const onStart = () => {
    clearInterval(eggAnim);
    const name = petNameInput.value.trim() || 'Mochi';
    const species = rollSpecies();
    const sp = getSpecies(species);

    newGameForm.classList.add('hidden');
    const hatchFrames = getEggSprite('hatch');
    let hi = 0;
    eggDisplay.textContent = hatchFrames[0];
    hatchMsg.textContent = 'Hatching...';

    const hatchAnim = setInterval(() => {
      hi++;
      if (hi < hatchFrames.length) {
        eggDisplay.textContent = hatchFrames[hi];
      } else {
        clearInterval(hatchAnim);
        hatchMsg.textContent = `A ${sp.name} hatched! (${getRarityLabel(sp.rarity)})`;
        setTimeout(() => {
          newGameOverlay.classList.add('hidden');
          pet = new Pet(name, species);
          startGame();
        }, 1500);
      }
    }, 500);
  };

  startBtn.onclick = onStart;
  petNameInput.onkeydown = (e) => { if (e.key === 'Enter') onStart(); };
}

// ============================================================
// Death Screen
// ============================================================
function showDeath() {
  deathOverlay.classList.remove('hidden');
  newGameOverlay.classList.add('hidden');
  stopGame();

  const sp = getSpecies(pet.species);
  deathDisplay.textContent = `    R.I.P.
   _______
  |       |
  | ${pet.name.padEnd(6).slice(0, 6)}|
  |  the  |
  | ${(sp?.name || '???').padEnd(6).slice(0, 6)}|
  |_______|
    | | |`;
  deathMsg.textContent = `${pet.name} lived for ${pet.age} minutes. They will be missed.`;

  restartBtn.onclick = () => {
    deleteSave();
    deathOverlay.classList.add('hidden');
    pet = null;
    showNewGame();
  };
}

// ============================================================
// Game Loop
// ============================================================
function startGame() {
  newGameOverlay.classList.add('hidden');
  deathOverlay.classList.add('hidden');

  updateTheme();
  renderer.setSprite(pet.species, pet.stage, pet.getDisplayState());
  renderer.start();
  updateUI();

  tickInterval = setInterval(() => {
    const prevStage = pet.stage;
    pet.tick(clock.isNight());

    if (pet.stage !== prevStage) {
      onEvolution(prevStage, pet.stage);
    }

    if (!pet.alive) {
      savePet(pet);
      showDeath();
      return;
    }

    if (!renderer.tempState) {
      renderer.setSprite(pet.species, pet.stage, pet.getDisplayState());
    }
    renderer.setSpeed(pet.energy);
  }, 1000);

  uiInterval = setInterval(updateUI, 500);
  saveInterval = setInterval(() => savePet(pet), 30000);
}

function stopGame() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
  if (uiInterval) { clearInterval(uiInterval); uiInterval = null; }
  if (saveInterval) { clearInterval(saveInterval); saveInterval = null; }
  if (renderer) renderer.stop();
}

// ============================================================
// UI Updates
// ============================================================
function updateUI() {
  if (!pet) return;

  clockEl.textContent = clock.getTimeString();
  dayCounterEl.textContent = `Day ${Math.floor(pet.age / 1440) + 1}`;
  dayNightEl.textContent = clock.getIcon();
  updateTheme();

  setBar(hungerBar, hungerVal, Math.round(100 - pet.hunger));
  setBar(happyBar, happyVal, Math.round(pet.happiness));
  setBar(energyBar, energyVal, Math.round(pet.energy));
  setBar(cleanBar, cleanVal, Math.round(pet.cleanliness));

  const sp = getSpecies(pet.species);
  petNameEl.textContent = pet.stage === 'egg'
    ? '???'
    : `~ ${pet.name} the ${sp?.name || '???'} ~`;
  petStageEl.textContent = pet.stage === 'egg'
    ? ''
    : `${pet.getStageLabel()} \u00B7 ${getPersonalityLabel(pet.personality)}`;
  statusMsg.textContent = pet.getStatusMessage();

  actionBtns.forEach(btn => {
    const actionId = btn.dataset.action;
    if (pet.sleeping) {
      // While sleeping: buttons are dimmed but tappable (to wake pet)
      btn.classList.remove('disabled');
      btn.classList.toggle('cooldown', actionId !== 'sleep');
    } else {
      const cantDo = actionId === 'game'
        ? (!pet.alive || pet.stage === 'egg')
        : !actions.canDo(actionId, pet);
      btn.classList.remove('cooldown');
      btn.classList.toggle('disabled', cantDo);
    }
  });
}

function setBar(barEl, valEl, value) {
  const v = clamp(value);
  barEl.style.width = v + '%';
  valEl.textContent = v;
  barEl.classList.remove('low', 'mid');
  if (v < 25) barEl.classList.add('low');
  else if (v < 50) barEl.classList.add('mid');
}

function updateTheme() {
  const isNight = clock.isNight();
  if (isNight !== lastNightState) {
    lastNightState = isNight;
    deviceEl.classList.toggle('night', isNight);
  }
}

// ============================================================
// Actions (wired once at boot)
// ============================================================
function wireActions() {
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!pet || !pet.alive) return;

      const actionId = btn.dataset.action;

      if (actionId === 'game') {
        if (pet.stage === 'egg' || pet.sleeping) return;
        openMiniGameMenu(modalEl, modalTitle, modalBody, modalClose).then(reward => {
          if (reward.happiness) pet.happiness = clamp(pet.happiness + reward.happiness);
          if (reward.energy) pet.energy = clamp(pet.energy + reward.energy);
          updateUI();
          savePet(pet);
        });
        return;
      }

      if (pet.sleeping && actionId !== 'sleep') {
        const msg = actions.wakeUp(pet);
        if (msg) {
          statusMsg.textContent = msg;
          renderer.currentState = null;
          renderer.setSprite(pet.species, pet.stage, pet.getDisplayState());
          updateUI();
        }
        return;
      }

      const result = actions.doAction(actionId, pet);
      if (result) {
        statusMsg.textContent = result.message;
        renderer.playTemp(pet.species, pet.stage, result.animation, result.duration || 2000);
        savePet(pet);
        updateUI();
      }
    });
  });
}

// ============================================================
// Evolution Events
// ============================================================
function onEvolution(fromStage, toStage) {
  const sp = getSpecies(pet.species);
  let msg;
  if (fromStage === 'egg') {
    msg = `${pet.name} hatched into a ${sp?.name || 'pet'}!`;
  } else if (toStage.startsWith('teen_')) {
    msg = `${pet.name} evolved into a teen!`;
  } else if (toStage.startsWith('adult_')) {
    msg = toStage === STAGES.ADULT_SECRET
      ? `\u{2B50} ${pet.name} achieved the SECRET form! \u{2B50}`
      : `${pet.name} reached adulthood! Form: ${pet.getStageLabel()}`;
  }

  if (msg) {
    statusMsg.textContent = msg;
    renderer.currentState = null;
    renderer.setSprite(pet.species, pet.stage, 'happy');
    setTimeout(() => {
      renderer.currentState = null;
      renderer.setSprite(pet.species, pet.stage, pet.getDisplayState());
    }, 3000);
  }

  savePet(pet);
}

// ============================================================
// Modal close
// ============================================================
modalClose.addEventListener('click', () => {
  modalEl.classList.add('hidden');
});

// ============================================================
// Settings / Export / Import
// ============================================================
function wireSettings() {
  const exportBtn = $('export-btn');
  const importBtn = $('import-btn');
  const importFile = $('import-file');
  const settingsClose = $('settings-close');
  const settingsOverlay = $('settings-overlay');

  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = '\u{2699}\u{FE0F}';
  settingsBtn.style.cssText = 'background:none;border:none;font-size:18px;cursor:pointer;padding:0;';
  $('header').appendChild(settingsBtn);

  settingsBtn.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
  settingsClose.addEventListener('click', () => settingsOverlay.classList.add('hidden'));

  exportBtn.addEventListener('click', () => {
    if (pet) savePet(pet);
    exportSave();
  });

  importBtn.addEventListener('click', () => importFile.click());

  $('reset-btn').addEventListener('click', () => {
    if (!confirm('Start over with a new egg? Your current pet will be gone.')) return;
    settingsOverlay.classList.add('hidden');
    stopGame();
    deleteSave();
    pet = null;
    showNewGame();
  });

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importSave(file);
      importFile.value = '';
      settingsOverlay.classList.add('hidden');
      stopGame();
      const saved = loadPet();
      if (saved) {
        pet = Pet.fromSave(saved);
        startGame();
        statusMsg.textContent = 'Save imported!';
      }
    } catch {
      statusMsg.textContent = 'Invalid save file!';
    }
  });
}

// ============================================================
// Save on page hide
// ============================================================
document.addEventListener('visibilitychange', () => {
  if (document.hidden && pet?.alive) savePet(pet);
});

window.addEventListener('beforeunload', () => {
  if (pet?.alive) savePet(pet);
});

// ============================================================
// Start
// ============================================================
boot();
