
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const MAX_QUESTION_LENGTH = 500;
const MAX_BODY_BYTES = 4096;

const SYSTEM_PROMPT = `You are Coach Pulse, the in-game CPR and first-aid assistant for CPR HERO, an educational arcade game.

Stay in character. Keep answers short (2–5 sentences) so they fit a retro chat panel.

GAME FACTS (treat these as true for this game):
{game_facts}

RULES:
- Teach public, basic first aid and CPR awareness only (call emergency services, scene safety, 100–120 compressions per minute, this game uses 110 BPM).
- For any real emergency, tell the player to call their local emergency number (911 / 112 / 119) and get trained help. You are not a doctor and this game is not a substitute for certified CPR training.
- Do not invent advanced medical procedures, medications, dosages, or treatment instructions beyond simple public first-aid basics already in the facts above.
- If the player asks something unrelated to CPR, first aid, emergencies, or how to play CPR HERO, briefly say you only coach those topics and point them to a topic button (Tutorial, CPR Basics, How to Play, First Aid, Call 911).
- Use a calm, encouraging coach tone. No gore. No markdown headings.`;

async function getCoachData(env, request) {
  const url = new URL("/data/coach.json", request.url);
  const response = await env.ASSETS.fetch(new Request(url));

  if (!response.ok) {
    throw new Error("Coach data unavailable");
  }

  return response.json();
}

function buildGameFacts(coach) {
  const topics = coach.topics || {};
  const lines = Object.values(topics).filter(Boolean).map(String);

  for (const entry of coach.knowledge || []) {
    if (entry.answer) {
      lines.push(String(entry.answer) + String(entry.extra || ""));
    }
  }

  lines.push(coach.fallback || "");
  return lines.join("\n");
}

async function handleCoachHealth(env) {
  return Response.json({
    status: env.OPENROUTER_API_KEY ? "ok" : "missing_key",
    service: "gemini-coach"
  });
}

async function handleCoachAsk(request, env) {
  const length = Number(request.headers.get("Content-Length") || 0);

  if (length > MAX_BODY_BYTES) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = typeof payload.question === "string"
    ? payload.question.trim().slice(0, MAX_QUESTION_LENGTH)
    : "";

  let coach;

  try {
    coach = await getCoachData(env, request);
  } catch {
    return Response.json({ error: "Coach data unavailable" }, { status: 500 });
  }

  if (!question) {
    return Response.json({
      answer: coach.emptyPrompt || "Type a question and I'll help.",
      source: "gemini"
    });
  }

  if (!env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "Coach service is not configured" },
      { status: 503 }
    );
  }

  const system = SYSTEM_PROMPT.replace(
    "{game_facts}",
    buildGameFacts(coach)
  );

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cpr-hero-app.cprhero.workers.dev",
        "X-Title": "CPR HERO Coach Pulse"
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 220,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      console.error("OpenRouter returned HTTP", response.status);
      return Response.json(
        { error: "Coach request failed" },
        { status: 502 }
      );
    }

    const result = await response.json();
    let answer = result?.choices?.[0]?.message?.content;

    if (Array.isArray(answer)) {
      answer = answer.map(item =>
        typeof item === "string" ? item : item?.text || ""
      ).join("");
    }

    if (typeof answer !== "string" || !answer.trim()) {
      answer = coach.fallback || "I am not sure about that one yet.";
    }

    return Response.json({
      answer: answer.trim(),
      source: "gemini"
    });

  } catch (error) {
    console.error("Coach request failed:", error.name || "Unknown error");

    return Response.json(
      { error: "Coach request failed" },
      { status: 502 }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/coach/health" && request.method === "GET") {
      return handleCoachHealth(env);
    }

    if (url.pathname === "/api/coach/ask" && request.method === "POST") {
      return handleCoachAsk(request, env);
    }

    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      try {
        const { results } = await env.DB
          .prepare("SELECT name, score FROM scores ORDER BY score DESC LIMIT 5")
          .all();

        return Response.json(results);
      } catch {
        return Response.json(
          { error: "Failed to load leaderboard" },
          { status: 500 }
        );
      }
    }

    if (url.pathname === "/api/score" && request.method === "POST") {
      try {
        const body = await request.json();
        const { name, score } = body;

        if (
          typeof name !== "string" ||
          !name.trim() ||
          !Number.isSafeInteger(score) ||
          score < 0
        ) {
          return Response.json(
            { error: "A valid name and score are required." },
            { status: 400 }
          );
        }

        const cleanName = name.trim().toUpperCase().substring(0, 10);

        await env.DB
          .prepare("INSERT INTO scores (name, score) VALUES (?, ?)")
          .bind(cleanName, score)
          .run();

        return Response.json({
          success: true,
          message: "Score saved securely to the database!"
        });
      } catch {
        return Response.json(
          { error: "Failed to save score" },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};

// GitHub automatic deployment test
