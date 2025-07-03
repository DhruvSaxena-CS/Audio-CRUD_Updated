const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Uploads directory
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Set view engine
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer config
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// IST time converter
function toIST(utcDate) {
  const istDate = new Date(new Date(utcDate).getTime() + 5.5 * 3600000);
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// Home page: form
app.get('/', (req, res) => {
  res.render('index', { error: null });
});

// Submit text or file
app.post('/submit', upload.single('audioFile'), async (req, res) => {
  const { textInput, lang } = req.body;
  const file = req.file;

  if (!file && !textInput) {
    return res.render('index', { error: 'Please upload a file or enter text.' });
  }

  try {
    let filename;
    let originalText = textInput || '';

    if (file) {
      filename = file.filename;
    } else {
      const response = await fetch(`http://localhost:${PORT}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput, lang })
      });

      const result = await response.json();
      if (result.error || !result.filename) {
        throw new Error('TTS failed');
      }

      filename = result.filename;
    }

    db.run(`INSERT INTO audios (filename, text) VALUES (?, ?)`, [filename, originalText], err => {
      if (err) return res.render('index', { error: 'Database error.' });
      res.redirect('/uploads');
    });
  } catch (err) {
    console.error(err);
    res.render('index', { error: 'TTS conversion failed.' });
  }
});

// Audio preview for text (optional route, not used yet)
app.post('/preview', async (req, res) => {
  const { textInput, lang } = req.body;

  try {
    const response = await fetch(`http://localhost:${PORT}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textInput, lang })
    });

    const result = await response.json();
    if (result.error || !result.filename) {
      return res.json({ error: 'Preview failed' });
    }

    const previewPath = `/uploads/${result.filename}`;
    setTimeout(() => fs.unlink(path.join(UPLOAD_DIR, result.filename), () => {}), 60000);

    res.json({ previewPath });
  } catch (err) {
    console.error(err);
    res.json({ error: 'TTS preview failed' });
  }
});

// List uploaded/generated audios
app.get('/uploads', (req, res) => {
  db.all(`SELECT * FROM audios ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.send('DB error');

    const audios = rows.map(row => ({
      filename: row.filename,
      text: row.text,
      created_at: toIST(row.created_at)
    }));

    res.render('list', { audios });
  });
});

// Mount API route for TTS
const ttsRoute = require('./routes/tts');
app.use('/api/tts', ttsRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
