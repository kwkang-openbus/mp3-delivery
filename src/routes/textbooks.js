const express = require('express');
const router = express.Router();
const { searchTextbooks } = require('../db');

// GET /api/textbooks?q=keyword&language=japanese
router.get('/', (req, res) => {
  const { q, language } = req.query;

  const textbooks = searchTextbooks(q?.trim() || '', language);
  res.json(textbooks);
});

module.exports = router;
