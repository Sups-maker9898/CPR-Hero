window.CPRHero = window.CPRHero || {};

CPRHero.createCoach = function createCoach(initial) {
  const chatEl = document.getElementById('assistant-chat');
  const typingEl = document.getElementById('assistant-typing');
  const inputEl = document.getElementById('assistant-input');
  const sendBtn = document.getElementById('assistant-send');
  const topicBtns = document.querySelectorAll('.topic-chip');

  let source = initial || {};
  let topics = source.topics || {};
  let knowledge = source.knowledge || [];
  let stateTips = source.stateTips || {};
  let tutorial = source.tutorial || [];
  let narrativeHints = source.narrativeHints || [];

  const GEMINI_COACH_URL = '/api/coach/ask';
  const GEMINI_TIMEOUT_MS = 12000;
  const COACH_RETRY_MS = 30000;

  let tutorialStarted = false;
  let lastContextMessage = '';
  let geminiUnavailableUntil = 0;
  let talkGen = 0;

  async function askCoach(url, question, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Coach HTTP ${response.status}`);
      const result = await response.json();
      return typeof result.answer === 'string' && result.answer ? result.answer : null;
    } finally {
      clearTimeout(timer);
    }
  }

  function koreanMode() {
    return window.CPRHero && CPRHero.i18n && CPRHero.i18n.lang() === 'ko';
  }

  function hasHangul(text) {
    return /[ㄱ-ㅎ가-힣]/.test(text || '');
  }

  function questionForCoach(question) {
    if (koreanMode()) {
      return question + '\n\n답변은 한국어로만 하세요. 영어를 쓰지 마세요.';
    }
    return question;
  }

  function acceptCoachAnswer(answer) {
    if (!answer) return null;
    if (koreanMode() && !hasHangul(answer)) return null;
    return answer;
  }

  async function askGeminiCoach(question) {
    if (Date.now() < geminiUnavailableUntil) return null;
    try {
      return await askCoach(GEMINI_COACH_URL, questionForCoach(question), GEMINI_TIMEOUT_MS);
    } catch (err) {
      geminiUnavailableUntil = Date.now() + COACH_RETRY_MS;
      return null;
    }
  }


  function resolveAnswer(entry) {
    if (entry.answerKey) return (topics[entry.answerKey] || '') + (entry.extra || '');
    return (entry.answer || '') + (entry.extra || '');
  }

  function scrollChat() {
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function addMessage(text, type = 'bot') {
    const bubble = document.createElement('div');
    bubble.className = `chat-msg ${type}`;
    bubble.textContent = text;
    chatEl.appendChild(bubble);
    scrollChat();
  }

  function showTyping(show) {
    typingEl.classList.toggle('active', show);
    if (show) scrollChat();
  }

  function reply(text, delay = 500) {
    const gen = talkGen;
    return new Promise((resolve) => {
      showTyping(true);
      setTimeout(() => {
        if (gen !== talkGen) {
          showTyping(false);
          resolve();
          return;
        }
        showTyping(false);
        addMessage(text, 'bot');
        resolve();
      }, delay);
    });
  }

  function findAnswer(question) {
    const q = question.toLowerCase().trim();
    if (!q) return source.emptyPrompt;

    let best = null;
    let bestScore = 0;

    knowledge.forEach((entry) => {
      let score = 0;
      (entry.keys || []).forEach((key) => {
        if (q.includes(key)) score += key.length;
      });
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });

    if (best && bestScore > 0) return resolveAnswer(best);
    return source.fallback;
  }

  async function handleUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage(trimmed, 'user');
    inputEl.value = '';
    showTyping(true);
    const remote = acceptCoachAnswer(await askGeminiCoach(trimmed));
    const answer = remote || findAnswer(trimmed);
    await reply(answer, 400 + Math.random() * 300);
  }

  async function runTutorial() {
    if (tutorialStarted) return;
    tutorialStarted = true;

    for (let i = 0; i < tutorial.length; i++) {
      await reply(tutorial[i], i === 0 ? 400 : 900);
    }
  }

  function onGameState(newState) {
    const tip = stateTips[newState];
    if (!tip || tip === lastContextMessage) return;
    lastContextMessage = tip;
    reply(tip, 700);
  }

  function onNarrativeStep(step) {
    if (narrativeHints[step]) reply(narrativeHints[step], 500);
  }

  function notifyTriviaResult(isCorrect) {
    reply(isCorrect ? source.triviaCorrect : source.triviaWrong, 400);
  }

  function speakScenario(text) {
    if (!text) return Promise.resolve();
    return reply(text, 350);
  }

  async function explainScenarioHint(predefinedHint, aiQuestion) {
    if (predefinedHint) await reply(predefinedHint, 300);
    if (!aiQuestion) return;

    const extra = acceptCoachAnswer(await askGeminiCoach(aiQuestion));
    if (extra && extra !== predefinedHint) {
      await reply(extra, 400);
    }
  }

  sendBtn.addEventListener('click', () => handleUserMessage(inputEl.value));
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUserMessage(inputEl.value);
    }
  });

  topicBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const topic = btn.dataset.topic;
      addMessage(btn.textContent, 'user');
      reply(topics[topic] || topics.tutorial, 500);
    });
  });

  setTimeout(runTutorial, 600);

  function clearChat() {
    chatEl.innerHTML = '';
    lastContextMessage = '';
    showTyping(false);
  }

  async function retell(gameState) {
    talkGen += 1;
    const gen = talkGen;
    clearChat();
    tutorialStarted = true;
    for (let i = 0; i < tutorial.length; i++) {
      if (gen !== talkGen) return;
      await reply(tutorial[i], i === 0 ? 250 : 650);
    }
    if (gen !== talkGen) return;
    const tip = stateTips[gameState];
    if (tip) {
      lastContextMessage = tip;
      await reply(tip, 450);
    }
  }

  function setPack(next) {
    source = next || {};
    topics = source.topics || {};
    knowledge = source.knowledge || [];
    stateTips = source.stateTips || {};
    tutorial = source.tutorial || [];
    narrativeHints = source.narrativeHints || [];
    lastContextMessage = '';
  }

  return {
    onGameState,
    onNarrativeStep,
    notifyTriviaResult,
    speakScenario,
    explainScenarioHint,
    reply,
    addMessage,
    setPack,
    retell
  };
};
