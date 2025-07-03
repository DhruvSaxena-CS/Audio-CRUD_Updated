const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const Audio = require('../models/audio');

const VOICERSS_API_KEY = "ecfd3b9535f240d68bd6de490ecdf4f2";

const languageMap = {
  en: 'en-in',
  hi: 'hi-in',
  mr: 'mr-in',
};

router.post('/', async (req, res) => {
  const { text, language } = req.body;

  if (!text || !language) {
    return res.status(400).json({ error: 'Text and language are required' });
  }

  const hl = languageMap[language] || 'en-in';

  try {
    const response = await axios.get('https://api.voicerss.org/', {
      responseType: 'arraybuffer',
      params: {
        key: VOICERSS_API_KEY,
        hl,
        src: text,
        c: 'MP3',
        f: '44khz_16bit_stereo',
      },
    });

    const filename = `tts_${Date.now()}.mp3`;
    const filepath = path.join(__dirname, '../public/audio', filename);
    fs.writeFileSync(filepath, response.data);

    const newAudio = new Audio({
      filename,
      text,
      uploadedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    });

    await newAudio.save();

    res.status(200).json({ message: 'TTS conversion successful', filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'TTS conversion failed' });
  }
});

module.exports = router;
