// Real-time 24h clock and day/night cycle

export class Clock {
  getHour() {
    return new Date().getHours();
  }

  isNight() {
    const h = this.getHour();
    return h >= 18 || h < 6;
  }

  getTimeString() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  getIcon() {
    return this.isNight() ? '\u{1F319}' : '\u{2600}\u{FE0F}';
  }

  getElapsedSeconds(sinceTimestamp) {
    return Math.floor((Date.now() - sinceTimestamp) / 1000);
  }
}
