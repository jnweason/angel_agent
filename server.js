// server.js
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// 啟用 CORS 和 JSON 解析
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// 初始化資料庫 (會自動建立 database.sqlite 檔案)
const db = new Database('database.sqlite');

// 建立資料表
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
    sender TEXT, -- 'user' 或 'external'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- API 路由 ---

// 1. 用戶註冊
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const apiKey = uuidv4(); // 產生專屬 API Key
  
  try {
    const stmt = db.prepare('INSERT INTO users (username, password, api_key) VALUES (?, ?, ?)');
    stmt.run(username, password, apiKey);
    res.json({ success: true, apiKey });
  } catch (error) {
    res.status(400).json({ success: false, message: '用戶名已存在' });
  }
});

// 2. 用戶登入 (簡易版)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  
  if (user) {
    res.json({ success: true, userId: user.id, apiKey: user.api_key });
  } else {
    res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }
});

// 3. 外部程式發送訊息 (核心功能)
app.post('/api/send', (req, res) => {
  const { apiKey, message } = req.body;
  
  // 驗證 API Key
  const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
  if (!user) {
    return res.status(403).json({ success: false, message: '無效的 API Key' });
  }

  // 存入資料庫
  const stmt = db.prepare('INSERT INTO messages (user_id, content, sender) VALUES (?, ?, ?)');
  stmt.run(user.id, message, 'external');
  
  console.log(`收到訊息給 User ${user.id}: ${message}`);
  res.json({ success: true, message: '訊息已送達' });
});

// 4. 前端獲取訊息
app.get('/api/messages/:userId', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.userId);
  res.json(messages.reverse()); // 反轉讓舊訊息在上面
});

// 5. 前端使用者發送訊息 (存入資料庫，標記為 'user')
app.post('/api/user-message', (req, res) => {
  const { userId, message } = req.body;
  
  if (!userId || !message) {
    return res.status(400).json({ success: false, message: '缺少參數' });
  }

  try {
    const stmt = db.prepare('INSERT INTO messages (user_id, content, sender) VALUES (?, ?, ?)');
    stmt.run(userId, message, 'user');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: '資料庫錯誤' });
  }
});

// 6. 外部程式領取使用者發送的訊息
app.get('/api/outbox/:apiKey', (req, res) => {
  const { apiKey } = req.params;
  
  // 驗證 API Key
  const user = db.prepare('SELECT id FROM users WHERE api_key = ?').get(apiKey);
  if (!user) {
    return res.status(403).json({ success: false, message: '無效的 API Key' });
  }

  // 撈取該使用者發出的訊息，且標記為 'user'
  // 這裡我們只撈取最近 10 則，避免資料量過大
  const messages = db.prepare(`
    SELECT id, content, created_at 
    FROM messages 
    WHERE user_id = ? AND sender = 'user' 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all(user.id);

  res.json(messages.reverse()); // 反轉讓舊訊息在前面
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Angel Agent 後端伺服器運行中: http://localhost:${PORT}`);
});
