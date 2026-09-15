# CPR HERO

An interactive, educational 2D retro arcade game that teaches the critical importance of First Aid and the step-by-step process of administering CPR at a life-saving rhythm.

## Features

- **110 BPM rhythm minigame** mapped to real-world CPR compression guidelines
- **Intro narrative** with emergency call-to-action (Call 911)
- **Oxygen & lives system** with first-aid trivia safety net on failure
- **Score tracking** with streak milestone bonuses and global leaderboard
- **Responsive controls** — Spacebar on desktop, tap on mobile

## Tech Stack

- **Backend:** Node.js + Express (in-memory leaderboard)
- **Frontend:** HTML5 Canvas + vanilla JavaScript (single-file game engine)

## Quick Start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Returns top 10 high scores |
| POST | `/api/score` | Submits a new score entry |

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

## Notes

- Leaderboard data is stored in-memory and resets when the server restarts.
- Game duration is 120 seconds (2-minute ambulance arrival window).
- Target rhythm: 110 BPM (~545 ms per beat).
