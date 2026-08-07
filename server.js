const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.ACCESS_PASSWORD || 'ourlove123';
const tokens = new Set();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!tokens.has(token)) {
    return res.status(401).json({ ok: false, error: '请先登录' });
  }
  next();
}

// Apply auth to all /api/* except auth and health
app.use('/api', (req, res, next) => {
  if (req.path === '/auth' || req.path === '/health') return next();
  authMiddleware(req, res, next);
});

// ── Data helpers ──────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(filename) {
  ensureDataDir();
  const fp = path.join(DATA_DIR, filename);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

function writeData(filename, data) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
}

// ── Auth ──────────────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password !== PASSWORD) {
    return res.status(403).json({ ok: false, error: '密码错误' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  tokens.add(token);
  res.json({ ok: true, data: { token } });
});

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ── Messages API ──────────────────────────────────────────────
const VALID_AUTHORS = ['boy', 'girl'];
const VALID_STYLES = ['pink', 'blue', 'lavender', 'peach', 'mint'];

app.get('/api/messages', (_req, res) => {
  const messages = readData('messages.json');
  messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, data: messages });
});

app.post('/api/messages', (req, res) => {
  const { author, content, style } = req.body;
  if (!VALID_AUTHORS.includes(author)) {
    return res.status(400).json({ ok: false, error: 'author 必须是 boy 或 girl' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0 || content.length > 500) {
    return res.status(400).json({ ok: false, error: 'content 长度需在 1-500 之间' });
  }
  if (!VALID_STYLES.includes(style)) {
    return res.status(400).json({ ok: false, error: 'style 不合法' });
  }
  const msg = {
    id: genId('m'),
    author,
    content: content.trim(),
    style,
    createdAt: new Date().toISOString(),
    readAt: null
  };
  const messages = readData('messages.json');
  messages.push(msg);
  writeData('messages.json', messages);
  res.status(201).json({ ok: true, data: msg });
});

app.put('/api/messages/:id', (req, res) => {
  const messages = readData('messages.json');
  const idx = messages.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: '留言不存在' });
  messages[idx].readAt = req.body.readAt || new Date().toISOString();
  writeData('messages.json', messages);
  res.json({ ok: true, data: messages[idx] });
});

app.delete('/api/messages/:id', (req, res) => {
  let messages = readData('messages.json');
  const idx = messages.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: '留言不存在' });
  messages.splice(idx, 1);
  writeData('messages.json', messages);
  res.json({ ok: true, data: { deleted: true } });
});

// ── Markers API ───────────────────────────────────────────────
const VALID_CATEGORIES = ['dating', 'travel', 'food', 'first_time'];

app.get('/api/markers', (_req, res) => {
  const markers = readData('markers.json');
  markers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, data: markers });
});

app.post('/api/markers', (req, res) => {
  const { title, lat, lng, description, category, date } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 100) {
    return res.status(400).json({ ok: false, error: 'title 长度需在 1-100 之间' });
  }
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    return res.status(400).json({ ok: false, error: 'lat 必须是 -90~90 之间的数字' });
  }
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    return res.status(400).json({ ok: false, error: 'lng 必须是 -180~180 之间的数字' });
  }
  if (description && (typeof description !== 'string' || description.length > 300)) {
    return res.status(400).json({ ok: false, error: 'description 最多 300 字' });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ ok: false, error: 'category 不合法' });
  }
  if (!date || isNaN(Date.parse(date))) {
    return res.status(400).json({ ok: false, error: 'date 格式不正确 (YYYY-MM-DD)' });
  }
  const marker = {
    id: genId('p'),
    title: title.trim(),
    lat,
    lng,
    description: (description || '').trim(),
    category,
    date,
    createdAt: new Date().toISOString()
  };
  const markers = readData('markers.json');
  markers.push(marker);
  writeData('markers.json', markers);
  res.status(201).json({ ok: true, data: marker });
});

app.delete('/api/markers/:id', (req, res) => {
  let markers = readData('markers.json');
  const idx = markers.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: '标记不存在' });
  markers.splice(idx, 1);
  writeData('markers.json', markers);
  res.json({ ok: true, data: { deleted: true } });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`♡ 我们的小世界 running at http://localhost:${PORT}`);
});
