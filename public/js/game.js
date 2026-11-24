(function () {

    let TRIVIA_BANK = [];
    let NARRATIVE_BEATS = [];
    let call911Prompt = 'Tap to call 911!';


    // ============================================================
    // CPR HERO — PHASE 1: FRONTEND GAME ENGINE
    // ============================================================
    // This file is SELF-CONTAINED. No Node.js server is required yet.
    // Phase 2 will connect the placeholder API functions at the bottom.
    // ============================================================

    // --- CANVAS SETUP ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const CW = canvas.width;   // 800 pixels wide
    const CH = canvas.height;  // 600 pixels tall
    let canvasDisplayScale = 1;

    function measureCanvasScale() {
      const rect = canvas.getBoundingClientRect();
      canvasDisplayScale = rect.width > 0 ? rect.width / CW : 1;
    }

    function syncVisualViewport() {
      const vv = window.visualViewport;
      const height = vv ? vv.height : window.innerHeight;
      const offset = vv ? vv.offsetTop : 0;
      const root = document.documentElement;
      root.style.setProperty('--app-height', Math.round(height) + 'px');
      root.style.setProperty('--app-offset', Math.round(offset) + 'px');
      measureCanvasScale();
    }

    syncVisualViewport();
    window.addEventListener('resize', syncVisualViewport);
    window.addEventListener('orientationchange', syncVisualViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncVisualViewport);
      window.visualViewport.addEventListener('scroll', syncVisualViewport);
    }
    if (window.ResizeObserver) {
      new ResizeObserver(measureCanvasScale).observe(canvas);
    }

    // --- DOM REFERENCES (HTML elements we control with JavaScript) ---
    const overlays = {
      start: document.getElementById('start-overlay'),
      narrative: document.getElementById('narrative-overlay'),
      trivia: document.getElementById('trivia-overlay'),
      win: document.getElementById('win-overlay'),
      gameover: document.getElementById('gameover-overlay'),
      results: document.getElementById('results-overlay'),
      scenario: document.getElementById('scenario-overlay'),
      scenarioResults: document.getElementById('scenario-results-overlay')
    };

    const playerNameInput = document.getElementById('player-name');
    const startBtn = document.getElementById('start-btn');
    const scenarioBtn = document.getElementById('scenario-btn');
    const scenarioStepLabel = document.getElementById('scenario-step-label');
    const scenarioOptions = document.getElementById('scenario-options');
    const scenarioXp = document.getElementById('scenario-xp');
    const scenarioProgress = document.getElementById('scenario-progress');
    const scenarioContinueBtn = document.getElementById('scenario-continue-btn');
    const scenarioRestartBtn = document.getElementById('scenario-restart-btn');
    const scenarioHintBtn = document.getElementById('scenario-hint-btn');
    const scenarioLogBtn = document.getElementById('scenario-log-btn');
    const scenarioExitBtn = document.getElementById('scenario-exit-btn');
    const scenarioExitConfirm = document.getElementById('scenario-exit-confirm');
    const scenarioExitYes = document.getElementById('scenario-exit-yes');
    const scenarioExitNo = document.getElementById('scenario-exit-no');
    const gameExitConfirm = document.getElementById('game-exit-confirm');
    const gameExitYes = document.getElementById('game-exit-yes');
    const gameExitNo = document.getElementById('game-exit-no');
    const scenarioLog = document.getElementById('scenario-log');
    const scenarioPortrait = document.getElementById('scenario-portrait');
    const scenarioPortraitArt = document.getElementById('scenario-portrait-art');
    const scenarioSpeaker = document.getElementById('scenario-speaker');
    const scenarioLine = document.getElementById('scenario-line');
    const scenarioDialog = document.getElementById('scenario-dialog');
    const scenarioOverlay = document.getElementById('scenario-overlay');
    const scenarioReport = document.getElementById('scenario-report');
    const scenarioPlayAgainBtn = document.getElementById('scenario-playagain-btn');
    const scenarioMenuBtn = document.getElementById('scenario-menu-btn');
    const narrativeText = document.getElementById('narrative-text');
    const narrativeBtn = document.getElementById('narrative-btn');
    const call911Btn = document.getElementById('call911-btn');
    const countdownAnnounce = document.getElementById('countdown-announce');
    const triviaQuestion = document.getElementById('trivia-question');
    const triviaOptions = document.getElementById('trivia-options');
    const triviaLives = document.getElementById('trivia-lives');
    const triviaFeedback = document.getElementById('trivia-feedback');
    const triviaOverlay = document.getElementById('trivia-overlay');
    const scoreBreakdown = document.getElementById('score-breakdown');
    const retryBtn = document.getElementById('retry-btn');
    const leaderboardList = document.getElementById('leaderboard-list');
    const touchHint = document.getElementById('touch-hint');
    const compressBtn = document.getElementById('compress-btn');
    const timingLive = document.getElementById('timing-live');
    const tabGame = document.getElementById('tab-game');
    const tabBoard = document.getElementById('tab-board');
    const tabCoach = document.getElementById('tab-coach');
    const mobileCoachClose = document.getElementById('mobile-coach-close');
    const boardPlayBtn = document.getElementById('board-play-btn');

    // --- GAME CONSTANTS (tunable rules) ---
    const BPM = 110;
    const BEAT_INTERVAL = 60000 / BPM; // 545.45ms between beats
    const PERFECT_WINDOW = 65;       // ±65ms = PERFECT
    const GOOD_WINDOW = 130;         // ±130ms = GOOD
    const GAME_DURATION_MS = 150000; // 2:30 ambulance timer (30s / 25% longer)
    const MAX_LIVES = 3;
    const STREAK_MULTIPLIER_AT = 10; // 2x points after 10 perfect hits in a row

    const RING_MAX_RADIUS = 120;
    const RING_TARGET_RADIUS = 40;
    const CENTER_X = CW / 2;
    const CENTER_Y = CH / 2 + 30;

    // --- GAME STATES (the "chapters" of our game) ---
    const STATE = {
      START: 'START',
      NARRATIVE: 'NARRATIVE',
      COUNTDOWN: 'COUNTDOWN',
      PLAYING: 'PLAYING',
      TRIVIA: 'TRIVIA',
      WIN: 'WIN',
      GAME_OVER: 'GAME_OVER',
      RESULTS: 'RESULTS',
      SCENARIO: 'SCENARIO',
      SCENARIO_RESULTS: 'SCENARIO_RESULTS'
    };

    // --- LIVE GAME VARIABLES (change during play) ---
    let state = STATE.START;
    let runId = 0;
    let playerName = '';
    let narrativeIndex = 0;
    let countdownValue = 3;
    let countdownStamp = 0;

    let remainingMs = GAME_DURATION_MS;
    let oxygen = 100;
    let lives = MAX_LIVES;
    let streak = 0;

    let perfectCompressions = 0;
    let goodCompressions = 0;
    let misses = 0;
    let correctTrivia = 0;
    let compressionPoints = 0;
    let streakMultiplierPerfects = 0;

    // Rhythm engine variables
    let beatStartTime = 0;
    let currentBeatIndex = 0;
    let beatInputHandled = false;
    let prehandledBeat = -1;
    let consecutiveMisses = 0;
    let ringProgress = 0;
    let beatPulse = 0;
    let lastHitFeedback = { text: '', color: '', time: 0 };

    // Interval-rate wisps. Separate from the metronome hit streak that scores points.
    let timingTrack = { lastAt: null, samples: [], combo: 0, bestCombo: 0 };
    let vaporWisps = [];
    const VAPOR_LIFE = 1100;

    // Trivia tracking
    let usedTriviaIndices = [];
    let currentTriviaIndex = -1;
    let triviaAnimating = false;

    // Win animation
    let winAnimStart = 0;

    let scenarioEngine = null;
    let scenarioScene = 'street-traffic';
    let scenarioPulse = 0;
    let scenarioQueue = [];
    let scenarioAfterQueue = 'choices';
    let scenarioTypeTimer = 0;
    let scenarioFullText = '';
    let scenarioTyped = 0;
    let scenarioTalking = false;
    let scenarioSpeakerId = 'narrator';
    let scenarioMusicOn = false;
    let scenarioMusicTimer = 0;
    let scenarioMusicStep = 0;

    // Phase 1 local leaderboard (temporary until Phase 2 backend)

    // Detect touch devices for control hints
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function tr(key) {
      return (window.CPRHero && CPRHero.i18n && CPRHero.i18n.t(key)) || key;
    }

    function uiFont(px) {
      if (CPRHero.i18n && CPRHero.i18n.lang() === 'ko') {
        return Math.round(px * 1.45) + 'px "Jua", sans-serif';
      }
      return px + 'px "Press Start 2P", monospace';
    }

    function speakerName(name) {
      const key = {
        NARRATOR: 'narrator',
        'COACH PULSE': 'coachPulse',
        DISPATCH: 'dispatch',
        YOU: 'you',
        PATIENT: 'patient',
        AED: 'aed'
      }[(name || '').toUpperCase()];
      return key ? tr(key) : name;
    }

    function updateCompressLabel() {
      compressBtn.textContent = isTouchDevice ? tr('compressTap') : tr('compressSpace');
    }

    updateCompressLabel();

    let lastReport = null;
    let lastBoardEntries = null;
    let boardFailed = false;
    let loadToken = 0;

    function showMobileScreen(screen) {
      document.body.classList.toggle('mobile-coach', screen === 'coach');
      document.body.classList.toggle('mobile-board', screen === 'board');
      tabGame.classList.toggle('active', screen === 'game');
      tabBoard.classList.toggle('active', screen === 'board');
      tabCoach.classList.toggle('active', screen === 'coach');
      tabGame.setAttribute('aria-selected', String(screen === 'game'));
      tabBoard.setAttribute('aria-selected', String(screen === 'board'));
      tabCoach.setAttribute('aria-selected', String(screen === 'coach'));
      if (screen === 'board') {
        fetchGlobalLeaderboard().then(renderLeaderboard).catch(() => {});
      }
      requestAnimationFrame(syncVisualViewport);
    }

    tabGame.addEventListener('click', () => showMobileScreen('game'));
    tabBoard.addEventListener('click', () => showMobileScreen('board'));
    tabCoach.addEventListener('click', () => showMobileScreen('coach'));
    boardPlayBtn.addEventListener('click', () => showMobileScreen('game'));
    mobileCoachClose.addEventListener('click', () => showMobileScreen('game'));

    const assistantInput = document.getElementById('assistant-input');
    if (assistantInput) {
      assistantInput.addEventListener('focus', () => {
        setTimeout(syncVisualViewport, 60);
        setTimeout(() => assistantInput.scrollIntoView({ block: 'nearest' }), 280);
      });
    }

    // --- SIMPLE WEB AUDIO BEEPS (no external sound files in Phase 1) ---
    let audioCtx = null;

    function initAudio() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    function soundMuted() {
      return window.CPRHero && CPRHero.i18n && CPRHero.i18n.muted && CPRHero.i18n.muted();
    }

    function syncSound() {
      if (!audioCtx) return;
      if (soundMuted()) {
        if (audioCtx.state === 'running') audioCtx.suspend();
      } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function playTone(freq, duration, type = 'square', volume = 0.07) {
      if (soundMuted()) return;
      initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.stop(audioCtx.currentTime + duration);
    }

    function playTimingCue(judgment) {
      if (judgment === 'perfect') playTone(988, 0.06, 'square', 0.035);
      else if (judgment === 'fast') playTone(146, 0.08, 'square', 0.04);
      else if (judgment === 'slow') playTone(220, 0.1, 'triangle', 0.045);
    }

    // --- OVERLAY HELPERS ---
    function showOverlay(name) {
      Object.values(overlays).forEach(o => o.classList.remove('active'));
      if (overlays[name]) overlays[name].classList.add('active');
    }

    function hideAllOverlays() {
      Object.values(overlays).forEach(o => o.classList.remove('active'));
    }

    // --- SCORE MATH ---
    function calculateFinalScore(timeBonusSeconds) {
      // Rhythm combo is on-screen coaching only. It is not added here.
      return compressionPoints + (correctTrivia * 50) + (timeBonusSeconds * 5);
    }

    function getPerfectPoints() {
      // Streak multiplier: 2x points once streak reaches 10+
      return streak >= STREAK_MULTIPLIER_AT ? 20 : 10;
    }

    async function submitFinalScore(name, score) {
      return CPRHero.leaderboard.submit(name, score);
    }

    async function fetchGlobalLeaderboard() {
      return CPRHero.leaderboard.fetch();
    }

    function renderLeaderboard(entries) {
      boardFailed = false;
      lastBoardEntries = entries;
      CPRHero.leaderboard.render(entries, leaderboardList, {
        empty: tr('noScores'),
        pts: tr('pts')
      });
    }

    function showOfflineLeaderboard() {
      boardFailed = true;
      lastBoardEntries = null;
      leaderboardList.innerHTML = '<li class="board-empty"><span class="board-name">' + escapeHtml(tr('leaderboardOffline')) + '</span></li>';
    }

    function escapeHtml(str) {
      return CPRHero.leaderboard.escapeHtml(str);
    }

    // --- STATE MACHINE ---
    function tutorialBlocking() {
      return !!(window.CPRHero && CPRHero.tutorial && CPRHero.tutorial.isOpen && CPRHero.tutorial.isOpen());
    }

    function isMainGameState(gameState) {
      return gameState === STATE.NARRATIVE
        || gameState === STATE.COUNTDOWN
        || gameState === STATE.PLAYING
        || gameState === STATE.TRIVIA
        || gameState === STATE.WIN
        || gameState === STATE.GAME_OVER
        || gameState === STATE.RESULTS;
    }

    function leaveToMainScreen() {
      runId += 1;
      triviaAnimating = false;
      gameExitConfirm.classList.add('hidden');
      scenarioExitConfirm.classList.add('hidden');
      stopScenarioMusic();
      setState(STATE.START);
    }

    let tutorialThenCountdown = false;

    window.addEventListener('cprhero-tutorial-closed', () => {
      if (!tutorialThenCountdown) return;
      tutorialThenCountdown = false;
      setState(STATE.COUNTDOWN);
    });

    function setState(newState) {
      state = newState;
      document.body.classList.toggle('in-scenario', newState === STATE.SCENARIO);
      document.body.classList.toggle('in-game', isMainGameState(newState));
      if (!isMainGameState(newState)) gameExitConfirm.classList.add('hidden');

      switch (newState) {
        case STATE.START:
          stopScenarioMusic();
          showOverlay('start');
          break;
        case STATE.NARRATIVE:
          narrativeIndex = 0;
          showNarrativeBeat();
          break;
        case STATE.COUNTDOWN:
          countdownValue = 3;
          countdownStamp = performance.now();
          countdownAnnounce.textContent = '3';
          hideAllOverlays();
          playTone(392, 0.15, 'square', 0.09);
          break;
        case STATE.PLAYING:
          hideAllOverlays();
          initPlaying();
          break;
        case STATE.TRIVIA:
          showOverlay('trivia');
          showTriviaQuestion();
          break;
        case STATE.WIN:
          showOverlay('win');
          winAnimStart = performance.now();
          scheduleRun(() => endGame(true), 2200);
          break;
        case STATE.GAME_OVER:
          showOverlay('gameover');
          scheduleRun(() => endGame(false), 1800);
          break;
        case STATE.RESULTS:
          showOverlay('results');
          break;
        case STATE.SCENARIO:
          showOverlay('scenario');
          break;
        case STATE.SCENARIO_RESULTS:
          showOverlay('scenarioResults');
          break;
      }

      if (window.CoachPulse) CoachPulse.onGameState(newState);
      updateCompressControls();
    }

    function resetGame() {
      remainingMs = GAME_DURATION_MS;
      oxygen = 100;
      lives = MAX_LIVES;
      streak = 0;
      perfectCompressions = 0;
      goodCompressions = 0;
      misses = 0;
      correctTrivia = 0;
      compressionPoints = 0;
      streakMultiplierPerfects = 0;
      currentBeatIndex = 0;
      beatInputHandled = false;
      prehandledBeat = -1;
      consecutiveMisses = 0;
      ringProgress = 0;
      beatPulse = 0;
      CPRHero.trivia.reset();
      usedTriviaIndices = CPRHero.trivia.usedIndices;
      currentTriviaIndex = -1;
      narrativeIndex = 0;
      lastHitFeedback = { text: '', color: '', time: 0 };
      resetTimingIndicator();
    }

    // --- INTRO STORY ---
    function showNarrativeBeat() {
      showOverlay('narrative');

      if (narrativeIndex < NARRATIVE_BEATS.length) {
        narrativeText.textContent = NARRATIVE_BEATS[narrativeIndex];
        narrativeBtn.classList.remove('hidden');
        call911Btn.classList.add('hidden');
      } else {
        narrativeText.textContent = call911Prompt;
        narrativeBtn.classList.add('hidden');
        call911Btn.classList.remove('hidden');
      }
    }

    function advanceNarrative() {
      narrativeIndex++;
      showNarrativeBeat();
      if (window.CoachPulse) CoachPulse.onNarrativeStep(narrativeIndex);
    }

    function isTypingInTextField() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    }

    function updateCompressControls() {
      const playing = state === STATE.PLAYING;
      compressBtn.classList.toggle('visible', playing);
      touchHint.style.display = (isTouchDevice && playing) ? 'block' : 'none';
      if (playing) {
        canvas.focus({ preventScroll: true });
      }
    }

    // --- RHYTHM ENGINE ---
    function initPlaying() {
      beatStartTime = performance.now();
      currentBeatIndex = 0;
      beatInputHandled = false;
      prehandledBeat = -1;
      consecutiveMisses = 0;
      ringProgress = 0;
      armTimingWindow();
      updateCompressControls();
      canvas.focus({ preventScroll: true });
    }

    function getExpectedBeatTime(beatIndex) {
      return CPRHero.rhythm.getExpectedBeatTime(beatStartTime, beatIndex, BEAT_INTERVAL);
    }

    function evaluateInput(inputTime) {
      const resolved = CPRHero.rhythm.resolveTap({
        inputTime: inputTime,
        beatStartTime: beatStartTime,
        beatIndex: currentBeatIndex,
        beatHandled: beatInputHandled,
        prehandledBeat: prehandledBeat,
        interval: BEAT_INTERVAL,
        perfectWindow: PERFECT_WINDOW,
        goodWindow: GOOD_WINDOW
      });
      if (!resolved) return;

      applyHitResult(resolved.tier);
      if (resolved.beatIndex === currentBeatIndex) {
        beatInputHandled = true;
      } else {
        prehandledBeat = resolved.beatIndex;
      }
    }

    function applyHitResult(tier) {
      const now = performance.now();
      const outcome = CPRHero.rhythm.applyCompressionOutcome(oxygen, tier, consecutiveMisses);
      oxygen = outcome.oxygen;
      consecutiveMisses = outcome.consecutiveMisses;

      if (tier === 'PERFECT') {
        perfectCompressions++;
        streak++;

        const pts = getPerfectPoints();
        if (streak >= STREAK_MULTIPLIER_AT) streakMultiplierPerfects++;
        compressionPoints += pts;

        lastHitFeedback = {
          text: streak >= STREAK_MULTIPLIER_AT ? tr('perfect2x') : tr('perfect'),
          color: '#4ecca3',
          time: now
        };

        if (streak === STREAK_MULTIPLIER_AT) {
          lastHitFeedback = { text: tr('streak2x'), color: '#f5c518', time: now };
        }

        playTone(660, 0.1, 'square', 0.08);
      }

      if (tier === 'GOOD') {
        goodCompressions++;
        streak = 0;
        lastHitFeedback = { text: tr('good'), color: '#f5c518', time: now };
        playTone(440, 0.08, 'triangle', 0.06);
      }

      if (tier === 'MISS') {
        misses++;
        streak = 0;
        lastHitFeedback = { text: tr('miss'), color: '#ff4444', time: now };
        playTone(110, 0.14, 'sawtooth', 0.07);
      }

      if (oxygen <= 0 && state === STATE.PLAYING) {
        triggerTrivia();
      }
    }

    function checkMissedBeats(now) {
      if (state !== STATE.PLAYING) return;

      const expected = getExpectedBeatTime(currentBeatIndex);
      const deadline = expected + GOOD_WINDOW;

      // If player never tapped before deadline, auto-count as MISS
      if (!beatInputHandled && now > deadline) {
        applyHitResult('MISS');
        beatInputHandled = true;
      }

      // Move to next beat when its time arrives
      const nextBeatTime = getExpectedBeatTime(currentBeatIndex + 1);
      if (now >= nextBeatTime) {
        currentBeatIndex++;
        beatInputHandled = prehandledBeat === currentBeatIndex;
        if (beatInputHandled) prehandledBeat = -1;
        beatPulse = 1;
        playTone(220, 0.05, 'square', 0.04);
      }

      const beatTime = getExpectedBeatTime(currentBeatIndex);
      ringProgress = CPRHero.rhythm.nextRingProgress(now, beatTime, BEAT_INTERVAL);
      beatPulse = Math.max(0, beatPulse - 0.08);
    }

    // --- COMPRESSION-RATE WISPS (same presses as scoring) ---
    function spawnVapor(judgment, now) {
      const copy = {
        perfect: { text: tr('perfect'), color: '#c8ffe9' },
        fast: { text: tr('tooFast'), color: '#ffc1c1' },
        slow: { text: tr('tooSlow'), color: '#ffe3ad' }
      }[judgment];
      if (!copy) return;
      vaporWisps.push({
        text: copy.text,
        color: copy.color,
        born: now,
        drift: (Math.random() - 0.5) * 14
      });
      if (vaporWisps.length > 5) vaporWisps.shift();
      if (timingLive) timingLive.textContent = copy.text;
    }

    function drawVaporWisps(now) {
      if (!vaporWisps.length) return;
      const keep = [];
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = uiFont(8);

      for (let i = 0; i < vaporWisps.length; i++) {
        const wisp = vaporWisps[i];
        const age = (now - wisp.born) / VAPOR_LIFE;
        if (age >= 1) continue;
        keep.push(wisp);

        const rise = age * 58;
        const fadeIn = age < 0.1 ? age / 0.1 : 1;
        const fadeOut = Math.pow(1 - age, 1.65);
        const alpha = fadeIn * fadeOut;
        const sway = Math.sin(age * Math.PI) * wisp.drift * age;
        const pop = age < 0.14 ? 0.65 + (age / 0.14) * 0.35 : 1;
        const x = CENTER_X + sway;
        const y = CENTER_Y - 10 - rise;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pop, pop);
        ctx.globalAlpha = alpha * 0.28;
        ctx.fillStyle = wisp.color;
        ctx.fillText(wisp.text, 0, -6);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#12060e';
        ctx.fillText(wisp.text, 1, 1);
        ctx.fillStyle = wisp.color;
        ctx.fillText(wisp.text, 0, 0);
        ctx.globalAlpha = alpha * 0.45;
        for (let s = 0; s < 3; s++) {
          const sx = Math.sin(age * 7 + s * 1.7) * (5 + s * 3);
          const sy = -8 - age * 22 - s * 5;
          ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.restore();
      }

      vaporWisps = keep;
      ctx.restore();
    }

    function resetTimingIndicator() {
      timingTrack = { lastAt: null, samples: [], combo: 0, bestCombo: 0 };
      vaporWisps = [];
      if (timingLive) timingLive.textContent = '';
    }

    function armTimingWindow() {
      timingTrack.lastAt = null;
      timingTrack.samples = [];
    }

    function noteCompressionTiming(now) {
      if (!CPRHero.rhythm || !CPRHero.rhythm.recordCompression) return;
      const next = CPRHero.rhythm.recordCompression(timingTrack, now);
      timingTrack = {
        lastAt: next.lastAt,
        samples: next.samples,
        combo: next.combo,
        bestCombo: next.bestCombo
      };
      if (next.judgment === 'first') return;
      spawnVapor(next.judgment, now);
      playTimingCue(next.judgment);
    }

    // --- TRIVIA SAFETY NET ---
    function triggerTrivia() {
      lives--;

      if (lives <= 0) {
        setState(STATE.GAME_OVER);
        return;
      }

      setState(STATE.TRIVIA);
    }

    function getRandomTriviaIndex() {
      return CPRHero.trivia.nextIndex();
    }

    function clearTriviaFeedback() {
      triviaFeedback.className = '';
      triviaFeedback.innerHTML = '';
      triviaOverlay.classList.remove('flash-correct', 'flash-wrong');
    }

    function playTriviaCorrectSound() {
      playTone(523, 0.12, 'square', 0.09);
      setTimeout(() => playTone(784, 0.15, 'square', 0.09), 120);
    }

    function playTriviaWrongSound() {
      playTone(180, 0.2, 'sawtooth', 0.09);
      setTimeout(() => playTone(120, 0.25, 'sawtooth', 0.08), 150);
    }

    function showTriviaQuestion() {
      triviaAnimating = false;
      clearTriviaFeedback();

      currentTriviaIndex = getRandomTriviaIndex();
      CPRHero.trivia.currentIndex = currentTriviaIndex;
      fillTriviaOptions(CPRHero.trivia.currentQuestion());
    }

    function fillTriviaOptions(q) {
      if (!q) return;
      triviaQuestion.textContent = q.question;
      triviaLives.innerHTML = formatLivesHtml();
      triviaOptions.innerHTML = '';

      q.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'retro-btn secondary';
        btn.textContent = option;
        btn.addEventListener('click', () => handleTriviaAnswer(index, btn));
        triviaOptions.appendChild(btn);
      });
    }

    function scheduleRun(fn, delay) {
      const stamp = runId;
      setTimeout(() => {
        if (stamp !== runId) return;
        fn();
      }, delay);
    }

    function showTriviaResultAnimation(isCorrect, onComplete) {
      triviaAnimating = true;
      clearTriviaFeedback();

      triviaFeedback.innerHTML = isCorrect
        ? '<span class="feedback-icon">✓</span><span>' + escapeHtml(tr('triviaCorrectFx')) + '</span>'
        : '<span class="feedback-icon">✗</span><span>' + escapeHtml(tr('triviaWrongFx')) + '</span>';

      triviaFeedback.className = isCorrect ? 'show-correct' : 'show-wrong';
      triviaOverlay.classList.add(isCorrect ? 'flash-correct' : 'flash-wrong');

      if (isCorrect) playTriviaCorrectSound();
      else playTriviaWrongSound();

      scheduleRun(() => {
        triviaAnimating = false;
        onComplete();
      }, isCorrect ? 1400 : 1600);
    }

    function handleTriviaAnswer(selectedIndex, clickedBtn) {
      if (triviaAnimating) return;

      CPRHero.trivia.currentIndex = currentTriviaIndex;
      const q = CPRHero.trivia.currentQuestion();
      const isCorrect = selectedIndex === q.correct;
      const buttons = triviaOptions.querySelectorAll('button');

      buttons.forEach(btn => { btn.disabled = true; });

      if (isCorrect) {
        clickedBtn.classList.add('trivia-btn-correct');
        showTriviaResultAnimation(true, () => {
          correctTrivia++;
          oxygen = 80;
          if (window.CoachPulse) CoachPulse.notifyTriviaResult(true);
          hideAllOverlays();
          state = STATE.PLAYING;
          initPlaying();
        });
        return;
      }

      clickedBtn.classList.add('trivia-btn-wrong');
      buttons[q.correct].classList.add('trivia-btn-reveal');

      showTriviaResultAnimation(false, () => {
        lives--;
        if (window.CoachPulse) CoachPulse.notifyTriviaResult(false);
        if (lives <= 0) {
          setState(STATE.GAME_OVER);
        } else {
          showTriviaQuestion();
        }
      });
    }

    // --- END GAME + SCORE SUBMISSION ---
    async function endGame(didWin) {
      const timeBonus = didWin ? Math.floor(remainingMs / 1000) : 0;
      const finalScore = calculateFinalScore(timeBonus);
      const bestRhythmCombo = timingTrack.bestCombo;

      const analytics = {
        perfectCompressions,
        goodCompressions,
        misses,
        correctTrivia,
        timeBonus,
        streakMultiplierPerfects
      };

      try {
        await submitFinalScore(playerName, finalScore, analytics);
        renderLeaderboard(await fetchGlobalLeaderboard());
      } catch (err) {
        console.error('Leaderboard save failed:', err);
      }

      lastReport = {
        playerName: playerName,
        finalScore: finalScore,
        perfectCompressions: perfectCompressions,
        goodCompressions: goodCompressions,
        misses: misses,
        correctTrivia: correctTrivia,
        streakMultiplierPerfects: streakMultiplierPerfects,
        bestRhythmCombo: bestRhythmCombo,
        timeBonus: timeBonus,
        didWin: didWin
      };
      paintScoreReport(lastReport);

      setState(STATE.RESULTS);
    }

    function paintScoreReport(report) {
      scoreBreakdown.innerHTML = `
        <p>${tr('hero')}: ${escapeHtml(report.playerName)}</p>
        <p>${tr('finalScore')}: ${report.finalScore}</p>
        <p>${tr('perfectStat')}: ${report.perfectCompressions}</p>
        <p>${tr('goodStat')}: ${report.goodCompressions}</p>
        <p>${tr('misses')}: ${report.misses}</p>
        <p>${tr('triviaSaves')}: ${report.correctTrivia} (x50)</p>
        <p>${tr('multiplierPerfects')}: ${report.streakMultiplierPerfects}</p>
        <p>${tr('bestCombo')}: ${report.bestRhythmCombo}</p>
        <p>${tr('timeBonus')}: ${report.timeBonus}s (x5)</p>
        <p>${report.didWin ? tr('statusRescued') : tr('statusOver')}</p>
      `;
    }

    // --- INPUT: SPACEBAR (PC) + TAP (MOBILE) + COMPRESS BUTTON ---
    function handleCompress() {
      if (tutorialBlocking()) return;
      if (state !== STATE.PLAYING) return;
      initAudio();
      const now = performance.now();
      evaluateInput(now);
      noteCompressionTiming(now);
    }

    function handleGameplayKey(e) {
      if (state !== STATE.PLAYING) return false;
      if (e.code !== 'Space' && e.code !== 'Enter') return false;
      if (e.repeat) return false;

      e.preventDefault();
      handleCompress();
      return true;
    }

    // Capture phase: space works for CPR even when chat input was focused
    window.addEventListener('keydown', (e) => {
      if (CPRHero.i18n && CPRHero.i18n.settingsOpen && CPRHero.i18n.settingsOpen()) return;
      if (tutorialBlocking()) return;

      if (state === STATE.SCENARIO && (e.code === 'Space' || e.code === 'Enter')) {
        if (isTypingInTextField()) return;
        e.preventDefault();
        advanceScenarioDialogue();
        return;
      }

      if (state === STATE.COUNTDOWN && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        return;
      }

      if (handleGameplayKey(e)) return;

      // Outside gameplay, allow normal space typing in text fields
      if (e.code === 'Space' && isTypingInTextField()) return;
    }, true);

    compressBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleCompress();
    });

    canvas.addEventListener('touchstart', (e) => {
      if (state === STATE.SCENARIO) {
        e.preventDefault();
        advanceScenarioDialogue();
        return;
      }
      e.preventDefault();
      handleCompress();
    }, { passive: false });

    canvas.addEventListener('click', () => {
      if (state === STATE.SCENARIO) {
        advanceScenarioDialogue();
        return;
      }
      if (isTouchDevice) return;
      handleCompress();
    });

    // --- BUTTON EVENTS ---
    startBtn.addEventListener('click', async () => {
      if (!requireHeroName()) return;
      initAudio();
      resetGame();
      renderLeaderboard(await fetchGlobalLeaderboard());
      setState(STATE.NARRATIVE);
    });

    narrativeBtn.addEventListener('click', advanceNarrative);
    call911Btn.addEventListener('click', () => {
      initAudio();
      const lesson = window.CPRHero && CPRHero.tutorial;
      if (lesson && lesson.open && !lesson.isOpen()) {
        tutorialThenCountdown = true;
        hideAllOverlays();
        lesson.open();
        return;
      }
      setState(STATE.COUNTDOWN);
    });

    retryBtn.addEventListener('click', async () => {
      resetGame();
      playerNameInput.value = playerName;
      renderLeaderboard(await fetchGlobalLeaderboard());
      setState(STATE.START);
    });

    function requireHeroName() {
      const name = playerNameInput.value.trim();
      if (!name) {
        playerNameInput.focus();
        return false;
      }
      playerName = name;
      return true;
    }

    function updateScenarioHud(snap) {
      scenarioXp.textContent = tr('xp') + ' ' + snap.xp;
      scenarioProgress.textContent = snap.node
        ? tr('step') + ' ' + snap.node.step + ' / ' + snap.totalSteps
        : tr('done');
      scenarioStepLabel.textContent = snap.node ? snap.node.title : tr('complete');
    }

    function portraitFace(speaker) {
      const name = (speaker || '').toUpperCase();
      if (name === 'YOU' || name === playerName.toUpperCase()) return 'hero';
      if (name === 'RICK') return 'rick';
      if (name === 'MAYA') return 'maya';
      if (name === 'COACH PULSE' || name === 'COACH') return 'coach';
      if (name === 'DISPATCH') return 'dispatch';
      if (name === 'AED') return 'aed';
      if (name === 'PATIENT') return 'patient';
      return 'narrator';
    }

    function showScenarioLine(line) {
      const speaker = line.speaker === 'YOU'
        ? (playerName.toUpperCase() || tr('you'))
        : speakerName(line.speaker || 'NARRATOR');
      scenarioSpeaker.textContent = speaker;
      scenarioSpeakerId = portraitFace(line.speaker);
      scenarioPortrait.dataset.face = scenarioSpeakerId;
      scenarioPortrait.classList.add('talking');
      scenarioTalking = true;
      scenarioFullText = line.text || '';
      scenarioTyped = 0;
      scenarioLine.textContent = '';
      scenarioTypeTimer = 0;
      if (scenarioEngine) scenarioEngine.logLine(line, line.kind || 'line');
      if (line.speaker === 'COACH PULSE' && window.CoachPulse) {
        CoachPulse.speakScenario(line.text);
      }
    }

    function finishScenarioType() {
      scenarioTyped = scenarioFullText.length;
      scenarioLine.textContent = scenarioFullText;
      scenarioTalking = false;
      scenarioPortrait.classList.remove('talking');
    }

    function tickScenarioTypewriter(dt) {
      if (state !== STATE.SCENARIO) return;
      if (scenarioTyped >= scenarioFullText.length) {
        scenarioTalking = false;
        scenarioPortrait.classList.remove('talking');
        return;
      }
      scenarioTypeTimer += dt;
      while (scenarioTypeTimer >= 16 && scenarioTyped < scenarioFullText.length) {
        scenarioTypeTimer -= 16;
        scenarioTyped += 1;
        scenarioLine.textContent = scenarioFullText.slice(0, scenarioTyped);
        if (scenarioTyped % 2 === 0) playTone(520, 0.03, 'square', 0.02);
      }
    }

    function renderScenarioLog(history) {
      if (!history || !history.length) {
        scenarioLog.innerHTML = '<p>' + escapeHtml(tr('noLines')) + '</p>';
        return;
      }
      scenarioLog.innerHTML = history.map((entry) => {
        const cls = entry.speaker === 'YOU' ? 'log-you'
          : entry.speaker === 'COACH PULSE' ? 'log-coach'
          : entry.speaker === 'DISPATCH' ? 'log-dispatch'
          : entry.result === 'unsafe' ? 'log-unsafe' : '';
        const shownSpeaker = entry.speaker === 'YOU'
          ? (playerName.toUpperCase() || tr('you'))
          : speakerName(entry.speaker);
        return '<p class="' + cls + '"><strong>' + escapeHtml(shownSpeaker) + ':</strong> ' + escapeHtml(entry.text) + '</p>';
      }).join('');
      scenarioLog.scrollTop = scenarioLog.scrollHeight;
    }

    function hideScenarioChoices() {
      scenarioOptions.classList.add('hidden');
      scenarioOptions.innerHTML = '';
      scenarioContinueBtn.disabled = false;
    }

    function showScenarioChoices(options) {
      scenarioOptions.classList.remove('hidden');
      scenarioOptions.innerHTML = '';
      scenarioContinueBtn.disabled = true;
      (options || []).forEach((option) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'retro-btn';
        btn.textContent = option.label;
        btn.dataset.optionId = option.id;
        btn.addEventListener('click', () => onScenarioChoice(option.id));
        scenarioOptions.appendChild(btn);
      });
    }

    function playScenarioQueue(lines, after) {
      scenarioQueue = (lines || []).slice();
      scenarioAfterQueue = after;
      hideScenarioChoices();
      scenarioDialog.className = '';
      if (scenarioQueue.length) {
        showScenarioLine(scenarioQueue.shift());
      } else {
        finishScenarioQueue();
      }
    }

    function finishScenarioQueue() {
      finishScenarioType();
      if (scenarioAfterQueue === 'choices') {
        const snap = scenarioEngine.snapshot();
        showScenarioChoices(snap.options);
      } else if (scenarioAfterQueue === 'advance') {
        goScenarioNext();
      } else if (scenarioAfterQueue === 'retry') {
        const snap = scenarioEngine.snapshot();
        showScenarioChoices(snap.options);
      }
    }

    function advanceScenarioDialogue() {
      if (state !== STATE.SCENARIO) return;
      if (scenarioTyped < scenarioFullText.length) {
        finishScenarioType();
        return;
      }
      if (scenarioQueue.length) {
        showScenarioLine(scenarioQueue.shift());
        return;
      }
      if (!scenarioContinueBtn.disabled) {
        finishScenarioQueue();
      }
    }

    function renderScenarioNode(snap) {
      const node = snap.node;
      if (!node) return;
      scenarioScene = node.scene || 'street-traffic';
      scenarioDialog.className = '';
      updateScenarioHud(snap);
      renderScenarioLog(snap.history);
      if (node.kind === 'talk') {
        playScenarioQueue(snap.lines, 'advance');
        scenarioEngine.finishTalk();
      } else {
        playScenarioQueue(snap.lines, 'choices');
      }
    }

    function onScenarioChoice(optionId) {
      if (!scenarioEngine) return;
      const outcome = scenarioEngine.choose(optionId);
      if (outcome.error) return;

      const result = outcome.result;
      scenarioDialog.className = 'tone-' + (result === 'correct' ? 'correct' : result === 'unsafe' ? 'unsafe' : 'incorrect');
      updateScenarioHud(outcome.snapshot);
      renderScenarioLog(outcome.snapshot.history);
      scenarioPulse = 1;
      if (result === 'correct') playTone(660, 0.12, 'square', 0.08);
      else playTone(110, 0.16, 'sawtooth', 0.07);

      playScenarioQueue(outcome.reply || [], result === 'correct' ? 'advance' : 'retry');
    }

    function goScenarioNext() {
      if (!scenarioEngine) return;
      const result = scenarioEngine.nextStep();
      if (result.error) return;
      if (result.complete) {
        stopScenarioMusic();
        showScenarioResults(result.report);
        if (window.CoachPulse) CoachPulse.speakScenario(tr('scenarioCompleteCoach'));
        return;
      }
      if (result.snapshot) renderScenarioNode(result.snapshot);
    }

    function fillScenarioReport(report) {
      scenarioScene = report.scene || 'ambulance';
      const completedLines = report.completed.length
        ? report.completed.map((step) => step.title + (step.firstTry ? tr('cleanSuffix') : tr('retrySuffix'))).join(', ')
        : tr('none');
      const mistakeLines = report.mistakes.length
        ? report.mistakes.map((item) => '<p class="mistake">- ' + escapeHtml(item.title) + ': ' + escapeHtml(item.choice) + '</p>').join('')
        : '<p>' + escapeHtml(tr('noMistakes')) + '</p>';
      const learnLines = report.learningPoints.map((line) => '<p>- ' + escapeHtml(line) + '</p>').join('');
      const logPreview = (report.history || []).slice(-8).map((entry) => {
        const shownSpeaker = entry.speaker === 'YOU'
          ? (playerName.toUpperCase() || tr('you'))
          : speakerName(entry.speaker);
        return '<p><strong>' + escapeHtml(shownSpeaker) + ':</strong> ' + escapeHtml(entry.text) + '</p>';
      }).join('');

      scenarioReport.innerHTML =
        '<p>' + tr('hero') + ': ' + escapeHtml(playerName) + '</p>' +
        '<p>' + tr('xp') + ': ' + report.xp + ' / ' + report.maxXp + '</p>' +
        '<p>' + tr('stepsDone') + ': ' + escapeHtml(completedLines) + '</p>' +
        '<p>' + tr('mistakes') + ':</p>' + mistakeLines +
        '<p>' + tr('learningPoints') + ':</p>' + learnLines +
        '<p>' + tr('recentLog') + ':</p>' + logPreview +
        '<p>' + escapeHtml(tr('practiceNote')) + '</p>';
    }

    function showScenarioResults(report) {
      fillScenarioReport(report);
      setState(STATE.SCENARIO_RESULTS);
    }

    const SCENARIO_TUNE = [220, 277, 330, 277, 349, 330, 277, 220];

    function stopScenarioMusic() {
      scenarioMusicOn = false;
    }

    function tickScenarioMusic(dt) {
      if (!scenarioMusicOn || state !== STATE.SCENARIO) return;
      scenarioMusicTimer += dt;
      if (scenarioMusicTimer >= 280) {
        scenarioMusicTimer = 0;
        const freq = SCENARIO_TUNE[scenarioMusicStep % SCENARIO_TUNE.length];
        scenarioMusicStep += 1;
        playTone(freq, 0.12, 'square', 0.018);
      }
    }

    function beginScenario() {
      if (!scenarioEngine) return;
      initAudio();
      scenarioMusicOn = true;
      scenarioMusicStep = 0;
      scenarioLog.classList.add('hidden');
      scenarioExitConfirm.classList.add('hidden');
      const snap = scenarioEngine.start('unconscious-adult');
      if (!snap || !snap.node) return;
      renderScenarioNode(snap);
      setState(STATE.SCENARIO);
    }

    scenarioBtn.addEventListener('click', () => {
      if (!requireHeroName()) return;
      beginScenario();
    });

    scenarioContinueBtn.addEventListener('click', () => advanceScenarioDialogue());
    scenarioDialog.addEventListener('click', () => advanceScenarioDialogue());
    scenarioRestartBtn.addEventListener('click', () => beginScenario());
    scenarioPlayAgainBtn.addEventListener('click', () => beginScenario());
    scenarioMenuBtn.addEventListener('click', () => {
      stopScenarioMusic();
      setState(STATE.START);
    });

    scenarioExitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state === STATE.SCENARIO) {
        gameExitConfirm.classList.add('hidden');
        scenarioExitConfirm.classList.remove('hidden');
        return;
      }
      scenarioExitConfirm.classList.add('hidden');
      gameExitConfirm.classList.remove('hidden');
    });

    gameExitYes.addEventListener('click', (e) => {
      e.stopPropagation();
      leaveToMainScreen();
    });

    gameExitNo.addEventListener('click', (e) => {
      e.stopPropagation();
      gameExitConfirm.classList.add('hidden');
    });

    scenarioExitYes.addEventListener('click', (e) => {
      e.stopPropagation();
      leaveToMainScreen();
    });

    scenarioExitNo.addEventListener('click', (e) => {
      e.stopPropagation();
      scenarioExitConfirm.classList.add('hidden');
    });

    scenarioLogBtn.addEventListener('click', () => {
      scenarioLog.classList.toggle('hidden');
      if (!scenarioLog.classList.contains('hidden') && scenarioEngine) {
        renderScenarioLog(scenarioEngine.snapshot().history);
      }
    });

    scenarioHintBtn.addEventListener('click', () => {
      const node = scenarioEngine && scenarioEngine.currentNode();
      if (!node) return;
      const hintLine = { speaker: 'COACH PULSE', portrait: 'coach', text: node.hint || tr('scenarioHintFallback') };
      playScenarioQueue([hintLine].concat(scenarioQueue), scenarioAfterQueue);
      if (window.CoachPulse) {
        CoachPulse.explainScenarioHint(node.hint, node.hintQuestion);
      }
    });

    // --- DRAWING HELPERS (Canvas rendering) ---
    function drawPixelHeart(cx, cy, size, color) {
      const px = size / 7;
      const pixels = [
        [0,1,1,0,1,1,0],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1],
        [0,1,1,1,1,1,0],
        [0,0,1,1,1,0,0],
        [0,0,0,1,0,0,0]
      ];

      ctx.fillStyle = color;
      pixels.forEach((row, r) => {
        row.forEach((col, c) => {
          if (col) ctx.fillRect(cx - 3.5 * px + c * px, cy - 3 * px + r * px, px, px);
        });
      });
    }

    function drawOxygenBar() {
      const x = 40, y = 28, w = CW - 80, h = 18;
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y, w, h);

      const fillW = (oxygen / 100) * w;
      const color = oxygen > 60 ? '#4ecca3' : oxygen > 30 ? '#f5c518' : '#ff4444';
      ctx.fillStyle = color;
      ctx.fillRect(x, y, fillW, h);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#fff';
      ctx.font = uiFont(10);
      ctx.textAlign = 'left';
      ctx.fillText(tr('oxygen') + ': ' + Math.round(oxygen) + '%', x, y - 8);
    }

    function formatLivesHtml() {
      let html = '';
      for (let i = 0; i < MAX_LIVES; i++) {
        html += i < lives
          ? '<span>♥</span>'
          : '<span class="life-lost">♡</span>';
      }
      return html;
    }

    function drawLivesOnCanvas(x, y) {
      ctx.textAlign = 'left';
      ctx.font = uiFont(8);
      ctx.fillStyle = '#fff';
      ctx.fillText(tr('lives'), x, y);

      const heartY = y + 30;
      const heartSize = 26;
      const spacing = 32;

      for (let i = 0; i < MAX_LIVES; i++) {
        const hx = x + i * spacing;
        const filled = i < lives;
        drawLifeHeart(hx, heartY, heartSize, filled);
      }
    }

    function drawLifeHeart(cx, cy, size, filled) {
      const color = filled ? '#ff0000' : '#442222';
      const px = size / 7;
      const pixels = [
        [0,1,1,0,1,1,0],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1],
        [0,1,1,1,1,1,0],
        [0,0,1,1,1,0,0],
        [0,0,0,1,0,0,0]
      ];

      ctx.fillStyle = color;
      pixels.forEach((row, r) => {
        row.forEach((col, c) => {
          if (col) ctx.fillRect(cx + c * px, cy + r * px, px, px);
        });
      });

      if (!filled) {
        ctx.strokeStyle = '#aa3333';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, 7 * px, 6 * px);
      }
    }

    function drawTimerAndLives() {
      const secs = Math.ceil(remainingMs / 1000);
      const mins = Math.floor(secs / 60);
      const s = secs % 60;

      ctx.fillStyle = secs <= 10 ? '#ff4444' : '#fff';
      ctx.font = uiFont(12);
      ctx.textAlign = 'right';
      ctx.fillText(`${mins}:${String(s).padStart(2, '0')}`, CW - 40, 48);

      drawLivesOnCanvas(36, 52);
    }

    function drawTimingRing() {
      const radius = CPRHero.rhythm.ringRadius(RING_MAX_RADIUS, RING_TARGET_RADIUS, ringProgress);
      const compact = canvasDisplayScale < 0.85;
      const scale = Math.max(canvasDisplayScale, 0.28);
      const targetWidth = compact ? Math.max(3, Math.round(3.5 / scale)) : 3;
      const ringWidth = compact ? Math.max(4, Math.round(5 / scale)) : 4;

      if (compact) {
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, RING_TARGET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(78, 204, 163, 0.16)';
        ctx.fill();
      }

      // Static target zone ring
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, RING_TARGET_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(78, 204, 163, 0.95)';
      ctx.lineWidth = targetWidth;
      ctx.stroke();

      // Shrinking beat ring
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = beatPulse > 0 ? '#ffffff' : '#e94560';
      ctx.lineWidth = ringWidth;
      ctx.stroke();

      drawPixelHeart(CENTER_X, CENTER_Y, 48, '#e94560');

      if (beatPulse > 0) {
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, RING_TARGET_RADIUS + 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${beatPulse * 0.25})`;
        ctx.fill();
      }
    }

    function drawMobileHUD() {
      const scale = Math.max(canvasDisplayScale, 0.28);
      const px = (n) => Math.max(1, Math.round(n / scale));
      const topH = px(42);
      const botH = px(36);
      const scoreValue = compressionPoints + correctTrivia * 50;
      const secs = Math.ceil(remainingMs / 1000);
      const mins = Math.floor(secs / 60);
      const timeStr = mins + ':' + String(secs % 60).padStart(2, '0');

      ctx.save();
      ctx.fillStyle = 'rgba(6, 8, 20, 0.84)';
      ctx.fillRect(0, 0, CW, topH);
      ctx.fillRect(0, CH - botH, CW, botH);

      const barX = px(10);
      const barY = px(7);
      const barW = CW - px(20);
      const barH = px(8);
      ctx.fillStyle = '#24182c';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = oxygen > 60 ? '#4ecca3' : oxygen > 30 ? '#f5c518' : '#ff4444';
      ctx.fillRect(barX, barY, Math.max(0, (oxygen / 100) * barW), barH);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(2, px(1));
      ctx.strokeRect(barX, barY, barW, barH);

      const heartSize = px(15);
      const heartGap = heartSize + px(5);
      for (let i = 0; i < MAX_LIVES; i++) {
        drawLifeHeart(px(10) + i * heartGap, topH - px(20), heartSize, i < lives);
      }

      ctx.font = uiFont(px(12));
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(Math.round(oxygen) + '%', px(12) + MAX_LIVES * heartGap, topH - px(8));

      ctx.font = uiFont(px(14));
      ctx.textAlign = 'right';
      ctx.fillStyle = secs <= 10 ? '#ff4444' : '#f5c518';
      ctx.fillText(timeStr, CW - px(10), topH - px(8));

      const base = CH - px(12);
      ctx.font = uiFont(px(12));
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(tr('score') + ' ' + scoreValue, px(10), base);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f5c518';
      ctx.fillText(BPM + ' ' + tr('beat'), CENTER_X, base);
      ctx.textAlign = 'right';
      ctx.fillStyle = streak >= STREAK_MULTIPLIER_AT ? '#f5c518' : '#eaeaea';
      ctx.fillText(tr('streak') + ' ' + streak, CW - px(10), base);
      ctx.restore();
    }

    function drawHUD() {
      if (canvasDisplayScale < 0.85) {
        drawMobileHUD();
        return;
      }

      drawOxygenBar();
      drawTimerAndLives();

      ctx.textAlign = 'center';
      ctx.font = uiFont(8);
      ctx.fillStyle = streak >= STREAK_MULTIPLIER_AT ? '#f5c518' : '#888';
      ctx.fillText(tr('streak') + ': ' + streak, CENTER_X, CH - 72);

      ctx.fillStyle = '#888';
      ctx.fillText(tr('score') + ': ' + (compressionPoints + correctTrivia * 50), CENTER_X, CH - 52);

      ctx.fillStyle = '#f5c518';
      ctx.fillText(isTouchDevice ? tr('tapCompress') : tr('spaceCompress'), CENTER_X, CH - 28);
      ctx.fillText(tr('beat') + ' ' + BPM, CENTER_X, CH - 92);
    }

    function drawHitFeedback(now) {
      if (!lastHitFeedback.text) return;
      const age = now - lastHitFeedback.time;
      const hold = 720;
      if (age > hold) return;

      const compact = canvasDisplayScale < 0.85;
      const scale = Math.max(canvasDisplayScale, 0.28);
      const size = compact ? Math.round(22 / scale) : 14;
      const rise = compact ? Math.round(118 / scale) : 95;
      const pop = age < 140 ? 0.72 + (age / 140) * 0.4 : 1.12 - Math.min(1, (age - 140) / (hold - 140)) * 0.12;
      const fade = age < hold * 0.72 ? 1 : 1 - (age - hold * 0.72) / (hold * 0.28);

      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.translate(CENTER_X, CENTER_Y - rise);
      ctx.scale(pop, pop);
      ctx.font = uiFont(size);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, Math.round(size * 0.16));
      ctx.strokeStyle = '#140814';
      ctx.strokeText(lastHitFeedback.text, 0, 0);
      ctx.fillStyle = lastHitFeedback.color;
      ctx.fillText(lastHitFeedback.text, 0, 0);
      ctx.restore();
    }

    function paintWorld(now, scene) {
      if (!CPRHero.Gfx.ready) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CW, CH);
        return false;
      }
      CPRHero.Gfx.bg(ctx, CW, CH, scene);
      CPRHero.Gfx.ambient(ctx, scene, now);
      return true;
    }

    function drawActor(file, index, x, feetY) {
      const actor = CPRHero.Gfx.metrics.actor;
      const scale = CPRHero.Gfx.metrics.scale;
      const y = feetY - actor.h * scale;
      CPRHero.Gfx.frame(ctx, file, index, actor.w, actor.h, x, y, scale);
      return { x: x, y: y, headX: x + 28, headY: y + 6 };
    }

    function drawPatientSprite(now, x, gasping, compressed) {
      const patient = CPRHero.Gfx.metrics.patient;
      const scale = CPRHero.Gfx.metrics.scale;
      const feet = CPRHero.Gfx.metrics.ground;
      const y = feet - patient.h * scale + 14;
      CPRHero.Gfx.frame(
        ctx, 'patient.png',
        CPRHero.Gfx.patientIndex(now, gasping, compressed),
        patient.w, patient.h, x, y, scale
      );
    }

    // Kneeling beside the hip. Stacked palms are sprite x 9–24, bottom y 54.
    // The patient's sternum is x 38 and the chest top is y 11.
    function cprHeroX(patientX) {
      const scale = CPRHero.Gfx.metrics.scale;
      return patientX + (38 - 16) * scale;
    }

    function cprHeroY() {
      const scale = CPRHero.Gfx.metrics.scale;
      const feet = CPRHero.Gfx.metrics.ground;
      const patientY = feet - CPRHero.Gfx.metrics.patient.h * scale + 14;
      const restOverlap = 8;
      return patientY + 11 * scale + restOverlap - 54 * scale;
    }

    function drawCountdown(now) {
      const age = (now - countdownStamp) % 1000;
      const pop = 1 + Math.max(0, 1 - age / 260) * 0.28;

      ctx.fillStyle = 'rgba(8, 10, 24, 0.55)';
      ctx.fillRect(0, 0, CW, CH);

      ctx.save();
      ctx.translate(CENTER_X, CENTER_Y - 10);
      ctx.scale(pop, pop);
      ctx.font = uiFont(64);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#140814';
      ctx.fillText(String(countdownValue), 6, 6);
      ctx.fillStyle = '#e94560';
      ctx.fillText(String(countdownValue), 0, 0);
      ctx.restore();

      ctx.font = uiFont(10);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff8e0';
      ctx.fillText(tr('getReady'), CENTER_X, CENTER_Y + 78);
    }

    function drawNarrativeScene(now) {
      if (!paintWorld(now, 'street')) return;
      const feet = CPRHero.Gfx.metrics.ground;
      const G = CPRHero.Gfx;
      drawActor('rick.png', G.standIndex(now, false, true, false), 36, feet);
      drawActor('hero.png', G.standIndex(now, false, true, false), 168, feet);
      drawPatientSprite(now, 400, false, false);
      drawActor('maya.png', G.standIndex(now, false, true, false), 620, feet);
    }

    function drawPlayingScene(now) {
      const feet = CPRHero.Gfx.metrics.ground;
      const G = CPRHero.Gfx;
      if (paintWorld(now, 'close')) {
        const patientX = 250;
        drawPatientSprite(now, patientX, false, true);
        const cpr = G.metrics.cpr;
        G.frame(ctx, 'hero-cpr.png', G.cprIndex(now), cpr.w, cpr.h, cprHeroX(patientX), cprHeroY(), G.metrics.scale);
        drawActor('rick.png', G.standIndex(now, true, false, true), 560, feet);
      }
      drawTimingRing();
      drawVaporWisps(now);
      drawHUD();
      drawHitFeedback(now);
    }

    function drawSpeechTick(x, y, active) {
      if (!active) return;
      ctx.fillStyle = '#fff8e0';
      ctx.fillRect(x, y - 22, 22, 12);
      ctx.fillRect(x + 6, y - 10, 6, 6);
      ctx.strokeStyle = '#201018';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y - 22, 22, 12);
    }

    function paintScenarioPortrait(now) {
      if (!scenarioPortraitArt || !CPRHero.Gfx.ready) return;
      const p = scenarioPortraitArt.getContext('2d');
      p.imageSmoothingEnabled = false;
      p.clearRect(0, 0, 64, 64);
      p.fillStyle = '#140c28';
      p.fillRect(0, 0, 64, 64);
      const who = scenarioSpeakerId;
      const talk = scenarioTalking;
      const G = CPRHero.Gfx;
      const actor = G.metrics.actor;
      if (who === 'hero') G.bust(p, 'hero.png', G.standIndex(now, talk, false, false), actor.w);
      else if (who === 'rick') G.bust(p, 'rick.png', G.standIndex(now, talk, false, scenarioScene === 'calling'), actor.w);
      else if (who === 'maya') G.bust(p, 'maya.png', G.standIndex(now, talk, false, false), actor.w);
      else if (who === 'patient') {
        const sheet = G.metrics.patient;
        const index = G.patientIndex(now, true, false);
        G.blit(p, 'patient.png', index * sheet.w, 0, 32, 32, 0, 0, 64, 64);
      } else if (who === 'aed') {
        G.blit(p, 'props.png', 0, 2, 30, 22, 10, 14, 44, 32);
      } else {
        G.bust(p, 'coach.png', G.coachIndex(now, talk || who === 'dispatch'), G.metrics.coach.w);
      }
    }

    function drawScenarioScene(now) {
      const talk = scenarioTalking;
      const who = scenarioSpeakerId;
      const G = CPRHero.Gfx;
      const close = scenarioScene !== 'street-traffic';
      const gasping = scenarioScene === 'check-breathing' || scenarioScene === 'cpr';
      const compressing = scenarioScene === 'cpr' || scenarioScene === 'aed';
      const onPhone = scenarioScene === 'calling' || scenarioScene === 'check-breathing' || scenarioScene === 'cpr';
      const feet = G.metrics.ground;

      if (!paintWorld(now, close ? 'close' : 'street')) return;

      const patientX = close ? 300 : 390;
      drawPatientSprite(now, patientX, gasping, compressing);

      const heroTalk = talk && who === 'hero';
      let heroHead = { headX: 200, headY: 120 };
      if (compressing) {
        const cpr = G.metrics.cpr;
        const y = cprHeroY();
        const heroX = cprHeroX(patientX);
        G.frame(ctx, 'hero-cpr.png', G.cprIndex(now), cpr.w, cpr.h, heroX, y, G.metrics.scale);
        heroHead = { headX: heroX + 40, headY: y + 8 };
      } else if (close) {
        heroHead = drawActor('hero.png', G.kneelIndex(now, heroTalk), 175, feet);
      } else {
        heroHead = drawActor('hero.png', G.standIndex(now, heroTalk, true, false), 155, feet);
      }
      drawSpeechTick(heroHead.headX, heroHead.headY, heroTalk);

      const rickTalk = talk && who === 'rick';
      const rickHead = drawActor(
        'rick.png',
        G.standIndex(now, rickTalk, scenarioScene === 'street-traffic', onPhone),
        close ? 12 : 28,
        feet
      );
      drawSpeechTick(rickHead.headX, rickHead.headY, rickTalk);

      const mayaAway = scenarioScene === 'calling' || scenarioScene === 'check-breathing' || scenarioScene === 'cpr';
      if (!mayaAway) {
        const mayaTalk = talk && who === 'maya';
        const holding = scenarioScene === 'aed' || scenarioScene === 'ambulance';
        const mayaX = scenarioScene === 'ambulance' ? 250 : 600;
        const mayaFrame = holding ? 5 : G.standIndex(now, mayaTalk, false, false);
        const mayaHead = drawActor('maya.png', mayaFrame, mayaX, feet);
        drawSpeechTick(mayaHead.headX, mayaHead.headY, mayaTalk);
        if (holding) {
          G.blit(ctx, 'props.png', 0, 2, 30, 22, mayaX + 70, feet - 78, 54, 40);
        }
      }

      if (scenarioScene === 'ambulance') {
        const amb = G.metrics.amb;
        G.frame(ctx, 'ambulance.png', G.ambIndex(now), amb.w, amb.h, 470, feet - 36, 2);
        const medicTalk = talk && (who === 'dispatch' || who === 'coach');
        const medicFrame = Math.floor(now / 900) % 6 === 0 ? 5 : G.standIndex(now, medicTalk, false, false);
        drawActor('medic.png', medicFrame, 390, feet);
      }

      paintScenarioPortrait(now);

      ctx.fillStyle = 'rgba(8, 6, 20, 0.72)';
      ctx.fillRect(CENTER_X - 168, 8, 336, 18);
      ctx.fillStyle = '#c9b8ff';
      ctx.font = uiFont(8);
      ctx.textAlign = 'center';
      ctx.fillText(tr('dialogueMode'), CENTER_X, 21);
      if (scenarioPulse > 0) {
        ctx.globalAlpha = scenarioPulse * 0.8;
        ctx.strokeStyle = '#4ecca3';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, CW - 20, CH - 20);
        ctx.globalAlpha = 1;
      }
    }

    function drawWinAnimation(now) {
      const G = CPRHero.Gfx;
      const feet = G.ready ? G.metrics.ground : 320;
      if (!paintWorld(now, 'close')) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CW, CH);
      }

      const elapsed = now - winAnimStart;
      const progress = Math.min(1, elapsed / 2000);
      const ambX = -240 + progress * 520;
      if (G.ready) {
        const amb = G.metrics.amb;
        G.frame(ctx, 'ambulance.png', G.ambIndex(now), amb.w, amb.h, ambX, feet - 30, 2);
        drawActor('hero.png', G.standIndex(now, false, false, false), 250, feet);
        const medicFrame = progress > 0.65 ? 5 : G.standIndex(now, false, false, false);
        drawActor('medic.png', medicFrame, Math.min(ambX + 230, 430), feet);
        drawPatientSprite(now, 80, false, false);
      }

      ctx.fillStyle = '#4ecca3';
      ctx.font = uiFont(10);
      ctx.textAlign = 'center';
      ctx.fillText(tr('saved'), CENTER_X, 48);
    }

    function render(now) {
      ctx.clearRect(0, 0, CW, CH);
      if (CPRHero.Gfx) CPRHero.Gfx.prep(ctx);

      if (state === STATE.NARRATIVE) drawNarrativeScene(now);
      else if (state === STATE.COUNTDOWN) {
        drawNarrativeScene(now);
        drawCountdown(now);
      }
      else if (state === STATE.PLAYING || state === STATE.TRIVIA) drawPlayingScene(now);
      else if (state === STATE.WIN) drawWinAnimation(now);
      else if (state === STATE.SCENARIO || state === STATE.SCENARIO_RESULTS) drawScenarioScene(now);
      else if (CPRHero.Gfx.ready) {
        const feet = CPRHero.Gfx.metrics.ground;
        const G = CPRHero.Gfx;
        paintWorld(now, 'street');
        drawActor('rick.png', G.standIndex(now, false, false, false), 40, feet);
        drawActor('hero.png', G.standIndex(now, false, false, false), 180, feet);
        drawPatientSprite(now, 390, false, false);
        drawActor('maya.png', G.standIndex(now, false, false, false), 620, feet);
      } else {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CW, CH);
        drawPixelHeart(CENTER_X, CENTER_Y, 70, '#e94560');
      }
    }

    // --- MAIN GAME LOOP (runs ~60 times per second) ---
    let lastFrame = 0;

    function gameLoop(timestamp) {
      const dt = timestamp - lastFrame;
      lastFrame = timestamp;

      if (state === STATE.SCENARIO || state === STATE.SCENARIO_RESULTS) {
        scenarioPulse = Math.max(0, scenarioPulse - dt / 400);
        tickScenarioTypewriter(dt);
        tickScenarioMusic(dt);
      }

      if (tutorialBlocking()) {
        if (state === STATE.PLAYING) beatStartTime += dt;
        if (state === STATE.COUNTDOWN) countdownStamp += dt;
      } else if (state === STATE.COUNTDOWN) {
        const elapsed = Math.max(0, timestamp - countdownStamp);
        const shown = 3 - Math.floor(elapsed / 1000);
        if (shown <= 0) {
          playTone(784, 0.18, 'square', 0.1);
          setState(STATE.PLAYING);
        } else if (shown !== countdownValue) {
          countdownValue = shown;
          countdownAnnounce.textContent = String(shown);
          playTone(shown === 1 ? 659 : 523, 0.15, 'square', 0.09);
        }
      } else if (state === STATE.PLAYING) {
        remainingMs -= dt;

        if (remainingMs <= 0) {
          remainingMs = 0;
          setState(STATE.WIN);
        } else {
          checkMissedBeats(timestamp);
        }
      }

      render(timestamp);
      requestAnimationFrame(gameLoop);
    }

    // --- BOOTSTRAP: start the engine when page loads ---
    
    function contentFile(name) {
      const lang = CPRHero.i18n && CPRHero.i18n.lang() === 'ko' ? 'ko' : 'en';
      return lang === 'ko' ? '/data/' + name + '.ko.json' : '/data/' + name + '.json';
    }

    async function loadLocalizedContent() {
      const token = ++loadToken;
      const [triviaData, storyData, coachData, scenarioData] = await Promise.all([
        fetch(contentFile('trivia')).then((r) => r.json()),
        fetch(contentFile('story')).then((r) => r.json()),
        fetch(contentFile('coach')).then((r) => r.json()),
        fetch(contentFile('scenarios')).then((r) => r.json())
      ]);
      if (token !== loadToken) return;

      TRIVIA_BANK = triviaData.questions;
      CPRHero.trivia.bank = TRIVIA_BANK;
      NARRATIVE_BEATS = storyData.beats;
      call911Prompt = storyData.call911Prompt || call911Prompt;
      if (!window.CoachPulse) window.CoachPulse = CPRHero.createCoach(coachData);
      else CoachPulse.setPack(coachData);
      if (!scenarioEngine) scenarioEngine = CPRHero.createScenarioEngine(scenarioData);
      else scenarioEngine.setPack(scenarioData);
    }

    function applyRuntimeLanguage() {
      updateCompressLabel();
      if (boardFailed) showOfflineLeaderboard();
      else if (lastBoardEntries) renderLeaderboard(lastBoardEntries);
      if (state === STATE.NARRATIVE) showNarrativeBeat();
      if (state === STATE.TRIVIA && !triviaAnimating) {
        fillTriviaOptions(CPRHero.trivia.currentQuestion());
      }
      if (state === STATE.RESULTS && lastReport) paintScoreReport(lastReport);
      if (scenarioEngine && state === STATE.SCENARIO) {
        const snap = scenarioEngine.snapshot();
        if (snap.node && !snap.resolved) {
          scenarioEngine.clearHistory();
          renderScenarioNode(scenarioEngine.snapshot());
        } else {
          updateScenarioHud(snap);
          renderScenarioLog(snap.history);
          if (!scenarioOptions.classList.contains('hidden')) {
            showScenarioChoices(snap.options);
          }
        }
      }
      if (state === STATE.SCENARIO_RESULTS && scenarioEngine) {
        fillScenarioReport(scenarioEngine.report());
      }
      if (window.CoachPulse && CoachPulse.retell) CoachPulse.retell(state);
    }

    if (CPRHero.i18n) {
      let appliedLang = CPRHero.i18n.lang();
      CPRHero.i18n.onChange(() => {
        syncSound();
        if (CPRHero.i18n.lang() === appliedLang) return;
        appliedLang = CPRHero.i18n.lang();
        loadLocalizedContent().then(applyRuntimeLanguage).catch(() => applyRuntimeLanguage());
      });
    }

    Promise.all([
      loadLocalizedContent(),
      CPRHero.Gfx.load()
    ]).then(() => {
      document.body.classList.add('assets-ready');
      fetchGlobalLeaderboard().then(renderLeaderboard).catch(() => {
        showOfflineLeaderboard();
      });
      requestAnimationFrame(gameLoop);
    }).catch((err) => {
      document.body.classList.add('assets-ready');
      console.error('Failed to load game content JSON:', err);
      requestAnimationFrame(gameLoop);
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

})();
