window.CPRHero = window.CPRHero || {};

CPRHero.rhythm = {
  // Adult CPR rate window. Change these to retune feedback without touching the game loop.
  timingConfig: {
    perfectMinMs: 500,
    perfectMaxMs: 600,
    targetMinBpm: 100,
    targetMaxBpm: 120,
    meterMinBpm: 70,
    meterMaxBpm: 170,
    sampleSize: 4,
    feedbackHoldMs: 1400
  },

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
  },

  // Latest gap between two compressions. 500 and 600 are inside the perfect window.
  classifyInterval(intervalMs, config) {
    const cfg = config || this.timingConfig;
    if (!Number.isFinite(intervalMs)) return 'slow';
    if (intervalMs < cfg.perfectMinMs) return 'fast';
    if (intervalMs > cfg.perfectMaxMs) return 'slow';
    return 'perfect';
  },

  bpmFromInterval(intervalMs) {
    if (!intervalMs || intervalMs <= 0 || !Number.isFinite(intervalMs)) return null;
    return 60000 / intervalMs;
  },

  formatBpm(bpm) {
    if (bpm == null || !Number.isFinite(bpm)) return null;
    return Math.round(bpm);
  },

  average(values) {
    if (!values || !values.length) return null;
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    return sum / values.length;
  },

  pushIntervalSample(samples, intervalMs, sampleSize) {
    const size = sampleSize || this.timingConfig.sampleSize;
    const next = (samples || []).slice();
    next.push(intervalMs);
    if (next.length > size) next.splice(0, next.length - size);
    return next;
  },

  zoneForBpm(bpm, config) {
    const cfg = config || this.timingConfig;
    if (bpm == null || !Number.isFinite(bpm)) return 'idle';
    if (bpm < cfg.targetMinBpm) return 'low';
    if (bpm > cfg.targetMaxBpm) return 'high';
    return 'target';
  },

  meterPercent(bpm, config) {
    const cfg = config || this.timingConfig;
    const span = cfg.meterMaxBpm - cfg.meterMinBpm;
    if (!span || bpm == null || !Number.isFinite(bpm)) return 0;
    const clamped = Math.min(cfg.meterMaxBpm, Math.max(cfg.meterMinBpm, bpm));
    return ((clamped - cfg.meterMinBpm) / span) * 100;
  },

  // A fast or slow press clears the streak so speed is never partly rewarded.
  nextTimingCombo(combo, judgment) {
    if (judgment === 'perfect') return (combo || 0) + 1;
    if (judgment === 'first') return combo || 0;
    return 0;
  },

  // lastAt null means this is the first compression and there is no interval yet.
  recordCompression(state, now, config) {
    const cfg = config || this.timingConfig;
    const current = state || {};
    const samples = Array.isArray(current.samples) ? current.samples : [];
    const combo = current.combo || 0;
    const bestCombo = current.bestCombo || 0;

    if (current.lastAt == null) {
      return {
        lastAt: now,
        samples: samples.slice(),
        combo: combo,
        bestCombo: bestCombo,
        judgment: 'first',
        interval: null,
        averageMs: null,
        bpm: null,
        instantBpm: null,
        zone: 'idle'
      };
    }

    const interval = now - current.lastAt;
    const nextSamples = this.pushIntervalSample(samples, interval, cfg.sampleSize);
    const judgment = this.classifyInterval(interval, cfg);
    const averageMs = this.average(nextSamples);
    const bpm = this.bpmFromInterval(averageMs);
    const instantBpm = this.bpmFromInterval(interval);
    const nextCombo = this.nextTimingCombo(combo, judgment);

    return {
      lastAt: now,
      samples: nextSamples,
      combo: nextCombo,
      bestCombo: Math.max(bestCombo, nextCombo),
      judgment: judgment,
      interval: interval,
      averageMs: averageMs,
      bpm: bpm,
      instantBpm: instantBpm,
      zone: this.zoneForBpm(this.formatBpm(bpm))
    };
  }
};
