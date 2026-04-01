// localStorage persistence — save, load, export, import

const SAVE_KEY = 'asciitochi_save';

export function savePet(pet) {
  const data = {
    name: pet.name,
    species: pet.species,
    hunger: pet.hunger,
    happiness: pet.happiness,
    energy: pet.energy,
    cleanliness: pet.cleanliness,
    health: pet.health,
    age: pet.age,
    stage: pet.stage,
    alive: pet.alive,
    careHistory: pet.careHistory,
    birthTime: pet.birthTime,
    lastSave: Date.now(),
    deathTimer: pet.deathTimer,
    sleeping: pet.sleeping,
    personality: pet.personality,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadPet() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function exportSave() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'asciitochi-save.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importSave(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.name || !data.species) {
          reject(new Error('Invalid save file'));
          return;
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
