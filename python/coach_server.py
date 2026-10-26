#!/usr/bin/env python3
"""CPR HERO - Coach Pulse service (OpenRouter + Gemini).

Answers typed Coach Pulse questions with OpenRouter
(`google/gemini-2.5-flash` by default), using coach.json as game-rule
ground truth. Runs beside Node.js (port 3000).

From the project folder:
  python\\.venv\\Scripts\\python.exe python/coach_server.py

INSTRUCTION (do not remove):
- Endpoint: https://openrouter.ai/api/v1/chat/completions
- Read OPENROUTER_API_KEY from the root .env file.
- Read OPENROUTER_MODEL from .env, default to google/gemini-2.5-flash.
- Use Python's built-in urllib.request for HTTP requests.
- Preserve /api/coach/health and /api/coach/ask, port 8081, request and
  response formats, and coach.json integration.
- Preserve the CPR/first-aid-only system prompt and safety restrictions.
- Parse the response from choices[0].message.content.
- Handle API errors clearly without exposing the API key.
- Do not hardcode secrets.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

PORT = int(os.environ.get("GEMINI_COACH_PORT", "8081"))
MAX_BODY_BYTES = 4096
MAX_QUESTION_LENGTH = 500
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.environ.get("OPENROUTER_MODEL", "google/gemini-2.5-flash").strip() or "google/gemini-2.5-flash"

SYSTEM_PROMPT = """You are Coach Pulse, the in-game CPR and first-aid assistant for CPR HERO, an educational arcade game.

Stay in character. Keep answers short (2–5 sentences) so they fit a retro chat panel.

GAME FACTS (treat these as true for this game):
{game_facts}

RULES:
- Teach public, basic first aid and CPR awareness only (call emergency services, scene safety, 100–120 compressions per minute, this game uses 110 BPM).
- For any real emergency, tell the player to call their local emergency number (911 / 112 / 119) and get trained help. You are not a doctor and this game is not a substitute for certified CPR training.
- Do not invent advanced medical procedures, medications, dosages, or "how to treat" instructions beyond simple public first-aid basics already in the facts above.
- If the player asks something unrelated to CPR, first aid, emergencies, or how to play CPR HERO, briefly say you only coach those topics and point them to a topic button (Tutorial, CPR Basics, How to Play, First Aid, Call 911).
- Use a calm, encouraging coach tone. No gore. No markdown headings.
"""


def find_coach_data() -> Path:
    for candidate in (
        ROOT / "public" / "data" / "coach.json",
        Path("public") / "data" / "coach.json",
        Path("..") / "public" / "data" / "coach.json",
    ):
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("coach.json not found. Run this from the project folder.")


def build_game_facts(coach: dict) -> str:
    topics = coach.get("topics") or {}
    lines = [str(v) for v in topics.values() if v]
    for entry in coach.get("knowledge") or []:
        extra = entry.get("extra") or ""
        if entry.get("answer"):
            lines.append(str(entry["answer"]) + str(extra))
    lines.append(coach.get("fallback") or "")
    return "\n".join(lines)


def json_bytes(payload: dict, status: int = 200) -> tuple[int, bytes]:
    return status, json.dumps(payload).encode("utf-8")


def redact_secret(text: str, api_key: str) -> str:
    if not api_key:
        return text
    return text.replace(api_key, "[REDACTED]")


def ask_openrouter(question: str, system: str, api_key: str) -> str:
    body = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.3,
            "max_tokens": 220,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": question},
            ],
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        OPENROUTER_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": "Bearer %s" % api_key,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "CPR HERO Coach Pulse",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        detail = redact_secret(raw, api_key)
        try:
            message = json.loads(detail).get("error", {}).get("message") or detail
        except json.JSONDecodeError:
            message = detail
        raise RuntimeError("OpenRouter HTTP %s: %s" % (err.code, str(message)[:300])) from None
    except urllib.error.URLError as err:
        raise RuntimeError("OpenRouter unreachable: %s" % redact_secret(str(err.reason), api_key)) from None

    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError("OpenRouter response missing choices[0].message.content") from None

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("text"):
                parts.append(str(item["text"]))
            elif isinstance(item, str):
                parts.append(item)
        content = "".join(parts)

    if not isinstance(content, str):
        raise RuntimeError("OpenRouter content was not a string")

    return content.strip()


class CoachHandler(BaseHTTPRequestHandler):
    coach: dict = {}
    game_facts: str = ""
    api_key: str = ""

    def log_message(self, fmt: str, *args) -> None:
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send(self, status: int, body: bytes, content_type: str = "application/json; charset=utf-8") -> None:
        self.send_response(status)
        self._cors()
        if status == 204:
            self.end_headers()
            return
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(204, b"")

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] != "/api/coach/health":
            self._send(*json_bytes({"error": "Not found"}, 404))
            return
        ready = bool(self.api_key)
        self._send(*json_bytes({"status": "ok" if ready else "missing_key", "service": "gemini-coach"}))

    def do_POST(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] != "/api/coach/ask":
            self._send(*json_bytes({"error": "Not found"}, 404))
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY_BYTES:
            self._send(*json_bytes({"error": "Request too large"}, 413))
            return

        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
            question = str(payload.get("question") or "")
        except (UnicodeDecodeError, json.JSONDecodeError, TypeError):
            self._send(*json_bytes({"error": "Invalid JSON"}, 400))
            return

        question = question.strip()[:MAX_QUESTION_LENGTH]
        if not question:
            empty = str(self.coach.get("emptyPrompt") or "Type a question and I'll help.")
            self._send(*json_bytes({"answer": empty, "source": "gemini"}))
            return

        if not self.api_key:
            self._send(*json_bytes({"error": "OPENROUTER_API_KEY is not set"}, 503))
            return

        try:
            answer = ask_openrouter(
                question,
                SYSTEM_PROMPT.format(game_facts=self.game_facts),
                self.api_key,
            )
        except Exception as err:
            print("OpenRouter error:", redact_secret(str(err), self.api_key), file=sys.stderr)
            self._send(*json_bytes({"error": "Coach request failed"}, 502))
            return

        if not answer:
            answer = str(self.coach.get("fallback") or "I am not sure about that one yet.")

        self._send(*json_bytes({"answer": answer, "source": "gemini"}))


def main() -> None:
    data_path = find_coach_data()
    coach = json.loads(data_path.read_text(encoding="utf-8"))
    api_key = (os.environ.get("OPENROUTER_API_KEY") or "").strip()

    CoachHandler.coach = coach
    CoachHandler.game_facts = build_game_facts(coach)
    CoachHandler.api_key = api_key

    server = ThreadingHTTPServer(("0.0.0.0", PORT), CoachHandler)
    print()
    print("CPR HERO Gemini Coach is running")
    print("   Coach API: http://localhost:%s/api/coach/ask" % PORT)
    print("   Data file: %s" % data_path.resolve())
    print("   Model: %s" % MODEL)
    if not api_key:
        print("   WARNING: OPENROUTER_API_KEY is missing. Copy .env.example to .env and add your key.")
    print("   Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGemini Coach stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
