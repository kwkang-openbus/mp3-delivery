require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB } = require('./src/db');

const textbooksRouter = require('./src/routes/textbooks');
const sendRouter = require('./src/routes/send');
const adminRouter = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

initDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'mp3delivery-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/mp3', express.static(path.join(__dirname, 'data/mp3')));

app.use('/api/textbooks', textbooksRouter);
app.use('/api/send', sendRouter);
app.use('/api/admin', adminRouter);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 MP3 배달 서비스: http://localhost:${PORT}`);
  console.log(`🔧 관리자 페이지:   http://localhost:${PORT}/admin`);
});
