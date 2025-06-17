const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./audio.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS audios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;
