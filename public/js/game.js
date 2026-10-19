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

    // --- DOM REFERENCES (HTML elements we control with JavaScript) ---
    const overlays = {
      start: document.getElementById('start-overlay'),
      narrative: document.getElementById('narrative-overlay'),
      trivia: document.getElementById('trivia-overlay'),
      win: document.getElementById('win-overlay'),
      gameover: document.getElementById('gameover-overlay'),
      results: document.getElementById('results-overlay')
    };

    const playerNameInput = document.getElementById('player-name');
    const startBtn = document.getElementById('start-btn');
    const narrativeText = document.getElementById('narrative-text');
    const narrativeBtn = document.getElementById('narrative-btn');
    const call911Btn = document.getElementById('call911-btn');
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
    const tabGame = document.getElementById('tab-game');
    const tabCoach = document.getElementById('tab-coach');
    const mobileCoachClose = document.getElementById('mobile-coach-close');

    // --- GAME CONSTANTS (tunable rules) ---
    const BPM = 110;
    const BEAT_INTERVAL = 60000 / BPM; // 545.45ms between beats
    const PERFECT_WINDOW = 65;       // ±65ms = PERFECT
    const GOOD_WINDOW = 130;         // ±130ms = GOOD
    const GAME_DURATION_MS = 120000; // 2-minute ambulance timer
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
      PLAYING: 'PLAYING',
      TRIVIA: 'TRIVIA',
      WIN: 'WIN',
      GAME_OVER: 'GAME_OVER',
      RESULTS: 'RESULTS'
    };

    // --- LIVE GAME VARIABLES (change during play) ---
    let state = STATE.START;
    let playerName = '';
    let narrativeIndex = 0;

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
    let ringProgress = 0;
    let beatPulse = 0;
    let lastHitFeedback = { text: '', color: '', time: 0 };

    // Trivia tracking
    let usedTriviaIndices = [];
    let currentTriviaIndex = -1;
    let triviaAnimating = false;

    // Win animation
    let winAnimStart = 0;

    // Phase 1 local leaderboard (temporary until Phase 2 backend)

    // Detect touch devices for control hints
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      touchHint.style.display = 'block';
      compressBtn.textContent = 'COMPRESS — TAP';
    }

    function showMobileScreen(screen) {
      const coach = screen === 'coach';
      document.body.classList.toggle('mobile-coach', coach);
      tabGame.classList.toggle('active', !coach);
      tabCoach.classList.toggle('active', coach);
      tabGame.setAttribute('aria-selected', String(!coach));
      tabCoach.setAttribute('aria-selected', String(coach));
    }

    tabGame.addEventListener('click', () => showMobileScreen('game'));
    tabCoach.addEventListener('click', () => showMobileScreen('coach'));
    mobileCoachClose.addEventListener('click', () => showMobileScreen('game'));

    // --- SIMPLE WEB AUDIO BEEPS (no external sound files in Phase 1) ---
    let audioCtx = null;

    function initAudio() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    function playTone(freq, duration, type = 'square', volume = 0.07) {
      initAudio();
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
      CPRHero.leaderboard.render(entries, leaderboardList);
    }

    function escapeHtml(str) {
      return CPRHero.leaderboard.escapeHtml(str);
    }

    // --- STATE MACHINE ---
    function setState(newState) {
      state = newState;

      switch (newState) {
        case STATE.START:
          showOverlay('start');
          break;
        case STATE.NARRATIVE:
          narrativeIndex = 0;
          showNarrativeBeat();
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
          setTimeout(() => endGame(true), 2200);
          break;
        case STATE.GAME_OVER:
          showOverlay('gameover');
          setTimeout(() => endGame(false), 1800);
          break;
        case STATE.RESULTS:
          showOverlay('results');
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
      ringProgress = 0;
      beatPulse = 0;
      CPRHero.trivia.reset();
      usedTriviaIndices = CPRHero.trivia.usedIndices;
      currentTriviaIndex = -1;
      narrativeIndex = 0;
      lastHitFeedback = { text: '', color: '', time: 0 };
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
      if (playing) {
        canvas.focus({ preventScroll: true });
      }
    }

    // --- RHYTHM ENGINE ---
    function initPlaying() {
      beatStartTime = performance.now();
      currentBeatIndex = 0;
      beatInputHandled = false;
      ringProgress = 0;
      updateCompressControls();
      canvas.focus({ preventScroll: true });
    }

    function getExpectedBeatTime(beatIndex) {
      return CPRHero.rhythm.getExpectedBeatTime(beatStartTime, beatIndex, BEAT_INTERVAL);
    }

    function evaluateInput(inputTime) {
      const expected = getExpectedBeatTime(currentBeatIndex);
      const delta = Math.abs(inputTime - expected);

      const tier = CPRHero.rhythm.classifyHit(delta, PERFECT_WINDOW, GOOD_WINDOW);

      applyHitResult(tier);
      beatInputHandled = true;
    }

    function applyHitResult(tier) {
      const now = performance.now();

      if (tier === 'PERFECT') {
        perfectCompressions++;
        oxygen = 100; // perfect hit restores / maintains full oxygen
        streak++;

        const pts = getPerfectPoints();
        if (streak >= STREAK_MULTIPLIER_AT) streakMultiplierPerfects++;
        compressionPoints += pts;

        lastHitFeedback = {
          text: streak >= STREAK_MULTIPLIER_AT ? 'PERFECT! 2x' : 'PERFECT!',
          color: '#4ecca3',
          time: now
        };

        if (streak === STREAK_MULTIPLIER_AT) {
          lastHitFeedback = { text: '2x STREAK MULTIPLIER!', color: '#f5c518', time: now };
        }

        playTone(660, 0.1, 'square', 0.08);
      }

      if (tier === 'GOOD') {
        goodCompressions++;
        oxygen = Math.min(100, oxygen + 4);
        streak = 0;
        lastHitFeedback = { text: 'GOOD', color: '#f5c518', time: now };
        playTone(440, 0.08, 'triangle', 0.06);
      }

      if (tier === 'MISS') {
        misses++;
        oxygen = Math.max(0, oxygen - 15);
        streak = 0;
        lastHitFeedback = { text: 'MISS', color: '#ff4444', time: now };
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
        beatInputHandled = false;
        beatPulse = 1;
        playTone(220, 0.05, 'square', 0.04);
      }

      const beatTime = getExpectedBeatTime(currentBeatIndex);
      ringProgress = CPRHero.rhythm.nextRingProgress(now, beatTime, BEAT_INTERVAL);
      beatPulse = Math.max(0, beatPulse - 0.08);
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
      const q = CPRHero.trivia.currentQuestion();

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

    function showTriviaResultAnimation(isCorrect, onComplete) {
      triviaAnimating = true;
      clearTriviaFeedback();

      triviaFeedback.innerHTML = isCorrect
        ? '<span class="feedback-icon">✓</span><span>CORRECT! Patient revived!</span>'
        : '<span class="feedback-icon">✗</span><span>WRONG! Life lost!</span>';

      triviaFeedback.className = isCorrect ? 'show-correct' : 'show-wrong';
      triviaOverlay.classList.add(isCorrect ? 'flash-correct' : 'flash-wrong');

      if (isCorrect) playTriviaCorrectSound();
      else playTriviaWrongSound();

      setTimeout(() => {
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

      scoreBreakdown.innerHTML = `
        <p>HERO: ${escapeHtml(playerName)}</p>
        <p>FINAL SCORE: ${finalScore}</p>
        <p>Perfect: ${perfectCompressions}</p>
        <p>Good: ${goodCompressions}</p>
        <p>Misses: ${misses}</p>
        <p>Trivia Saves: ${correctTrivia} (x50)</p>
        <p>2x Multiplier Perfects: ${streakMultiplierPerfects}</p>
        <p>Time Bonus: ${timeBonus}s (x5)</p>
        <p>${didWin ? 'STATUS: RESCUED!' : 'STATUS: GAME OVER'}</p>
      `;

      setState(STATE.RESULTS);
    }

    // --- INPUT: SPACEBAR (PC) + TAP (MOBILE) + COMPRESS BUTTON ---
    function handleCompress() {
      if (state !== STATE.PLAYING) return;
      initAudio();
      evaluateInput(performance.now());
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
      if (handleGameplayKey(e)) return;

      // Outside gameplay, allow normal space typing in text fields
      if (e.code === 'Space' && isTypingInTextField()) return;
    }, true);

    compressBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleCompress();
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleCompress();
    }, { passive: false });

    canvas.addEventListener('click', () => {
      if (isTouchDevice) return;
      handleCompress();
    });

    // --- BUTTON EVENTS ---
    startBtn.addEventListener('click', async () => {
      const name = playerNameInput.value.trim();
      if (!name) {
        playerNameInput.focus();
        return;
      }

      playerName = name;
      initAudio();
      resetGame();
      renderLeaderboard(await fetchGlobalLeaderboard());
      setState(STATE.NARRATIVE);
    });

    narrativeBtn.addEventListener('click', advanceNarrative);
    call911Btn.addEventListener('click', () => setState(STATE.PLAYING));

    retryBtn.addEventListener('click', async () => {
      resetGame();
      playerNameInput.value = playerName;
      renderLeaderboard(await fetchGlobalLeaderboard());
      setState(STATE.START);
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
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText(`OXYGEN: ${Math.round(oxygen)}%`, x, y - 8);
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
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = '#fff';
      ctx.fillText('LIVES', x, y);

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
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = 'right';
      ctx.fillText(`${mins}:${String(s).padStart(2, '0')}`, CW - 40, 48);

      drawLivesOnCanvas(36, 52);
    }

    function drawTimingRing() {
      const radius = CPRHero.rhythm.ringRadius(RING_MAX_RADIUS, RING_TARGET_RADIUS, ringProgress);

      // Static target zone ring
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, RING_TARGET_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(78, 204, 163, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Shrinking beat ring
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = beatPulse > 0 ? '#ffffff' : '#e94560';
      ctx.lineWidth = 4;
      ctx.stroke();

      drawPixelHeart(CENTER_X, CENTER_Y, 48, '#e94560');

      if (beatPulse > 0) {
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, RING_TARGET_RADIUS + 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${beatPulse * 0.25})`;
        ctx.fill();
      }
    }

    function drawHUD() {
      drawOxygenBar();
      drawTimerAndLives();

      ctx.textAlign = 'center';
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = streak >= STREAK_MULTIPLIER_AT ? '#f5c518' : '#888';
      ctx.fillText(`STREAK: ${streak}`, CENTER_X, CH - 72);

      ctx.fillStyle = '#888';
      ctx.fillText(`SCORE: ${compressionPoints + correctTrivia * 50}`, CENTER_X, CH - 52);

      ctx.fillStyle = '#f5c518';
      ctx.fillText(isTouchDevice ? 'TAP TO COMPRESS' : 'SPACEBAR TO COMPRESS', CENTER_X, CH - 28);
      ctx.fillText(`${BPM} BPM`, CENTER_X, CH - 92);
    }

    function drawHitFeedback(now) {
      if (!lastHitFeedback.text) return;
      const age = now - lastHitFeedback.time;
      if (age > 600) return;

      ctx.globalAlpha = 1 - age / 600;
      ctx.fillStyle = lastHitFeedback.color;
      ctx.font = '14px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(lastHitFeedback.text, CENTER_X, CENTER_Y - 95);
      ctx.globalAlpha = 1;
    }

    function drawNarrativeScene() {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CW, CH * 0.55);
      ctx.fillStyle = '#555';
      ctx.fillRect(0, CH * 0.55, CW, CH * 0.45);

      ctx.fillStyle = '#3a3a5c';
      ctx.fillRect(60, 110, 110, 220);
      ctx.fillRect(220, 70, 100, 260);
      ctx.fillRect(520, 90, 130, 240);

      ctx.fillStyle = '#4ecca3';
      ctx.fillRect(130, CH * 0.55 - 48, 20, 38);
      ctx.fillStyle = '#ffccaa';
      ctx.fillRect(135, CH * 0.55 - 62, 14, 14);

      ctx.fillStyle = '#888';
      ctx.fillRect(430, CH * 0.55 - 8, 50, 14);
      ctx.fillStyle = '#ffccaa';
      ctx.fillRect(468, CH * 0.55 - 16, 14, 12);

      ctx.fillStyle = '#ff4444';
      ctx.font = '18px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('!', 475, CH * 0.55 - 26);
    }

    function drawPlayingScene(now) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CW, CH);

      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(0, CH * 0.72, CW, CH * 0.28);

      drawTimingRing();
      drawHUD();
      drawHitFeedback(now);
    }

    function drawWinAnimation(now) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CW, CH);

      const elapsed = now - winAnimStart;
      const progress = Math.min(1, elapsed / 2000);
      const ambX = -200 + progress * (CW / 2 + 120);

      ctx.fillStyle = '#fff';
      ctx.fillRect(ambX, CH * 0.62, 180, 56);
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(ambX + 10, CH * 0.62 + 10, 160, 18);

      ctx.fillStyle = '#4ecca3';
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('SAVED!', CENTER_X, CH * 0.35);

      drawPixelHeart(CENTER_X, CENTER_Y, 56, '#4ecca3');
    }

    function render(now) {
      ctx.clearRect(0, 0, CW, CH);

      if (state === STATE.NARRATIVE) drawNarrativeScene();
      else if (state === STATE.PLAYING) drawPlayingScene(now);
      else if (state === STATE.WIN) drawWinAnimation(now);
      else {
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

      if (state === STATE.PLAYING) {
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
    
    async function loadGameContent() {
      const [triviaData, storyData, coachData] = await Promise.all([
        fetch('/data/trivia.json').then((r) => r.json()),
        fetch('/data/story.json').then((r) => r.json()),
        fetch('/data/coach.json').then((r) => r.json())
      ]);

      TRIVIA_BANK = triviaData.questions;
      CPRHero.trivia.setBank(TRIVIA_BANK);
      NARRATIVE_BEATS = storyData.beats;
      call911Prompt = storyData.call911Prompt || call911Prompt;
      window.CoachPulse = CPRHero.createCoach(coachData);
    }

    loadGameContent().then(() => {
      fetchGlobalLeaderboard().then(renderLeaderboard).catch(() => {
        leaderboardList.innerHTML = '<li><span>Leaderboard loads when server is running</span><span></span></li>';
      });
      requestAnimationFrame(gameLoop);
    }).catch((err) => {
      console.error('Failed to load game content JSON:', err);
      requestAnimationFrame(gameLoop);
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

})();
