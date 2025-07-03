const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Needed for /api/tts JSON
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer config
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Utility: Convert UTC to IST
function toIST(utcDate) {
  const istDate = new Date(new Date(utcDate).getTime() + 5.5 * 3600000);
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// Routes
app.get('/', (req, res) => {
  res.render('form', { error: null });
});

app.post('/submit', upload.single('audioFile'), async (req, res) => {
  const { textInput } = req.body;
  const file = req.file;

  if (!file && !textInput) {
    return res.render('form', { error: 'Please upload a file or enter text.' });
  }

  try {
    let filename;
    if (file) {
      filename = file.filename;
    } else {
      // API call to local endpoint to generate TTS
      const response = await fetch('http://localhost:' + PORT + '/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput, lang: 'en-us' }) // you can change lang dynamically
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      filename = data.filename;
    }

    db.run(`INSERT INTO audios (filename, text) VALUES (?, ?)`, [filename, textInput || ''], err => {
      if (err) return res.render('form', { error: 'Database error.' });
      res.redirect('/uploads');
    });
  } catch (err) {
    console.error(err);
    res.render('form', { error: 'TTS conversion failed.' });
  }
});

app.get('/uploads', (req, res) => {
  db.all(`SELECT * FROM audios ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.send('DB error');

    const audios = rows.map(row => ({
      filename: row.filename,
      text: row.text || '',
      created_at: toIST(row.created_at)
    }));

    res.render('list', { audios });
  });
});

// Register TTS API route
const ttsRoute = require('./routes/tts');
app.use('/api/tts', ttsRoute);

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
