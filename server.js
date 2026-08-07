const express = require('express');
const path = require('path');
const crypto = require('crypto');

// 为 Node.js 环境提供 WebSocket 支持（Supabase realtime-js 需要）
if (typeof globalThis.WebSocket === 'undefined') {
  try { globalThis.WebSocket = require('ws'); } catch (_) {}
}

const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.ACCESS_PASSWORD || 'ourlove123';
const tokens = new Set();

// Supabase client
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    console.log('✓ Supabase client initialized');
  } catch (err) {
    console.error('✗ Supabase init failed:', err.message);
  }
} else {
  console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'MISSING');
}

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

app.use('/api', (req, res, next) => {
  if (req.path === '/auth' || req.path === '/health') return next();
  authMiddleware(req, res, next);
});

// ── Helpers ────────────────────────────────────────────────────
function genId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
}

function requireSupabase(res) {
  if (!supabase) {
    res.status(500).json({ ok: false, error: '数据库未配置，请在环境变量中设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY' });
    return false;
  }
  return true;
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
  res.json({ ok: true, uptime: process.uptime(), db: !!supabase });
});

// ── Messages API ──────────────────────────────────────────────
const VALID_AUTHORS = ['boy', 'girl'];
const VALID_STYLES = ['pink', 'blue', 'lavender', 'peach', 'mint'];

app.get('/api/messages', async (_req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, data });
});

app.post('/api/messages', async (req, res) => {
  if (!requireSupabase(res)) return;
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
    created_at: new Date().toISOString(),
    read_at: null
  };
  const { data, error } = await supabase.from('messages').insert(msg).select().single();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.status(201).json({ ok: true, data: msg });
});

app.put('/api/messages/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const readAt = req.body.readAt || new Date().toISOString();
  const { data, error } = await supabase
    .from('messages')
    .update({ read_at: readAt })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(404).json({ ok: false, error: '留言不存在' });
  res.json({ ok: true, data });
});

app.delete('/api/messages/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { error } = await supabase.from('messages').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ ok: false, error: '留言不存在' });
  res.json({ ok: true, data: { deleted: true } });
});

// ── Markers API ───────────────────────────────────────────────
const VALID_CATEGORIES = ['dating', 'travel', 'food', 'first_time'];

app.get('/api/markers', async (_req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase
    .from('markers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, data });
});

app.post('/api/markers', async (req, res) => {
  if (!requireSupabase(res)) return;
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
    created_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('markers').insert(marker).select().single();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.status(201).json({ ok: true, data: marker });
});

app.delete('/api/markers/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { error } = await supabase.from('markers').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ ok: false, error: '标记不存在' });
  res.json({ ok: true, data: { deleted: true } });
});

// ── Start ─────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('FATAL:', err.message, err.stack);
});
process.on('unhandledRejection', (err) => {
  console.error('REJECTION:', err.message, err.stack);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`♡ 我们的小世界 running on port ${PORT}`);
  console.log(`   DB: ${supabase ? 'Supabase connected' : 'NOT CONFIGURED'}`);
  console.log(`   Env keys: ${Object.keys(process.env).filter(k => k.startsWith('SUPABASE') || k.startsWith('ACCESS')).join(', ')}`);
});
