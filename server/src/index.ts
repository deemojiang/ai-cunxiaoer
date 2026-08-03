import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDb, saveDb, genOrderNo, now, uuid, type Order } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const db = loadDb();
  if (!token || !db.tokens[token]) {
    res.status(401).json({ error: '未登录或登录已过期' });
    return;
  }
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

/** 实时天气代理（Open-Meteo，无需 API Key）；默认长兴 */
app.get('/api/weather', async (req, res) => {
  const DEFAULT_LAT = 31.026;
  const DEFAULT_LON = 119.91;
  const DEFAULT_NAME = '长兴';
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const latitude = Number.isFinite(lat) ? lat : DEFAULT_LAT;
    const longitude = Number.isFinite(lon) ? lon : DEFAULT_LON;
    const name = String(req.query.name || DEFAULT_NAME).trim() || DEFAULT_NAME;

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
      daily: 'temperature_2m_max,temperature_2m_min',
      timezone: 'Asia/Shanghai',
      forecast_days: '1',
    });
    const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!upstream.ok) {
      res.status(502).json({ error: '暂时查不到天气，请稍后再试' });
      return;
    }
    const data = (await upstream.json()) as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
        time?: string;
      };
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
      };
    };
    if (!data.current || data.current.temperature_2m == null) {
      res.status(502).json({ error: '暂时查不到天气，请稍后再试' });
      return;
    }
    res.json({
      name,
      lat: latitude,
      lon: longitude,
      current: data.current,
      daily: {
        temperature_2m_max: data.daily?.temperature_2m_max?.[0] ?? null,
        temperature_2m_min: data.daily?.temperature_2m_min?.[0] ?? null,
      },
    });
  } catch {
    res.status(502).json({ error: '暂时查不到天气，请稍后再试' });
  }
});

app.get('/api/me', (_req, res) => {
  const db = loadDb();
  res.json(db.users[0]);
});

app.get('/api/services', (_req, res) => {
  const db = loadDb();
  res.json(db.services.filter((s) => s.enabled).sort((a, b) => a.sort - b.sort));
});

app.get('/api/village', (_req, res) => {
  res.json(loadDb().village);
});

app.get('/api/knowledge', (req, res) => {
  const q = String(req.query.q || '').trim();
  const db = loadDb();
  if (!q) return res.json(db.knowledge);
  const hit = db.knowledge.filter(
    (k) =>
      k.title.includes(q) ||
      k.content.includes(q) ||
      k.tags.some((t) => q.includes(t) || t.includes(q)),
  );
  res.json(hit);
});

app.get('/api/orders', (req, res) => {
  const db = loadDb();
  const cat = String(req.query.cat || 'all');
  let list = db.orders.filter((o) => o.userId === 'u1');
  if (cat !== 'all') list = list.filter((o) => o.cat === cat);
  list = [...list].sort((a, b) => (a.time < b.time ? 1 : -1));
  res.json(list);
});

app.get('/api/orders/:id', (req, res) => {
  const db = loadDb();
  const o = db.orders.find((x) => x.id === req.params.id || x.no === req.params.id);
  if (!o) return res.status(404).json({ error: '工单不存在' });
  res.json(o);
});

app.post('/api/orders', (req, res) => {
  const db = loadDb();
  const body = req.body as Partial<Order> & { prefix?: string };
  const prefix = body.prefix || 'XX';
  const no = body.no || genOrderNo(prefix);
  const order: Order = {
    id: uuid(),
    no,
    userId: 'u1',
    cat: body.cat || 'other',
    icon: body.icon || '📄',
    title: body.title || '办事申请',
    type: body.type || '',
    status: body.status || 'wait',
    statusText: body.statusText || '待受理',
    summary: body.summary || '',
    time: now(),
    detail: body.detail || {
      rows: [],
      timeline: [{ t: now(), txt: '提交申请', cur: true }],
    },
    fields: body.fields,
  };
  if (!order.detail.timeline?.length) {
    order.detail.timeline = [{ t: now(), txt: '提交申请', cur: true }];
  }
  db.orders.unshift(order);
  saveDb(db);
  res.status(201).json(order);
});

app.patch('/api/orders/:id', adminAuth, (req, res) => {
  const db = loadDb();
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: '工单不存在' });
  const { status, statusText, note } = req.body as {
    status?: Order['status'];
    statusText?: string;
    note?: string;
  };
  if (status) o.status = status as Order['status'];
  if (statusText) o.statusText = statusText;
  o.detail.timeline = o.detail.timeline.map((t) => ({ ...t, cur: false }));
  const line =
    note ||
    statusText ||
    (status ? `状态更新为 ${status}` : '状态已更新');
  o.detail.timeline.push({
    t: now(),
    txt: line,
    cur: true,
  });
  saveDb(db);
  res.json(o);
});

app.get('/api/admin/orders', adminAuth, (_req, res) => {
  const db = loadDb();
  res.json([...db.orders].sort((a, b) => (a.time < b.time ? 1 : -1)));
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const db = loadDb();
  const admin = db.admins.find((a) => a.username === username && a.password === password);
  if (!admin) return res.status(401).json({ error: '账号或密码错误' });
  const token = uuid();
  db.tokens[token] = admin.id;
  saveDb(db);
  res.json({ token, username: admin.username });
});

app.get('/api/admin/services', adminAuth, (_req, res) => {
  res.json(loadDb().services.sort((a, b) => a.sort - b.sort));
});

app.patch('/api/admin/services/:key', adminAuth, (req, res) => {
  const db = loadDb();
  const s = db.services.find((x) => x.key === req.params.key);
  if (!s) return res.status(404).json({ error: '服务不存在' });
  Object.assign(s, req.body);
  saveDb(db);
  res.json(s);
});

app.put('/api/admin/village', adminAuth, (req, res) => {
  const db = loadDb();
  db.village = { ...db.village, ...req.body };
  saveDb(db);
  res.json(db.village);
});

app.get('/api/admin/knowledge', adminAuth, (_req, res) => {
  res.json(loadDb().knowledge);
});

app.post('/api/admin/knowledge', adminAuth, (req, res) => {
  const db = loadDb();
  const item = {
    id: uuid(),
    title: String(req.body.title || ''),
    content: String(req.body.content || ''),
    tags: (req.body.tags as string[]) || [],
    category: String(req.body.category || 'life'),
  };
  db.knowledge.unshift(item);
  saveDb(db);
  res.status(201).json(item);
});

app.delete('/api/admin/knowledge/:id', adminAuth, (req, res) => {
  const db = loadDb();
  db.knowledge = db.knowledge.filter((k) => k.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

// serve built web in production
const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
app.use(express.static(webDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(webDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Web not built. Run npm run build in web/.');
  });
});

app.listen(PORT, () => {
  loadDb();
  console.log(`[AI村小二] API http://127.0.0.1:${PORT}`);
});
