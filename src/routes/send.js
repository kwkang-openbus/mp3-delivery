const express = require('express');
const router = express.Router();
const { getTextbookById, addHistory } = require('../db');
const { sendMP3 } = require('../mailer');

// Rate limiter: IP당 15분에 5회 제한
const rateMap = new Map();
const RATE_WINDOW = 15 * 60 * 1000;
const RATE_MAX = 5;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return next();
  }
  if (entry.count >= RATE_MAX) {
    return res.status(429).json({ error: '요청이 너무 많습니다. 15분 후 다시 시도해주세요.' });
  }
  entry.count++;
  next();
}

// POST /api/send
router.post('/', rateLimit, async (req, res) => {
  const { textbookId, email } = req.body;

  if (!textbookId || !email) {
    return res.status(400).json({ error: '교재와 이메일을 모두 입력해주세요.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '올바른 이메일 주소를 입력해주세요.' });
  }

  const textbook = getTextbookById(textbookId);
  if (!textbook) {
    return res.status(404).json({ error: '교재를 찾을 수 없습니다.' });
  }

  if (!textbook.mp3_filename) {
    return res.status(400).json({ error: '이 교재에는 MP3 파일이 없습니다.' });
  }

  try {
    await sendMP3(email, textbook);
    addHistory(textbook.id, textbook.title, email, 'success');
    res.json({ success: true, message: `${email}로 MP3를 전송했습니다!` });
  } catch (err) {
    addHistory(textbook.id, textbook.title, email, 'failed', err.message);
    console.error('이메일 발송 오류:', err);
    res.status(500).json({ error: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

module.exports = router;
