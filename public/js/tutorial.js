window.CPRHero = window.CPRHero || {};

/* First-run lesson, shown after Call 911. Slow practice, then the real
   110 BPM beat. It never calls the mission scorer or the leaderboard. */
(function () {
  const STORAGE_KEY = 'cprhero-tutorial';
  const STEPS = ['welcome', 'controls', 'rhythm', 'practice', 'real', 'done'];
  const SLOW_INTERVAL = 1000;
  const REAL_INTERVAL = 60000 / 110;
  const PERFECT_WINDOW = 65;
  const GOOD_WINDOW = 130;
  const PRACTICE_TRIES = 4;
  const RING_MAX = 120;
  const RING_TARGET = 40;
  const RING_SCALE = 0.62;

  const overlay = document.getElementById('tutorial-overlay');
  const kicker = document.getElementById('tutorial-kicker');
  const title = document.getElementById('tutorial-title');
  const body = document.getElementById('tutorial-body');
  const actions = document.getElementById('tutorial-actions');
  const replayBtn = document.getElementById('tutorial-replay');
  if (!overlay || !title || !body || !actions) return;

  let open = false;
  let stepIndex = 0;
  let practiceInterval = SLOW_INTERVAL;
  let origin = 0;
  let handledBeat = -1;
  let announcedMiss = -1;
  let attempts = 0;
  let practiceReady = false;
  let rafId = 0;
  let lastFeedback = { key: '', kind: '' };

  function t(key) {
    return (CPRHero.i18n && CPRHero.i18n.t(key)) || key;
  }

  function isDone() {
    try { return localStorage.getItem(STORAGE_KEY) === 'done'; }
    catch (err) { return false; }
  }

  function markDone() {
    try { localStorage.setItem(STORAGE_KEY, 'done'); }
    catch (err) { /* The lesson can still close for this visit. */ }
  }

  function stopPractice() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function closeTutorial() {
    open = false;
    stopPractice();
    overlay.classList.remove('active');
  }

  function button(label, className, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'retro-btn ' + className;
    btn.textContent = label;
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return btn;
  }

  function go(next) {
    stepIndex = next;
    lastFeedback = { key: '', kind: '' };
    attempts = 0;
    practiceReady = false;
    render();
  }

  function endLesson() {
    markDone();
    closeTutorial();
    window.dispatchEvent(new CustomEvent('cprhero-tutorial-closed'));
  }

  function isPracticeStep() {
    const id = STEPS[stepIndex];
    return id === 'practice' || id === 'real';
  }

  function practiceText() {
    const real = STEPS[stepIndex] === 'real';
    return {
      title: t(real ? 'tutorialRealTitle' : 'tutorialPracticeTitle'),
      body: t(real ? 'tutorialRealBody' : 'tutorialPracticeBody')
    };
  }

  function showFeedback(key, kind) {
    lastFeedback = { key: key, kind: kind };
    const node = document.getElementById('tutorial-feedback');
    if (!node) return;
    node.textContent = t(key);
    node.className = 'tutorial-feedback is-' + kind;
  }

  function refreshPracticeCopy() {
    const feedback = document.getElementById('tutorial-feedback');
    const tries = document.getElementById('tutorial-tries');
    const ready = document.getElementById('tutorial-ready');
    const text = practiceText();
    if (title) title.textContent = text.title;
    if (kicker) kicker.textContent = t('tutorialStep') + ' ' + (stepIndex + 1) + ' / ' + STEPS.length;
    const intro = document.getElementById('tutorial-practice-copy');
    if (intro) intro.textContent = text.body;
    if (feedback && lastFeedback.key) {
      feedback.textContent = t(lastFeedback.key);
      feedback.className = 'tutorial-feedback is-' + lastFeedback.kind;
    }
    if (tries) tries.textContent = t('tutorialTries') + ': ' + attempts;
    if (ready) ready.textContent = practiceReady ? t('tutorialReady') : '';
    const next = document.getElementById('tutorial-practice-next');
    if (next) next.textContent = t('tutorialNext');
    const skipBtn = document.getElementById('tutorial-practice-skip');
    if (skipBtn) skipBtn.textContent = t('tutorialSkip');
  }

  function revealPracticeNext() {
    if (practiceReady) return;
    practiceReady = true;
    const ready = document.getElementById('tutorial-ready');
    if (ready) ready.textContent = t('tutorialReady');
    if (document.getElementById('tutorial-practice-next')) return;
    const next = button(t('tutorialNext'), 'tutorial-primary', () => go(stepIndex + 1));
    next.id = 'tutorial-practice-next';
    actions.appendChild(next);
  }

  function beatForPress(now) {
    const cycle = Math.floor((now - origin) / practiceInterval);
    const justMet = origin + cycle * practiceInterval;
    if (cycle > 0 && now - justMet <= GOOD_WINDOW) {
      return { id: cycle - 1, signed: now - justMet };
    }
    const upcoming = origin + (cycle + 1) * practiceInterval;
    return { id: cycle, signed: now - upcoming };
  }

  function practicePress(now) {
    if (!open || !isPracticeStep()) return;
    const beat = beatForPress(now);
    if (handledBeat === beat.id) {
      showFeedback('tutorialWait', 'good');
      return;
    }
    handledBeat = beat.id;
    const tier = CPRHero.rhythm.classifyHit(Math.abs(beat.signed), PERFECT_WINDOW, GOOD_WINDOW);
    attempts += 1;
    const tries = document.getElementById('tutorial-tries');
    if (tries) tries.textContent = t('tutorialTries') + ': ' + attempts;
    if (tier === 'PERFECT') showFeedback('tutorialPerfectHit', 'perfect');
    else if (tier === 'GOOD') showFeedback(beat.signed < 0 ? 'tutorialGoodEarly' : 'tutorialGoodLate', 'good');
    else showFeedback(beat.signed < 0 ? 'tutorialEarly' : 'tutorialLate', 'miss');
    if (attempts >= PRACTICE_TRIES) revealPracticeNext();
  }

  function practiceFrame() {
    if (!open || !isPracticeStep()) return;
    const now = performance.now();
    const cycle = Math.floor((now - origin) / practiceInterval);
    if (cycle > 0) {
      const missedId = cycle - 1;
      const deadline = origin + cycle * practiceInterval + GOOD_WINDOW;
      if (handledBeat !== missedId && announcedMiss !== missedId && now > deadline) {
        announcedMiss = missedId;
        showFeedback('tutorialLate', 'miss');
      }
    }
    const elapsed = (now - origin) % practiceInterval;
    const progress = CPRHero.rhythm.nextRingProgress(origin + elapsed, origin, practiceInterval);
    const radius = CPRHero.rhythm.ringRadius(RING_MAX, RING_TARGET, progress);
    const ring = document.getElementById('tutorial-ring');
    if (ring) {
      const size = Math.max(12, radius * RING_SCALE * 2);
      ring.style.width = size + 'px';
      ring.style.height = size + 'px';
    }
    rafId = requestAnimationFrame(practiceFrame);
  }

  function startPractice(interval) {
    stopPractice();
    practiceInterval = interval;
    origin = performance.now();
    handledBeat = -1;
    announcedMiss = -1;
    attempts = 0;
    practiceReady = false;
    rafId = requestAnimationFrame(practiceFrame);
  }

  function renderPractice() {
    body.innerHTML = '';
    const copy = document.createElement('p');
    copy.id = 'tutorial-practice-copy';
    copy.textContent = practiceText().body;
    const wrap = document.createElement('div');
    wrap.className = 'tutorial-ring-wrap';
    wrap.innerHTML = '<div class="tutorial-ring" id="tutorial-ring"></div><div class="tutorial-ring-target"></div><div class="tutorial-heart" aria-hidden="true"></div>';
    const feedback = document.createElement('p');
    feedback.id = 'tutorial-feedback';
    feedback.className = 'tutorial-feedback';
    feedback.setAttribute('aria-live', 'polite');
    const tries = document.createElement('p');
    tries.id = 'tutorial-tries';
    tries.textContent = t('tutorialTries') + ': 0';
    const ready = document.createElement('p');
    ready.id = 'tutorial-ready';
    body.appendChild(copy);
    body.appendChild(wrap);
    body.appendChild(feedback);
    body.appendChild(tries);
    body.appendChild(ready);
    actions.appendChild(button(t('tutorialSkip'), 'secondary', endLesson));
    const skipBtn = actions.querySelector('button');
    if (skipBtn) skipBtn.id = 'tutorial-practice-skip';
    startPractice(STEPS[stepIndex] === 'real' ? REAL_INTERVAL : SLOW_INTERVAL);
  }

  function render() {
    stopPractice();
    const id = STEPS[stepIndex];
    kicker.textContent = t('tutorialStep') + ' ' + (stepIndex + 1) + ' / ' + STEPS.length;
    actions.innerHTML = '';
    body.innerHTML = '';

    if (id === 'welcome') {
      title.textContent = t('tutorialWelcomeTitle');
      const copy = document.createElement('p');
      copy.textContent = t('tutorialWelcomeBody');
      body.appendChild(copy);
      actions.appendChild(button(t('tutorialStart'), 'tutorial-primary', () => go(1)));
      actions.appendChild(button(t('tutorialSkip'), 'secondary', endLesson));
    } else if (id === 'controls') {
      title.textContent = t('tutorialControlsTitle');
      const copy = document.createElement('p');
      copy.textContent = t('tutorialControlsBody');
      const keys = document.createElement('div');
      keys.className = 'tutorial-keys';
      keys.innerHTML = '<kbd>' + t('tutorialKeySpace') + '</kbd><kbd>' + t('tutorialKeyEnter') + '</kbd>';
      const note = document.createElement('p');
      note.textContent = t('tutorialControlsNote');
      body.appendChild(copy);
      body.appendChild(keys);
      body.appendChild(note);
      actions.appendChild(button(t('tutorialNext'), 'tutorial-primary', () => go(2)));
      actions.appendChild(button(t('tutorialSkip'), 'secondary', endLesson));
    } else if (id === 'rhythm') {
      title.textContent = t('tutorialRhythmTitle');
      const copy = document.createElement('p');
      copy.textContent = t('tutorialRhythmBody');
      const samples = document.createElement('div');
      samples.className = 'tutorial-samples';
      samples.innerHTML =
        '<p class="tutorial-sample is-perfect">' + t('tutorialPerfectBody') + '</p>' +
        '<p class="tutorial-sample is-good">' + t('tutorialGoodBody') + '</p>' +
        '<p class="tutorial-sample is-miss">' + t('tutorialMissBody') + '</p>';
      body.appendChild(copy);
      body.appendChild(samples);
      actions.appendChild(button(t('tutorialNext'), 'tutorial-primary', () => go(3)));
      actions.appendChild(button(t('tutorialSkip'), 'secondary', endLesson));
    } else if (id === 'practice' || id === 'real') {
      title.textContent = practiceText().title;
      renderPractice();
    } else {
      title.textContent = t('tutorialDoneTitle');
      const copy = document.createElement('p');
      copy.textContent = t('tutorialDoneBody');
      body.appendChild(copy);
      actions.appendChild(button(t('tutorialStartGame'), 'tutorial-primary', endLesson));
    }

    const primary = actions.querySelector('.tutorial-primary');
    if (primary) primary.focus();
  }

  function openTutorial(index) {
    const settings = document.getElementById('settings-panel');
    if (settings) settings.classList.add('hidden');
    open = true;
    overlay.classList.add('active');
    go(index || 0);
  }

  overlay.addEventListener('click', (event) => {
    if (!open || !isPracticeStep()) return;
    if (event.target.closest('button')) return;
    practicePress(performance.now());
  });

  window.addEventListener('keydown', (event) => {
    if (!open || !isPracticeStep()) return;
    if (event.target && event.target.closest && event.target.closest('button')) return;
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    if (event.repeat) return;
    event.preventDefault();
    practicePress(performance.now());
  }, true);

  if (replayBtn) {
    replayBtn.addEventListener('click', () => openTutorial(0));
  }

  if (CPRHero.i18n && CPRHero.i18n.onChange) {
    CPRHero.i18n.onChange(() => {
      if (!open) return;
      if (isPracticeStep()) refreshPracticeCopy();
      else render();
    });
  }

  CPRHero.tutorial = {
    isOpen: function () { return open; },
    needsLesson: function () { return !isDone(); },
    open: function () { openTutorial(0); }
  };
})();
