const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'mp3'), { recursive: true });

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { textbooks: [], history: [], _nextId: { textbooks: 1, history: 1 } };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    writeDB({ textbooks: [], history: [], _nextId: { textbooks: 1, history: 1 } });
  }
  console.log('✅ 데이터베이스 초기화 완료');
}

function searchTextbooks(query, language) {
  const { textbooks } = readDB();
  return textbooks.filter(b => {
    const matchLang = !language || language === 'all' || b.language === language;
    if (!query || query.length < 2) return matchLang;
    const q = query.toLowerCase();
    const matchText = (b.title || '').toLowerCase().includes(q)
      || (b.publisher || '').toLowerCase().includes(q)
      || (b.description || '').toLowerCase().includes(q);
    return matchLang && matchText;
  }).sort((a, b) => a.language.localeCompare(b.language) || a.title.localeCompare(b.title));
}

function getAllTextbooks() {
  const { textbooks } = readDB();
  return [...textbooks].sort((a, b) => a.language.localeCompare(b.language) || a.title.localeCompare(b.title));
}

function getTextbookById(id) {
  const { textbooks } = readDB();
  return textbooks.find(b => b.id === Number(id)) || null;
}

function createTextbook(data) {
  const db = readDB();
  const book = {
    id: db._nextId.textbooks++,
    title: data.title,
    language: data.language,
    level: data.level || null,
    publisher: data.publisher || null,
    description: data.description || null,
    mp3_filename: data.mp3_filename || null,
    mp3_size: data.mp3_size || 0,
    created_at: now(),
    updated_at: now()
  };
  db.textbooks.push(book);
  writeDB(db);
  return book;
}

function updateTextbook(id, data) {
  const db = readDB();
  const idx = db.textbooks.findIndex(b => b.id === Number(id));
  if (idx === -1) return null;
  db.textbooks[idx] = {
    ...db.textbooks[idx],
    title: data.title,
    language: data.language,
    level: data.level || null,
    publisher: data.publisher || null,
    description: data.description || null,
    mp3_filename: data.mp3_filename !== null ? data.mp3_filename : db.textbooks[idx].mp3_filename,
    mp3_size: data.mp3_size !== null ? data.mp3_size : db.textbooks[idx].mp3_size,
    updated_at: now()
  };
  writeDB(db);
  return db.textbooks[idx];
}

function deleteTextbook(id) {
  const db = readDB();
  db.textbooks = db.textbooks.filter(b => b.id !== Number(id));
  writeDB(db);
}

function addHistory(textbook_id, textbook_title, email, status, error_msg = null) {
  const db = readDB();
  db.history.push({
    id: db._nextId.history++,
    textbook_id,
    textbook_title,
    email,
    status,
    error_msg,
    sent_at: now()
  });
  writeDB(db);
}

function getHistory(limit = 100) {
  const { history } = readDB();
  return [...history].reverse().slice(0, limit);
}

function getStats() {
  const { textbooks, history } = readDB();
  const today = new Date().toISOString().slice(0, 10);
  const totalBooks = textbooks.length;
  const totalSends = history.filter(h => h.status === 'success').length;
  const todaySends = history.filter(h => h.status === 'success' && h.sent_at.startsWith(today)).length;
  return { totalBooks, totalSends, todaySends };
}

module.exports = {
  initDB, searchTextbooks, getAllTextbooks, getTextbookById,
  createTextbook, updateTextbook, deleteTextbook,
  addHistory, getHistory, getStats
};
