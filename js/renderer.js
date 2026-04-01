// ASCII frame renderer — cycles through animation frames

import { getSprite, getEggSprite } from './sprites.js';

export class Renderer {
  constructor(displayEl) {
    this.displayEl = displayEl;
    this.frames = [];
    this.frameIndex = 0;
    this.frameInterval = null;
    this.frameDuration = 500;
    this.currentState = 'idle';
    this.currentStage = null;
    this.tempState = null;
    this.tempTimeout = null;
  }

  setSprite(species, stage, state) {
    // Skip if already showing this exact state+stage (avoids frame reset)
    if (this.currentState === state && this.currentStage === stage) return;

    this.currentState = state;
    this.currentStage = stage;
    this.frames = stage === 'egg'
      ? getEggSprite(state)
      : getSprite(species, stage, state);
    this.frameIndex = 0;
    this._render();
  }

  playTemp(species, stage, state, durationMs = 2000) {
    if (this.tempTimeout) clearTimeout(this.tempTimeout);
    this.tempState = state;
    // Force the sprite change even if state matches
    this.currentState = null;
    this.setSprite(species, stage, state);
    this.tempTimeout = setTimeout(() => {
      this.tempState = null;
      this.currentState = null;
      this.setSprite(species, stage, 'idle');
    }, durationMs);
  }

  start() {
    this.stop();
    this.frameInterval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this._render();
    }, this.frameDuration);
  }

  stop() {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
  }

  setSpeed(energy) {
    const speed = energy < 20 ? 1000 : energy < 50 ? 700 : 500;
    if (speed !== this.frameDuration) {
      this.frameDuration = speed;
      if (this.frameInterval) {
        this.stop();
        this.start();
      }
    }
  }

  _render() {
    if (this.frames.length === 0) return;
    this.displayEl.textContent = this.frames[this.frameIndex % this.frames.length];
  }
}
