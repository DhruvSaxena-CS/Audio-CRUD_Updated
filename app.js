const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer config
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// TTS using Python gTTS
function convertTextToAudio(text) {
  return new Promise((resolve, reject) => {
    execFile('python3', ['text_to_speech.py', text], (err, stdout, stderr) => {
      if (err) {
        console.error('TTS Error:', stderr);
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// Convert UTC to IST
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
      filename = await convertTextToAudio(textInput);
    }

    db.run(`INSERT INTO audios (filename) VALUES (?)`, [filename], err => {
      if (err) return res.render('form', { error: 'Database error.' });
      res.redirect('/uploads');
    });
  } catch (err) {
    console.error(err);
    res.render('form', { error: 'TTS conversion failed.' });
  }
});

app.post('/preview', upload.single('audioFile'), async (req, res) => {
  const { textInput } = req.body;

  try {
    if (textInput) {
      const filename = await convertTextToAudio(textInput);
      const previewPath = `/uploads/${filename}`;

      // Cleanup preview file after 1 min
      setTimeout(() => fs.unlink(path.join(UPLOAD_DIR, filename), () => {}), 60000);

      res.json({ previewPath });
    } else {
      res.json({ error: 'No text input' });
    }
  } catch (err) {
    console.error(err);
    res.json({ error: 'TTS preview failed' });
  }
});

app.get('/uploads', (req, res) => {
  db.all(`SELECT * FROM audios ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.send('DB error');

    const audios = rows.map(row => ({
      filename: row.filename,
      created_at: toIST(row.created_at)
    }));

    res.render('list-audio', { audios });
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
