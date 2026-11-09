window.CPRHero = window.CPRHero || {};

(function () {
  const STORAGE_LANG = 'cprhero-lang';
  const STORAGE_THEME = 'cprhero-theme';
  const STORAGE_SOUND = 'cprhero-sound';

  const STRINGS = {
    en: {
      settings: 'SETTINGS',
      language: 'LANGUAGE',
      appearance: 'APPEARANCE',
      day: 'DAY',
      night: 'NIGHT',
      volume: 'VOLUME',
      unmute: 'UNMUTE',
      mute: 'MUTE',
      close: 'CLOSE',
      tagline: 'Learn life-saving CPR rhythm. Keep them alive until help arrives.',
      pwaHint: 'On your phone: tap Share or the browser menu, then Add to Home Screen to use this like an app.',
      leaderboard: '-- LEADERBOARD --',
      play: 'PLAY',
      noScores: 'No scores yet. Be the first hero!',
      leaderboardOffline: 'Leaderboard loads when server is running',
      pts: 'pts',
      canvasAria: 'CPR HERO game canvas — press Spacebar or click to compress',
      mainScreen: 'MAIN SCREEN',
      leaveGame: 'Leave game',
      areYouSure: 'Are you sure?',
      yes: 'YES',
      no: 'NO',
      enterName: 'ENTER YOUR HERO NAME',
      keepAlive: 'Keep the patient alive until the ambulance arrives.',
      heroName: 'HERO NAME',
      namePlaceholder: 'Your name...',
      playerNameAria: 'Player name',
      startMission: 'START MISSION',
      scenarioMode: 'SCENARIO MODE',
      continue: 'CONTINUE',
      call911: 'TAP TO CALL 911',
      triviaTitle: 'FIRST AID TRIVIA',
      winTitle: 'AMBULANCE ARRIVED!',
      winBody: 'You kept them alive. Paramedic gives a thumbs-up!',
      gameOver: 'GAME OVER',
      gameOverBody: 'Every second counts. Practice makes perfect.',
      missionReport: 'MISSION REPORT',
      tryAgain: 'TRY AGAIN',
      log: 'LOG',
      leaveScenario: 'Leave scenario',
      noLines: 'No lines yet.',
      hint: 'HINT',
      restart: 'RESTART',
      scenarioComplete: 'SCENARIO COMPLETE',
      playAgain: 'PLAY AGAIN',
      mainMenu: 'MAIN MENU',
      touchHint: 'TAP THE SCREEN TO COMPRESS',
      compressSpace: 'COMPRESS — SPACEBAR / CLICK',
      compressTap: 'COMPRESS — TAP',
      compressAria: 'Compress chest — Spacebar or click',
      coachName: 'COACH PULSE',
      coachSubtitle: 'CPR & First Aid Guide',
      closeCoach: 'Close coach and return to game',
      topicTutorial: 'Tutorial',
      topicCpr: 'CPR Basics',
      topicGame: 'How to Play',
      topicFirstaid: 'First Aid',
      topicEmergency: 'Call 911',
      topicScenario: 'Scenario',
      askPlaceholder: 'Ask about CPR...',
      askAria: 'Ask Coach Pulse a question',
      send: 'SEND',
      sendAria: 'Send message',
      coachTyping: 'Coach Pulse is typing...',
      coachAria: 'CPR training assistant',
      phoneNav: 'Phone app screens',
      tabPlay: 'PLAY',
      tabBoard: 'BOARD',
      tabBoardAria: 'Leaderboard',
      tabCoach: 'COACH',
      hero: 'HERO',
      finalScore: 'FINAL SCORE',
      perfectStat: 'Perfect',
      goodStat: 'Good',
      misses: 'Misses',
      triviaSaves: 'Trivia Saves',
      multiplierPerfects: '2x Multiplier Perfects',
      bestCombo: 'Best Rhythm Combo',
      timeBonus: 'Time Bonus',
      statusRescued: 'STATUS: RESCUED!',
      statusOver: 'STATUS: GAME OVER',
      xp: 'XP',
      step: 'STEP',
      done: 'DONE',
      complete: 'COMPLETE',
      narrator: 'NARRATOR',
      coachPulse: 'COACH PULSE',
      dispatch: 'DISPATCH',
      you: 'YOU',
      patient: 'PATIENT',
      aed: 'AED',
      scenarioHintFallback: 'Stay with the conversation. Pick the safest line.',
      scenarioCompleteCoach: 'Scenario complete. Open LOG anytime on a replay to review the conversation.',
      none: 'None',
      cleanSuffix: ' (clean)',
      retrySuffix: ' (retry)',
      stepsDone: 'STEPS DONE',
      mistakes: 'MISTAKES',
      noMistakes: 'No unsafe or incorrect lines. Sharp talking.',
      learningPoints: 'LEARNING POINTS',
      recentLog: 'RECENT LOG',
      practiceNote: 'This is practice. Take a certified CPR course for real skills.',
      oxygen: 'OXYGEN',
      lives: 'LIVES',
      streak: 'STREAK',
      score: 'SCORE',
      tapCompress: 'TAP TO COMPRESS',
      spaceCompress: 'SPACEBAR TO COMPRESS',
      beat: 'BEAT',
      getReady: 'GET READY',
      saved: 'SAVED!',
      dialogueMode: '8TH STREET  •  DIALOGUE MODE',
      perfect: 'PERFECT!',
      perfect2x: 'PERFECT! 2x',
      streak2x: '2x STREAK MULTIPLIER!',
      good: 'GOOD',
      miss: 'MISS',
      tooFast: 'TOO FAST',
      tooSlow: 'TOO SLOW',
      triviaCorrectFx: 'CORRECT! Patient revived!',
      triviaWrongFx: 'WRONG! Life lost!',
      tutorialReplay: 'REPLAY TUTORIAL',
      tutorialStep: 'STEP',
      tutorialWelcomeTitle: 'WELCOME',
      tutorialWelcomeBody: 'CPR Hero teaches a steady press. This short lesson shows the controls and the rhythm ring before the compressions start.',
      tutorialStart: 'START TUTORIAL',
      tutorialSkip: 'SKIP TUTORIAL',
      tutorialNext: 'NEXT',
      tutorialControlsTitle: 'CONTROLS',
      tutorialControlsBody: 'These are the same controls as the real game. On a computer, press Spacebar or Enter, or click the screen. On a phone, tap the screen.',
      tutorialControlsNote: 'During a mission the compress button appears too. It is the same press.',
      tutorialKeySpace: 'SPACE',
      tutorialKeyEnter: 'ENTER',
      tutorialRhythmTitle: 'THE RHYTHM RING',
      tutorialRhythmBody: 'A ring shrinks toward the heart. Press when it meets the green circle.',
      tutorialPerfectBody: 'PERFECT — right on the green circle.',
      tutorialGoodBody: 'GOOD — close, a little early or a little late.',
      tutorialMissBody: 'MISS — too early or too late. In a real mission a miss lowers oxygen. Here it is only practice.',
      tutorialPracticeTitle: 'PRACTICE',
      tutorialPracticeBody: 'This beat is slower than a real mission, so you can watch the ring. Tries are not scored and are not saved to the leaderboard.',
      tutorialPerfectHit: 'Perfect! Right on the beat.',
      tutorialGoodEarly: 'Good — a little early. Press as the ring meets the green circle.',
      tutorialGoodLate: 'Good — a little late. Press as the ring meets the green circle.',
      tutorialEarly: 'Too early. Let the ring shrink closer to the green circle.',
      tutorialLate: 'Too late. Press when the ring meets the green circle.',
      tutorialWait: 'Wait for the next ring, then press once.',
      tutorialTries: 'Tries',
      tutorialReady: 'Nice work. Continue when you are ready, or keep practicing.',
      tutorialRealTitle: 'REAL SPEED',
      tutorialRealBody: 'This is the real mission speed: 110 presses a minute. Press when the ring meets the green circle. These tries are still practice and are not scored.',
      tutorialDoneTitle: 'YOU ARE READY',
      tutorialDoneBody: 'Press Spacebar or Enter, click, or tap the screen in time with the ring. A real mission uses the normal speed. This practice did not change your score.',
      tutorialStartGame: 'START REAL GAME'
    },
    ko: {
      settings: '설정',
      language: '언어',
      appearance: '화면',
      day: '낮',
      night: '밤',
      volume: '소리',
      unmute: '소리 켜기',
      mute: '음소거',
      close: '닫기',
      tagline: '생명을 구하는 CPR 박자를 배우세요. 도움이 올 때까지 살려 두세요.',
      pwaHint: '휴대폰에서는 공유 또는 브라우저 메뉴를 누른 뒤, 홈 화면에 추가하면 앱처럼 쓸 수 있습니다.',
      leaderboard: '-- 순위표 --',
      play: '플레이',
      noScores: '아직 점수가 없습니다. 첫 영웅이 되어 보세요!',
      leaderboardOffline: '서버가 켜지면 순위표가 나타납니다',
      pts: '점',
      canvasAria: 'CPR HERO 게임 화면 — 스페이스바 또는 클릭으로 압박하세요',
      mainScreen: '메인 화면',
      leaveGame: '게임 나가기',
      areYouSure: '정말 나갈까요?',
      yes: '예',
      no: '아니오',
      enterName: '영웅 이름을 입력하세요',
      keepAlive: '구급차가 올 때까지 환자를 살려 두세요.',
      heroName: '영웅 이름',
      namePlaceholder: '이름...',
      playerNameAria: '플레이어 이름',
      startMission: '임무 시작',
      scenarioMode: '시나리오 모드',
      continue: '계속',
      call911: '눌러서 119에 신고',
      triviaTitle: '응급처치 퀴즈',
      winTitle: '구급차 도착!',
      winBody: '환자를 살렸습니다. 구급대원이 엄지를 들어 올립니다!',
      gameOver: '게임 오버',
      gameOverBody: '매 순간이 중요합니다. 연습이 실력을 만듭니다.',
      missionReport: '임무 보고',
      tryAgain: '다시 하기',
      log: '기록',
      leaveScenario: '시나리오 나가기',
      noLines: '아직 대사가 없습니다.',
      hint: '힌트',
      restart: '다시 시작',
      scenarioComplete: '시나리오 완료',
      playAgain: '다시 하기',
      mainMenu: '메인 메뉴',
      touchHint: '화면을 눌러 가슴을 압박하세요',
      compressSpace: '압박 — 스페이스바 / 클릭',
      compressTap: '압박 — 터치',
      compressAria: '가슴 압박 — 스페이스바 또는 클릭',
      coachName: '코치 펄스',
      coachSubtitle: 'CPR · 응급처치 안내',
      closeCoach: '코치를 닫고 게임으로 돌아가기',
      topicTutorial: '튜토리얼',
      topicCpr: 'CPR 기초',
      topicGame: '하는 법',
      topicFirstaid: '응급처치',
      topicEmergency: '119 신고',
      topicScenario: '시나리오',
      askPlaceholder: 'CPR에 대해 물어보세요...',
      askAria: '코치 펄스에게 질문하기',
      send: '보내기',
      sendAria: '메시지 보내기',
      coachTyping: '코치 펄스가 입력 중...',
      coachAria: 'CPR 훈련 도우미',
      phoneNav: '휴대폰 화면',
      tabPlay: '플레이',
      tabBoard: '순위',
      tabBoardAria: '순위표',
      tabCoach: '코치',
      hero: '영웅',
      finalScore: '최종 점수',
      perfectStat: '완벽',
      goodStat: '좋음',
      misses: '빗나감',
      triviaSaves: '퀴즈 구조',
      multiplierPerfects: '2배 보너스 완벽',
      bestCombo: '최고 박자 콤보',
      timeBonus: '시간 보너스',
      statusRescued: '상태: 구조 성공!',
      statusOver: '상태: 게임 오버',
      xp: '경험치',
      step: '단계',
      done: '완료',
      complete: '완료',
      narrator: '내레이터',
      coachPulse: '코치 펄스',
      dispatch: '상황실',
      you: '당신',
      patient: '환자',
      aed: 'AED',
      scenarioHintFallback: '대화를 이어 가세요. 가장 안전한 대사를 고르세요.',
      scenarioCompleteCoach: '시나리오를 마쳤습니다. 다시 할 때 기록에서 대화를 볼 수 있습니다.',
      none: '없음',
      cleanSuffix: ' (한 번에)',
      retrySuffix: ' (재시도)',
      stepsDone: '완료한 단계',
      mistakes: '실수',
      noMistakes: '위험하거나 틀린 대사가 없습니다. 정확하게 말했습니다.',
      learningPoints: '배운 점',
      recentLog: '최근 기록',
      practiceNote: '이것은 연습입니다. 실제 기술은 정식 CPR 교육에서 배우세요.',
      oxygen: '산소',
      lives: '목숨',
      streak: '연속',
      score: '점수',
      tapCompress: '눌러서 압박',
      spaceCompress: '스페이스바로 압박',
      beat: '박자',
      getReady: '준비',
      saved: '구조 성공!',
      dialogueMode: '8번가  ·  대화 모드',
      perfect: '완벽!',
      perfect2x: '완벽! 2배',
      streak2x: '2배 연속!',
      good: '좋음',
      miss: '빗나감',
      tooFast: '너무 빠름',
      tooSlow: '너무 느림',
      triviaCorrectFx: '정답! 환자가 회복했습니다!',
      triviaWrongFx: '오답! 목숨을 잃었습니다!',
      tutorialReplay: '튜토리얼 다시 보기',
      tutorialStep: '단계',
      tutorialWelcomeTitle: '환영합니다',
      tutorialWelcomeBody: 'CPR Hero는 일정한 박자에 맞춰 누르는 법을 가르칩니다. 압박이 시작되기 전에 조작과 리듬 링을 짧게 익힙니다.',
      tutorialStart: '튜토리얼 시작',
      tutorialSkip: '튜토리얼 건너뛰기',
      tutorialNext: '다음',
      tutorialControlsTitle: '조작',
      tutorialControlsBody: '실제 게임과 같은 조작입니다. 컴퓨터에서는 스페이스바나 엔터를 누르거나 화면을 클릭하세요. 휴대폰에서는 화면을 두드리세요.',
      tutorialControlsNote: '임무 중에는 압박 버튼도 나타납니다. 같은 누르기입니다.',
      tutorialKeySpace: '스페이스',
      tutorialKeyEnter: '엔터',
      tutorialRhythmTitle: '리듬 링',
      tutorialRhythmBody: '링이 심장 쪽으로 줄어듭니다. 초록 원에 닿을 때 누르세요.',
      tutorialPerfectBody: '완벽 — 초록 원에 정확히 맞았습니다.',
      tutorialGoodBody: '좋음 — 조금 빠르거나 조금 늦었습니다.',
      tutorialMissBody: '빗나감 — 너무 빠르거나 늦었습니다. 실제 임무에서는 산소가 줄어듭니다. 여기서는 연습일 뿐입니다.',
      tutorialPracticeTitle: '연습',
      tutorialPracticeBody: '이 박자는 실제 임무보다 느려서 링을 보며 누를 수 있습니다. 연습은 점수가 아니고 순위표에 저장되지 않습니다.',
      tutorialPerfectHit: '완벽해요! 박자에 맞았습니다.',
      tutorialGoodEarly: '좋아요. 조금 일렀습니다. 링이 초록 원에 닿을 때 누르세요.',
      tutorialGoodLate: '좋아요. 조금 늦었습니다. 링이 초록 원에 닿을 때 누르세요.',
      tutorialEarly: '너무 일렀습니다. 링이 초록 원에 더 가까워질 때까지 기다리세요.',
      tutorialLate: '너무 늦었습니다. 링이 초록 원에 닿을 때 누르세요.',
      tutorialWait: '다음 링을 기다렸다가 한 번만 누르세요.',
      tutorialTries: '시도',
      tutorialReady: '잘했어요. 준비되면 다음으로 가거나, 더 연습해도 됩니다.',
      tutorialRealTitle: '실제 속도',
      tutorialRealBody: '이것이 실제 임무 속도입니다. 1분에 110번입니다. 링이 초록 원에 닿을 때 누르세요. 이 시도도 연습이며 점수가 되지 않습니다.',
      tutorialDoneTitle: '준비되었습니다',
      tutorialDoneBody: '스페이스바나 엔터, 클릭, 또는 화면 두드리기로 링에 맞춰 누르세요. 실제 임무는 원래 속도입니다. 이 연습은 점수를 바꾸지 않습니다.',
      tutorialStartGame: '실제 게임 시작'
    }
  };

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      /* Settings still apply for this visit if storage is blocked. */
    }
  }

  let lang = readStorage(STORAGE_LANG) === 'ko' ? 'ko' : 'en';
  let theme = readStorage(STORAGE_THEME) === 'day' ? 'day' : 'night';
  let sound = readStorage(STORAGE_SOUND) === 'mute' ? 'mute' : 'on';
  const listeners = [];

  function t(key) {
    const pack = STRINGS[lang] || STRINGS.en;
    if (pack[key] != null) return pack[key];
    return STRINGS.en[key] != null ? STRINGS.en[key] : key;
  }

  function markChoices() {
    const langEn = document.getElementById('lang-en');
    const langKo = document.getElementById('lang-ko');
    const themeDay = document.getElementById('theme-day');
    const themeNight = document.getElementById('theme-night');
    const soundOn = document.getElementById('sound-unmute');
    const soundOff = document.getElementById('sound-mute');
    if (langEn) langEn.classList.toggle('is-selected', lang === 'en');
    if (langKo) langKo.classList.toggle('is-selected', lang === 'ko');
    if (themeDay) themeDay.classList.toggle('is-selected', theme === 'day');
    if (themeNight) themeNight.classList.toggle('is-selected', theme === 'night');
    if (soundOn) soundOn.classList.toggle('is-selected', sound === 'on');
    if (soundOff) soundOff.classList.toggle('is-selected', sound === 'mute');
  }

  function applyDom() {
    document.documentElement.lang = lang === 'ko' ? 'ko' : 'en';
    document.documentElement.dataset.theme = theme;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'day' ? '#f4efe4' : '#1a1a2e');

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    markChoices();
  }

  function notify() {
    const detail = { lang: lang, theme: theme, sound: sound };
    listeners.forEach((fn) => fn(detail));
  }

  function setLang(next) {
    if (next !== 'en' && next !== 'ko') return;
    if (next === lang) {
      markChoices();
      return;
    }
    lang = next;
    writeStorage(STORAGE_LANG, lang);
    applyDom();
    notify();
  }

  function setTheme(next) {
    if (next !== 'day' && next !== 'night') return;
    if (next === theme) {
      markChoices();
      return;
    }
    theme = next;
    writeStorage(STORAGE_THEME, theme);
    applyDom();
    notify();
  }

  function setSound(next) {
    if (next !== 'on' && next !== 'mute') return;
    if (next === sound) {
      markChoices();
      return;
    }
    sound = next;
    writeStorage(STORAGE_SOUND, sound);
    applyDom();
    notify();
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function openSettings() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;
    panel.classList.remove('hidden');
    const closeBtn = document.getElementById('settings-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) panel.classList.add('hidden');
  }

  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if (settingsClose) settingsClose.addEventListener('click', closeSettings);
  if (settingsPanel) {
    settingsPanel.addEventListener('click', (event) => {
      if (event.target === settingsPanel) closeSettings();
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSettings();
  });

  const langEn = document.getElementById('lang-en');
  const langKo = document.getElementById('lang-ko');
  const themeDay = document.getElementById('theme-day');
  const themeNight = document.getElementById('theme-night');
  const soundOn = document.getElementById('sound-unmute');
  const soundOff = document.getElementById('sound-mute');
  if (langEn) langEn.addEventListener('click', () => setLang('en'));
  if (langKo) langKo.addEventListener('click', () => setLang('ko'));
  if (themeDay) themeDay.addEventListener('click', () => setTheme('day'));
  if (themeNight) themeNight.addEventListener('click', () => setTheme('night'));
  if (soundOn) soundOn.addEventListener('click', () => setSound('on'));
  if (soundOff) soundOff.addEventListener('click', () => setSound('mute'));

  applyDom();

  CPRHero.i18n = {
    t: t,
    lang: function () { return lang; },
    theme: function () { return theme; },
    sound: function () { return sound; },
    muted: function () { return sound === 'mute'; },
    setLang: setLang,
    setTheme: setTheme,
    setSound: setSound,
    onChange: onChange,
    applyDom: applyDom,
    settingsOpen: function () {
      return settingsPanel && !settingsPanel.classList.contains('hidden');
    }
  };
})();
