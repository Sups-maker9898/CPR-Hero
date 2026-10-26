window.CPRHero = window.CPRHero || {};

/**
 * Emergency Scenario Mode engine — dialogue branching.
 * Scoring, medical correctness, and next-steps come ONLY from scenarios.json.
 * AI/Coach Pulse may explain, never award XP or override outcomes.
 */
window.CPRHero.createScenarioEngine = function createScenarioEngine(pack) {
  const catalog = pack.catalog || [];
  const scenarios = pack.scenarios || {};

  let scenario = null;
  let nodeId = null;
  let xp = 0;
  let mistakes = [];
  let completed = [];
  let history = [];
  let flags = {};
  let firstAttempt = true;
  let resolved = false;
  let lastChoice = null;

  function currentNode() {
    if (!scenario || !nodeId) return null;
    return scenario.nodes[nodeId] || null;
  }

  function choicesOf(node) {
    if (!node) return [];
    return (node.choices || node.options || []).slice();
  }

  function visibleLines(node) {
    if (!node) return [];
    return (node.lines || []).filter((line) => {
      if (line.ifFlag && !flags[line.ifFlag]) return false;
      if (line.unlessFlag && flags[line.unlessFlag]) return false;
      return true;
    });
  }

  function pushHistory(entry) {
    history.push({
      speaker: entry.speaker || 'NARRATOR',
      text: entry.text || '',
      kind: entry.kind || 'line',
      result: entry.result || ''
    });
  }

  function snapshot() {
    const node = currentNode();
    return {
      scenario: scenario,
      node: node,
      lines: visibleLines(node),
      options: choicesOf(node),
      xp: xp,
      mistakes: mistakes.slice(),
      completed: completed.slice(),
      history: history.slice(),
      flags: Object.assign({}, flags),
      firstAttempt: firstAttempt,
      resolved: resolved,
      lastChoice: lastChoice,
      totalSteps: scenario ? scenario.totalSteps : 0,
      scene: node ? node.scene : 'street-traffic'
    };
  }

  function start(scenarioId) {
    scenario = scenarios[scenarioId];
    if (!scenario) return null;
    nodeId = scenario.start;
    xp = 0;
    mistakes = [];
    completed = [];
    history = [];
    flags = {};
    firstAttempt = true;
    resolved = false;
    lastChoice = null;
    return snapshot();
  }

  function restart() {
    if (!scenario) return null;
    return start(scenario.id);
  }

  function logLine(line, kind) {
    if (!line) return;
    pushHistory({ speaker: line.speaker, text: line.text, kind: kind || 'line' });
  }

  function choose(optionId) {
    const node = currentNode();
    if (!node || node.kind === 'talk' || resolved) {
      return { error: 'locked', snapshot: snapshot() };
    }

    const option = choicesOf(node).find((item) => item.id === optionId);
    if (!option) {
      return { error: 'unknown', snapshot: snapshot() };
    }

    lastChoice = option;
    pushHistory({
      speaker: 'YOU',
      text: option.playerLine || option.label,
      kind: 'choice',
      result: option.result
    });

    if (option.result !== 'correct') {
      firstAttempt = false;
      mistakes.push({
        step: node.step,
        title: node.title,
        choice: option.label,
        result: option.result,
        feedback: option.feedback || (option.reply && option.reply[option.reply.length - 1] && option.reply[option.reply.length - 1].text) || ''
      });
      return {
        result: option.result,
        option: option,
        reply: option.reply || [],
        canAdvance: false,
        snapshot: snapshot()
      };
    }

    if (firstAttempt) {
      xp += option.xp || 0;
    }

    (option.flags || []).forEach((flag) => { flags[flag] = true; });
    resolved = true;
    completed.push({
      step: node.step,
      title: node.title,
      firstTry: firstAttempt
    });

    return {
      result: 'correct',
      option: option,
      reply: option.reply || [],
      canAdvance: true,
      next: option.next,
      snapshot: snapshot()
    };
  }

  function finishTalk() {
    const node = currentNode();
    if (!node || node.kind !== 'talk') {
      return { error: 'not-talk', snapshot: snapshot() };
    }
    resolved = true;
    lastChoice = { result: 'correct', next: node.next };
    return { ok: true, snapshot: snapshot() };
  }

  function nextStep() {
    const node = currentNode();
    if (!node || !resolved || !lastChoice || lastChoice.result !== 'correct') {
      return { error: 'not-ready', snapshot: snapshot() };
    }

    const nextId = lastChoice.next;
    if (nextId === 'COMPLETE') {
      return { complete: true, report: report(), snapshot: snapshot() };
    }

    nodeId = nextId;
    firstAttempt = true;
    resolved = false;
    lastChoice = null;
    return { complete: false, snapshot: snapshot() };
  }

  function report() {
    return {
      title: scenario ? scenario.title : '',
      xp: xp,
      maxXp: scenario ? scenario.totalSteps * 20 : 0,
      completed: completed.slice(),
      mistakes: mistakes.slice(),
      history: history.slice(),
      learningPoints: (scenario && scenario.learningPoints) || [],
      scene: 'ambulance'
    };
  }

  return {
    catalog: catalog,
    start: start,
    restart: restart,
    choose: choose,
    finishTalk: finishTalk,
    nextStep: nextStep,
    snapshot: snapshot,
    report: report,
    currentNode: currentNode,
    logLine: logLine
  };
};
