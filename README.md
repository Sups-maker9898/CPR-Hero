# CPR HERO

An interactive, educational 2D retro arcade game that teaches the critical importance of First Aid and the step-by-step process of administering CPR at a life-saving rhythm.

## Features

- **110 BPM rhythm minigame** mapped to real-world CPR compression guidelines
- **Intro narrative** with emergency call-to-action (Call 911)
- **Oxygen & lives system** with first-aid trivia safety net on failure
- **Score tracking** with streak milestone bonuses and global leaderboard
- **Responsive controls** — Spacebar on desktop, tap on mobile

## Tech Stack

- **Backend:** Node.js + Express + SQLite leaderboard
- **Frontend:** HTML + CSS + modular JavaScript + JSON content files
- **AI Coach (optional):** Python + Google Gemini, with Java keyword matching and built-in JSON as fallbacks

## Quick Start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project files

| Path | Role |
|------|------|
| `public/index.html` | Page layout only (same look as before) |
| `public/css/style.css` | All visual styling |
| `public/js/game.js` | Game loop, screens, drawing, input |
| `public/js/rhythm.js` | 110 BPM timing math |
| `public/js/trivia.js` | Trivia question rotation |
| `public/js/coach.js` | Coach Pulse assistant |
| `public/js/scenario.js` | Emergency Scenario Mode engine (JSON rules, not AI) |
| `public/js/leaderboard.js` | Score API calls |
| `public/data/trivia.json` | Trivia questions |
| `public/data/story.json` | Intro story text |
| `public/data/coach.json` | Tutorial, tips, and first-aid answers |
| `public/data/scenarios.json` | Scenario Mode branching, scoring, and reviewed feedback |
| `server.js` | Node.js + Express + SQLite (unchanged) |
| `java/CoachServer.java` | Optional Java Coach service (keyword answers) |
| `python/coach_server.py` | Optional Gemini Coach Pulse service |
| `.env.example` | Template for `GEMINI_API_KEY` (copy to `.env`) |

## Optional: Gemini Coach (Python)

Requires Python 3.9+ and a [Gemini API key](https://aistudio.google.com/apikey). The key stays in `.env` on the server — it is never sent to the browser.

```bash
copy .env.example .env
```

Put your key in `.env` as `GEMINI_API_KEY=...`, then in a second terminal:

```bash
py -3 -m venv python/.venv
python\.venv\Scripts\python.exe -m pip install -r python/requirements.txt
python\.venv\Scripts\python.exe python/coach_server.py
```

It listens on port 8081. Node.js proxies `POST /api/coach/ask` to it, so phones on the same Wi-Fi work through port 3000. Typed Coach Pulse questions use Gemini first, then Java (if running), then the built-in `coach.json` answers.

## Optional: Java Coach service

Requires Java 11 or newer. No Maven or extra installs are needed. Run it in a second terminal from the project folder:

```bash
java java/CoachServer.java
```

It listens on port 8080 and reads `public/data/coach.json`. When it is running, typed Coach Pulse questions are answered by Java. When it is not running, the game uses its built-in answers, and nothing else changes.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Returns top 10 high scores |
| POST | `/api/score` | Submits a new score entry |
| POST | `/api/coach/ask` | Proxies a Coach Pulse question to the Gemini Python service |

## Score Formula

```
Total = Compression Points + (Trivia Correct × 50) + (Time Remaining × 5)
```

- Each Perfect compression: +10 points (+20 with 2× streak multiplier after 10 consecutive Perfects)
- Each correct trivia answer: +50 points
- Each second remaining on win: +5 points

## Game Flow

1. Enter hero name → backend creates a temporary session
2. Intro cutscene → tap Call 911 → 2:00 timer starts
3. CPR rhythm at 110 BPM — keep oxygen up with perfect timing
4. Every 30 compressions → Rescue Breath intermission (tap to fill lungs)
5. Oxygen hits 0% → trivia safety net (revive at 50% health on correct answer)
6. Win when timer hits 0:00 (ambulance + paramedic thumbs-up) or lose all 3 lives
7. Score auto-submitted to leaderboard

**Emergency Scenario Mode** is a separate path from the home screen (`SCENARIO MODE`). Branching and XP come from `public/data/scenarios.json`. Coach Pulse only explains; it cannot change the correct answer.

## Notes

- Leaderboard data is stored in-memory and resets when the server restarts.
- Game duration is 120 seconds (2-minute ambulance arrival window).
- Target rhythm: 110 BPM (~545 ms per beat).
