const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // 1. Import the database library

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files automatically from your 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 2. Establish connection to your SQLite Database File
// This will automatically create 'leaderboard.db' in your sidebar if it doesn't exist!
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

// Fallback: serve index.html for root route (Kept from your original snippet)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n🚀 CPR HERO server running smoothly at http://localhost:${PORT}`);
});