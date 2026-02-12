import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = process.cwd();
const USER_DB = join(ROOT, 'data', 'users.json');
const USER_DB_TEMPLATE = join(ROOT, 'data', 'users.example.json');

const sessionStore = new Map();
const SESSION_COOKIE = 'aalling93_sid';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, code, payload, headers = {}) {
  res.writeHead(code, headers);
  res.end(payload);
}

function sendJson(res, code, data, headers = {}) {
  send(res, code, JSON.stringify(data), {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const cookies = {};
  raw.split(';').forEach((segment) => {
    const [name, ...value] = segment.trim().split('=');
    if (!name) {
      return;
    }
    cookies[name] = decodeURIComponent(value.join('='));
  });
  return cookies;
}

function hashPassword(password, salt, iterations, keylen, digest) {
  return pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
}

function safeEqualHex(aHex, bHex) {
  if (aHex.length !== bHex.length) {
    return false;
  }
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  return timingSafeEqual(a, b);
}

async function ensureUserDb() {
  await mkdir(join(ROOT, 'data'), { recursive: true });
  if (existsSync(USER_DB)) {
    return;
  }

  if (existsSync(USER_DB_TEMPLATE)) {
    const template = await readFile(USER_DB_TEMPLATE, 'utf-8');
    await writeFile(USER_DB, template, 'utf-8');
    return;
  }

  await writeFile(USER_DB, JSON.stringify({ users: [] }, null, 2), 'utf-8');
}

async function loadUsers() {
  await ensureUserDb();
  const raw = await readFile(USER_DB, 'utf-8');
  const db = JSON.parse(raw);
  return Array.isArray(db.users) ? db.users : [];
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 1_000_000) {
        reject(new Error('Request too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    req.on('error', reject);
  });
}

function createSession(username) {
  const sid = randomBytes(32).toString('hex');
  sessionStore.set(sid, {
    username,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  });
  return sid;
}

function cleanupSessions() {
  const now = Date.now();
  for (const [sid, info] of sessionStore.entries()) {
    if (info.expiresAt <= now) {
      sessionStore.delete(sid);
    }
  }
}

function getSession(req) {
  cleanupSessions();
  const cookies = parseCookies(req);
  const sid = cookies[SESSION_COOKIE];
  if (!sid) {
    return null;
  }
  const session = sessionStore.get(sid);
  if (!session) {
    return null;
  }
  if (session.expiresAt <= Date.now()) {
    sessionStore.delete(sid);
    return null;
  }
  return { sid, ...session };
}

function setSessionCookie(sid) {
  return `${SESSION_COOKIE}=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

const routeAliases = new Map([
  ['/', '/index.html'],
  ['/index', '/index.html'],
  ['/login', '/login.html'],
  ['/guest', '/guest.html'],
  ['/portal', '/portal.html'],
  ['/buenaeset', '/buenaeset/index.html'],
  ['/buenaeset/', '/buenaeset/index.html']
]);

const blockedPrefixes = ['/data/', '/scripts/', '/.git/'];

function resolvePath(pathname) {
  const aliased = routeAliases.get(pathname) || pathname;
  const normalized = normalize(aliased).replace(/\\/g, '/');
  if (blockedPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return null;
  }
  if (normalized.includes('..')) {
    return null;
  }
  return join(ROOT, normalized.startsWith('/') ? normalized.slice(1) : normalized);
}

async function serveFile(pathname, res) {
  const filePath = resolvePath(pathname);
  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      send(res, 404, 'Not found');
      return;
    }

    const extension = extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    const content = await readFile(filePath);
    send(res, 200, content, { 'Content-Type': contentType });
  } catch {
    send(res, 404, 'Not found');
  }
}

async function handleLogin(req, res) {
  try {
    const body = await readBody(req);
    const parsed = JSON.parse(body || '{}');
    const username = String(parsed.username || '').trim();
    const password = String(parsed.password || '');

    if (!username || !password) {
      sendJson(res, 400, { error: 'Username and password are required.' });
      return;
    }

    const users = await loadUsers();
    const user = users.find((entry) => entry.username === username);

    if (!user) {
      sendJson(res, 401, { error: 'Invalid username or password.' });
      return;
    }

    const iterations = Number(user.iterations || 150000);
    const keylen = Number(user.keylen || 64);
    const digest = user.digest || 'sha512';

    const candidateHash = hashPassword(password, user.salt, iterations, keylen, digest);
    const ok = safeEqualHex(candidateHash, user.hash);

    if (!ok) {
      sendJson(res, 401, { error: 'Invalid username or password.' });
      return;
    }

    const sid = createSession(user.username);
    sendJson(res, 200, { success: true, username: user.username }, { 'Set-Cookie': setSessionCookie(sid) });
  } catch {
    sendJson(res, 400, { error: 'Invalid request payload.' });
  }
}

function requireAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    send(res, 302, '', { Location: '/login.html' });
    return null;
  }
  return session;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/login' && req.method === 'POST') {
    await handleLogin(req, res);
    return;
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    const session = getSession(req);
    if (session) {
      sessionStore.delete(session.sid);
    }
    sendJson(res, 200, { success: true }, { 'Set-Cookie': clearSessionCookie() });
    return;
  }

  if (pathname === '/api/session' && req.method === 'GET') {
    const session = getSession(req);
    if (!session) {
      sendJson(res, 200, { authenticated: false });
      return;
    }
    sendJson(res, 200, { authenticated: true, username: session.username });
    return;
  }

  if (pathname === '/portal' || pathname === '/portal.html') {
    const session = requireAuth(req, res);
    if (!session) {
      return;
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed');
    return;
  }

  await serveFile(pathname, res);
});

await ensureUserDb();
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
