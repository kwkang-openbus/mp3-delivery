const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getAllTextbooks, getTextbookById, createTextbook, updateTextbook, deleteTextbook,
  getHistory, getStats
} = require('../db');

// Multer: MP3 업로드 설정
const mp3Storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../data/mp3');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}.mp3`);
  }
});
const upload = multer({
  storage: mp3Storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('MP3 파일만 업로드할 수 있습니다.'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 인증 미들웨어
function requireAuth(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === (process.env.ADMIN_USER || 'admin') &&
    password === (process.env.ADMIN_PASSWORD || 'admin123')
  ) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/admin/me
router.get('/me', (req, res) => {
  res.json({ isAdmin: !!req.session?.isAdmin });
});

// GET /api/admin/stats
router.get('/stats', requireAuth, (req, res) => {
  res.json(getStats());
});

// GET /api/admin/textbooks
router.get('/textbooks', requireAuth, (req, res) => {
  res.json(getAllTextbooks());
});

// POST /api/admin/textbooks
router.post('/textbooks', requireAuth, upload.single('mp3'), (req, res) => {
  const { title, language, level, publisher, description } = req.body;

  if (!title || !language) {
    return res.status(400).json({ error: '제목과 언어는 필수입니다.' });
  }

  const mp3_filename = req.file ? req.file.filename : null;
  const mp3_size = req.file ? req.file.size : 0;

  const textbook = createTextbook({ title, language, level, publisher, description, mp3_filename, mp3_size });
  res.status(201).json(textbook);
});

// PUT /api/admin/textbooks/:id
router.put('/textbooks/:id', requireAuth, upload.single('mp3'), (req, res) => {
  const { id } = req.params;
  const existing = getTextbookById(id);
  if (!existing) return res.status(404).json({ error: '교재를 찾을 수 없습니다.' });

  const { title, language, level, publisher, description } = req.body;

  // 새 파일이 업로드되면 기존 파일 삭제
  let mp3_filename = null;
  let mp3_size = null;
  if (req.file) {
    mp3_filename = req.file.filename;
    mp3_size = req.file.size;
    if (existing.mp3_filename) {
      const oldPath = path.join(__dirname, '../../data/mp3', existing.mp3_filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  }

  const textbook = updateTextbook(id, { title, language, level, publisher, description, mp3_filename, mp3_size });
  res.json(textbook);
});

// DELETE /api/admin/textbooks/:id
router.delete('/textbooks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = getTextbookById(id);
  if (!existing) return res.status(404).json({ error: '교재를 찾을 수 없습니다.' });

  if (existing.mp3_filename) {
    const filePath = path.join(__dirname, '../../data/mp3', existing.mp3_filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  deleteTextbook(id);
  res.json({ success: true });
});

// GET /api/admin/history
router.get('/history', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(getHistory(limit));
});

module.exports = router;
