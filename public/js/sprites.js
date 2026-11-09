window.CPRHero = window.CPRHero || {};

/* Frame sheets from python/make_sprites.py.
   Actors stay planted: blink, breath, talk, kneel, and CPR are in-place frames. */
CPRHero.Gfx = {
  ready: false,
  imgs: {},
  dayCache: {},
  metrics: {
    actor: { w: 48, h: 64 },
    cpr: { w: 72, h: 64 },
    patient: { w: 80, h: 32 },
    coach: { w: 48, h: 48 },
    amb: { w: 112, h: 56 },
    bg: { w: 400, h: 300 },
    scale: 3,
    bgScale: 2,
    ground: 320
  },

  load() {
    const files = [
      'street.png', 'close.png', 'fx.png', 'hero.png', 'hero-cpr.png',
      'rick.png', 'maya.png', 'medic.png', 'patient.png', 'coach.png',
      'props.png', 'ambulance.png'
    ];
    return Promise.all(files.map((name) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ name, img });
      img.onerror = () => reject(new Error('Missing sprite /img/' + name));
      img.src = '/img/' + name;
    }))).then((loaded) => {
      loaded.forEach((item) => { this.imgs[item.name] = item.img; });
      this.ready = true;
    });
  },

  prep(ctx) {
    ctx.imageSmoothingEnabled = false;
    if (ctx.webkitImageSmoothingEnabled !== undefined) ctx.webkitImageSmoothingEnabled = false;
    if (ctx.mozImageSmoothingEnabled !== undefined) ctx.mozImageSmoothingEnabled = false;
    if (ctx.msImageSmoothingEnabled !== undefined) ctx.msImageSmoothingEnabled = false;
  },

  frame(ctx, file, index, fw, fh, dx, dy, scale) {
    const img = this.imgs[file];
    if (!img) return;
    this.prep(ctx);
    ctx.drawImage(img, index * fw, 0, fw, fh, Math.round(dx), Math.round(dy), fw * scale, fh * scale);
  },

  isDay() {
    return window.CPRHero && CPRHero.i18n && CPRHero.i18n.theme() === 'day';
  },

  /* Night art stays the source. Day remaps sky, moon, and lit windows on the game scene. */
  dayCanvas(file) {
    if (this.dayCache[file]) return this.dayCache[file];
    const img = this.imgs[file];
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const g = canvas.getContext('2d');
    g.drawImage(img, 0, 0);
    const image = g.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    const sky = {
      '16,12,40': [132, 204, 246],
      '48,24,78': [176, 220, 250],
      '22,16,28': [150, 208, 244]
    };
    const stars = { '86,92,102': 1, '48,52,92': 1 };
    const sun = { '255,236,196': 1, '244,214,160': 1 };
    const lightsOff = {
      '255,206,112': [36, 62, 104],
      '232,176,48': [36, 62, 104],
      '180,120,48': [28, 48, 86],
      '232,124,72': [28, 48, 86],
      '88,255,190': [22, 78, 70]
    };
    for (let i = 0, n = 0; i < px.length; i += 4, n++) {
      const y = (n / canvas.width) | 0;
      const key = px[i] + ',' + px[i + 1] + ',' + px[i + 2];
      if (y < 30 && sky[key]) {
        px[i] = sky[key][0];
        px[i + 1] = sky[key][1];
        px[i + 2] = sky[key][2];
        continue;
      }
      if (y < 20 && stars[key]) {
        px[i] = 168;
        px[i + 1] = 214;
        px[i + 2] = 248;
        continue;
      }
      if (sun[key]) {
        px[i] = 255;
        px[i + 1] = 196;
        px[i + 2] = 48;
        continue;
      }
      if (lightsOff[key]) {
        px[i] = lightsOff[key][0];
        px[i + 1] = lightsOff[key][1];
        px[i + 2] = lightsOff[key][2];
      }
    }
    g.putImageData(image, 0, 0);
    this.dayCache[file] = canvas;
    return canvas;
  },

  bg(ctx, w, h, scene) {
    const file = (scene === 'close') ? 'close.png' : 'street.png';
    const img = this.imgs[file];
    if (!img) return;
    this.prep(ctx);
    const source = this.isDay() ? this.dayCanvas(file) : img;
    ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, w, h);
  },

  blit(ctx, file, sx, sy, sw, sh, dx, dy, dw, dh) {
    const img = this.imgs[file];
    if (!img) return;
    this.prep(ctx);
    ctx.drawImage(img, sx, sy, sw, sh, Math.round(dx), Math.round(dy), dw, dh);
  },

  /* Head crop, doubled into the 64px portrait. */
  bust(ctx, file, index, fw) {
    const img = this.imgs[file];
    if (!img) return;
    this.prep(ctx);
    const sx = index * fw + Math.max(0, Math.floor((fw - 32) / 2));
    ctx.drawImage(img, sx, 2, 32, 32, 0, 0, 64, 64);
  },

  ambient(ctx, scene, now) {
    if (!this.ready || this.isDay()) return;
    const s = this.metrics.bgScale;
    const glow = Math.floor(now / 180) % 2 === 0;
    if (scene === 'close') {
      this.blit(ctx, 'fx.png', glow ? 56 : 76, 22, 16, 8, (250 - 6) * s, 36 * s, 16 * s, 8 * s);
      return;
    }
    const neonOn = Math.floor(now / 150) % 7 !== 0;
    this.blit(ctx, 'fx.png', neonOn ? 0 : 48, 0, 44, 16, 168 * s, 52 * s, 44 * s, 16 * s);
    const bright = Math.floor(now / 380) % 2 === 0;
    this.blit(ctx, 'fx.png', bright ? 0 : 16, 20, 12, 26, 295 * s, 74 * s, 12 * s, 26 * s);
    const brake = Math.floor(now / 240) % 2 === 0;
    this.blit(ctx, 'fx.png', brake ? 32 : 44, 22, 8, 4, 9 * s, 211 * s, 8 * s, 4 * s);
    this.blit(ctx, 'fx.png', brake ? 32 : 44, 22, 8, 4, 251 * s, 225 * s, 8 * s, 4 * s);
    this.blit(ctx, 'fx.png', glow ? 56 : 76, 22, 16, 8, 126 * s, 70 * s, 16 * s, 8 * s);
  },

  standIndex(now, talking, worried, phone) {
    if (phone) return 4;
    const blink = Math.floor(now / 170) % 16 === 0;
    if (worried && !talking) return blink ? 1 : 3;
    if (talking) {
      if (blink) return 1;
      const mouth = Math.floor(now / 120) % 3;
      if (mouth === 0) return 2;
      if (mouth === 1) return 9;
      return 0;
    }
    if (blink) return 1;
    return (Math.floor(now / 460) % 2 === 0) ? 0 : 8;
  },

  kneelIndex(now, talking) {
    return talking ? 7 : 6;
  },

  /* One compression cycle lines up with a 110 BPM beat (~545 ms / 4 frames). */
  cprIndex(now) {
    return Math.floor(now / 136) % 4;
  },

  patientIndex(now, gasping, compressed) {
    if (compressed && gasping) return 3;
    if (compressed) return (Math.floor(now / 136) % 4 === 2) ? 2 : 4;
    if (gasping) return (Math.floor(now / 280) % 2 === 0) ? 1 : 4;
    return (Math.floor(now / 420) % 18 === 0) ? 5 : 0;
  },

  coachIndex(now, talking) {
    const blink = Math.floor(now / 170) % 18 === 0;
    if (talking) return (Math.floor(now / 130) % 2 === 0) ? 2 : 3;
    return blink ? 1 : 0;
  },

  ambIndex(now) {
    return Math.floor(now / 160) % 2;
  }
};
