const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const app = express();
// Render 會自動提供 PORT 環境變數，如果沒有則使用 3000
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 初始化資料庫
const db = new Database('database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    api_key TEXT UNIQUE
  );
  
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    sender TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- API 路由 ---

// 1. 用戶註冊
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const apiKey = uuidv4();
  
  try {
    const stmt = db.prepare('INSERT INTO users (username, password, api_key) VALUES (?, ?, ?)');
    stmt.run(username, password, apiKey);
    res.json({ success: true, apiKey });
  } catch (error) {
    res.status(400).json({ success: false, message: '用戶名已存在' });
  }
});

// 2. 用戶登入
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  
  if (user) {
    res.json({ success: true, userId: user.id, apiKey: user.api_key });
  } else {
    res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }
});

// 3. 外部程式發送訊息
app.post('/api/send', (req, res) => {
  const { apiKey, message } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
  if (!user) return res.status(403).json({ success: false, message: '無效的 API Key' });

  const stmt = db.prepare('INSERT INTO messages (user_id, content, sender) VALUES (?, ?, ?)');
  stmt.run(user.id, message, 'external');
  res.json({ success: true, message: '訊息已送達' });
});

// 4. 前端獲取訊息
app.get('/api/messages/:userId', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.userId);
  res.json(messages.reverse());
});

// 5. 前端使用者發送訊息
app.post('/api/user-message', (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) return res.status(400).json({ success: false });
  
  try {
    const stmt = db.prepare('INSERT INTO messages (user_id, content, sender) VALUES (?, ?, ?)');
    stmt.run(userId, message, 'user');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 6. 外部程式領取使用者訊息
app.get('/api/outbox/:apiKey', (req, res) => {
  const { apiKey } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE api_key = ?').get(apiKey);
  if (!user) return res.status(403).json({ success: false, message: '無效的 API Key' });

  const messages = db.prepare(`
    SELECT id, content, created_at 
    FROM messages 
    WHERE user_id = ? AND sender = 'user' 
    ORDER BY created_at DESC LIMIT 10
  `).all(user.id);
  res.json(messages.reverse());
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Angel Agent 後端運行中，PORT: ${PORT}`);
});
