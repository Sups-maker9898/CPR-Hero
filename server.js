const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose(); // 1. Import the database library

const app = express();
const PORT = 8000;
const GEMINI_COACH_URL = process.env.GEMINI_COACH_URL || 'http://127.0.0.1:8081';

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// 2. Establish connection to your SQLite Database File
const db = new sqlite3.Database('./leaderboard.db', (err) => {
    if (err) {
        console.error("❌ Database connection error:", err.message);
    } else {
        console.log("📦 Connected to the SQLite leaderboard database successfully.");
    }
});

// 3. Create the Database Table structure automatically on startup
db.run(`
    CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        date TEXT DEFAULT CURRENT_TIMESTAMP
    )
`, () => {
    collapseDuplicateNames();
});

function cleanPlayerName(name) {
    return String(name || '').trim().toUpperCase().substring(0, 10);
}

// One row per name. A later game updates that row when the score is higher.
function collapseDuplicateNames() {
    db.all(`SELECT id, name, score FROM scores`, [], (err, rows) => {
        if (err || !rows || !rows.length) return;

        const bestByName = new Map();
        rows.forEach((row) => {
            const key = cleanPlayerName(row.name);
            if (!key) return;
            const current = bestByName.get(key);
            if (!current || row.score > current.score) {
                bestByName.set(key, { id: row.id, score: row.score, name: key });
            }
        });

        const keepIds = new Set();
        bestByName.forEach((row) => keepIds.add(row.id));

        db.serialize(() => {
            bestByName.forEach((row) => {
                db.run(`UPDATE scores SET name = ? WHERE id = ?`, [row.name, row.id]);
            });
            rows.forEach((row) => {
                if (!keepIds.has(row.id)) db.run(`DELETE FROM scores WHERE id = ?`, [row.id]);
            });
        });
    });
}

function saveScore(cleanName, cleanScore, callback) {
    db.get(
        `SELECT id, score FROM scores WHERE name = ? COLLATE NOCASE ORDER BY score DESC, id ASC LIMIT 1`,
        [cleanName],
        (err, row) => {
            if (err) return callback(err);

            if (!row) {
                db.run(
                    `INSERT INTO scores (name, score) VALUES (?, ?)`,
                    [cleanName, cleanScore],
                    callback
                );
                return;
            }

            const finish = (updateErr) => {
                if (updateErr) return callback(updateErr);
                db.run(
                    `DELETE FROM scores WHERE name = ? COLLATE NOCASE AND id != ?`,
                    [cleanName, row.id],
                    callback
                );
            };

            if (cleanScore > row.score) {
                db.run(
                    `UPDATE scores SET name = ?, score = ?, date = CURRENT_TIMESTAMP WHERE id = ?`,
                    [cleanName, cleanScore, row.id],
                    finish
                );
                return;
            }

            db.run(`UPDATE scores SET name = ? WHERE id = ?`, [cleanName, row.id], finish);
        }
    );
}

// 4. API Endpoint: Fetch Top 5 High Scores (Sorted Highest to Lowest)
app.get('/api/leaderboard', (req, res) => {
    const sql = `SELECT name, MAX(score) AS score FROM scores GROUP BY name ORDER BY score DESC LIMIT 5`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Sends data back to the frontend loop
    });
});

// 5. API Endpoint: Save a score under the player's name
app.post('/api/score', (req, res) => {
    const { name, score } = req.body;

    if (!name || score === undefined) {
        return res.status(400).json({ error: "Name and score are required." });
    }

    const cleanName = cleanPlayerName(name);
    const cleanScore = Math.round(Number(score));
    if (!cleanName || !Number.isFinite(cleanScore)) {
        return res.status(400).json({ error: "Name and score are required." });
    }

    saveScore(cleanName, cleanScore, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: "Score saved securely to the database!" });
    });
});

// Gemini Coach Pulse proxy — browser never sees the API key
app.post('/api/coach/ask', async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question : '';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${GEMINI_COACH_URL}/api/coach/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
            signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));
        res.status(response.status).json(data);
    } catch (err) {
        res.status(503).json({ error: 'Gemini coach unavailable' });
    } finally {
        clearTimeout(timer);
    }
});

// Fallback: serve index.html for root route (Kept from your original snippet)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function lanAddresses() {
    const nets = os.networkInterfaces();
    const addresses = [];
    Object.values(nets).forEach((ifaces) => {
        (ifaces || []).forEach((iface) => {
            if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                addresses.push(iface.address);
            }
        });
    });
    return addresses;
}

// Listen on all interfaces so a phone on the same Wi-Fi can open the game
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 CPR HERO is running`);
    console.log(`   Laptop:  http://localhost:${PORT}`);
    const ips = lanAddresses();
    if (ips.length) {
        ips.forEach((ip) => {
            console.log(`   Phone:   http://${ip}:${PORT}`);
        });
        console.log(`   Same Wi-Fi required. On iPhone/Android, open that Phone URL, then Add to Home Screen.`);
    } else {
        console.log(`   No LAN address found. Connect this PC to Wi-Fi, then restart the server for phone access.`);
    }
});