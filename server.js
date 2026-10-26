const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose(); // 1. Import the database library

const app = express();
const PORT = 3000;
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
`);

// 4. API Endpoint: Fetch Top 5 High Scores (Sorted Highest to Lowest)
app.get('/api/leaderboard', (req, res) => {
    const sql = `SELECT name, score FROM scores ORDER BY score DESC LIMIT 5`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Sends data back to the frontend loop
    });
});

// 5. API Endpoint: Insert a New Score into the Database
app.post('/api/score', (req, res) => {
    const { name, score } = req.body;
    
    if (!name || score === undefined) {
        return res.status(400).json({ error: "Name and score are required." });
    }

    const cleanName = name.toUpperCase().substring(0, 10);
    const sql = `INSERT INTO scores (name, score) VALUES (?, ?)`;
    
    db.run(sql, [cleanName, score], function(err) {
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