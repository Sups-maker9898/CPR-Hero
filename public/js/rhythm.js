window.CPRHero = window.CPRHero || {};

CPRHero.rhythm = {
  getExpectedBeatTime(beatStartTime, beatIndex, interval) {
    return beatStartTime + beatIndex * interval;
  },

  classifyHit(delta, perfectWindow, goodWindow) {
    if (delta <= perfectWindow) return 'PERFECT';
    if (delta <= goodWindow) return 'GOOD';
    return 'MISS';
  },

  ringRadius(maxRadius, targetRadius, progress) {
    return maxRadius - progress * (maxRadius - targetRadius);
  },

  nextRingProgress(now, beatTime, interval) {
    return Math.min(1, (now - beatTime) / interval);
  }
};
