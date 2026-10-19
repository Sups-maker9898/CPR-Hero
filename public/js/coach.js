window.CPRHero = window.CPRHero || {};

CPRHero.createCoach = function createCoach(data) {
  const chatEl = document.getElementById('assistant-chat');
  const typingEl = document.getElementById('assistant-typing');
  const inputEl = document.getElementById('assistant-input');
  const sendBtn = document.getElementById('assistant-send');
  const topicBtns = document.querySelectorAll('.topic-chip');

  const topics = data.topics || {};
  const knowledge = data.knowledge || [];
  const stateTips = data.stateTips || {};
  const tutorial = data.tutorial || [];
  const narrativeHints = data.narrativeHints || [];

  const JAVA_COACH_URL = `${location.protocol}//${location.hostname}:8080/api/coach/ask`;
  const JAVA_RETRY_MS = 30000;

  let tutorialStarted = false;
  let lastContextMessage = '';
  let javaUnavailableUntil = 0;

  async function askJavaCoach(question) {
    if (location.protocol !== 'http:' || Date.now() < javaUnavailableUntil) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(JAVA_COACH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Java coach HTTP ${response.status}`);
      const result = await response.json();
      return typeof result.answer === 'string' && result.answer ? result.answer : null;
    } catch (err) {
      javaUnavailableUntil = Date.now() + JAVA_RETRY_MS;
      return null;
    } finally {
      clearTimeout(timer);
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
    return new Promise((resolve) => {
      showTyping(true);
      setTimeout(() => {
        showTyping(false);
        addMessage(text, 'bot');
        resolve();
      }, delay);
    });
  }

  function findAnswer(question) {
    const q = question.toLowerCase().trim();
    if (!q) return data.emptyPrompt;

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
    return data.fallback;
  }

  async function handleUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage(trimmed, 'user');
    inputEl.value = '';
    showTyping(true);
    const answer = (await askJavaCoach(trimmed)) || findAnswer(trimmed);
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
    reply(isCorrect ? data.triviaCorrect : data.triviaWrong, 400);
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

  return { onGameState, onNarrativeStep, notifyTriviaResult, reply, addMessage };
};
