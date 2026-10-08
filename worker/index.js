import { SEED_HAZARDS, SEED_MESSAGES, SEED_SAMPLES, SEED_THREADS } from './seed.js'

const COOKIE = 'ws_session'
const SESSION_MS = 14 * 24 * 60 * 60 * 1000
const PBKDF2_ITERS = 100_000

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'resident',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hazards (
  id TEXT PRIMARY KEY,
  created_by TEXT,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  user_id TEXT,
  username TEXT,
  type TEXT NOT NULL,
  payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON chat_messages(thread_id);
`

let schemaReady = false

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env)
    } catch (err) {
      console.error(err)
      return json({ error: 'server' }, 500)
    }
  },
}

async function handle(request, env) {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(request) })
  }
  if (!url.pathname.startsWith('/api')) {
    if (env.ASSETS) return env.ASSETS.fetch(request)
    return json({ error: 'not_found' }, 404)
  }

  await ensureSchema(env.DB)
  const path = url.pathname.replace(/\/$/, '') || '/'
  const user = await sessionUser(request, env)

  if (path === '/api/health') {
    return json({ ok: true })
  }

  if (path === '/api/auth/signup' && request.method === 'POST') {
    return signup(request, env)
  }
  if (path === '/api/auth/login' && request.method === 'POST') {
    return login(request, env)
  }
  if (path === '/api/auth/reset' && request.method === 'POST') {
    return resetPassword(request, env)
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    return logout(request, env, user)
  }

  if (!user) return json({ error: 'unauthorized' }, 401)

  if (path === '/api/bootstrap' && request.method === 'GET') {
    return bootstrap(env, user)
  }
  if (path === '/api/sources' && request.method === 'POST') {
    return createSource(request, env, user)
  }
  if (path.startsWith('/api/sources/') && request.method === 'PATCH') {
    return patchSource(request, env, user, path.slice('/api/sources/'.length))
  }
  if (path.startsWith('/api/sources/') && request.method === 'DELETE') {
    return deleteSource(env, user, path.slice('/api/sources/'.length))
  }
  if (path === '/api/hazards' && request.method === 'POST') {
    return createHazards(request, env, user)
  }
  if (path.startsWith('/api/hazards/') && request.method === 'DELETE') {
    return deleteHazard(env, user, path.slice('/api/hazards/'.length))
  }
  if (path === '/api/chat/community' && request.method === 'POST') {
    return ensureCommunity(request, env, user)
  }
  if (path === '/api/chat/threads' && request.method === 'POST') {
    return createThread(request, env, user)
  }
  if (path.startsWith('/api/chat/threads/') && path.endsWith('/messages') && request.method === 'POST') {
    const threadId = path.slice('/api/chat/threads/'.length, -'/messages'.length)
    return replyThread(request, env, user, threadId)
  }

  return json({ error: 'not_found' }, 404)
}

async function ensureSchema(db) {
  if (schemaReady) return
  for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
    await db.prepare(stmt).run()
  }
  const row = await db.prepare('SELECT COUNT(*) AS n FROM sources').first()
  if (!row?.n) {
    const now = new Date().toISOString()
    const stmts = []
    for (const sample of SEED_SAMPLES) {
      stmts.push(
        db.prepare(
          'INSERT OR IGNORE INTO sources (id, created_by, created_at, updated_at, payload) VALUES (?, NULL, ?, NULL, ?)',
        ).bind(sample.id, sample.createdAt || now, JSON.stringify(sample)),
      )
    }
    for (const hazard of SEED_HAZARDS) {
      stmts.push(
        db.prepare(
          'INSERT OR IGNORE INTO hazards (id, created_by, created_at, payload) VALUES (?, NULL, ?, ?)',
        ).bind(hazard.id, hazard.createdAt || now, JSON.stringify(hazard)),
      )
    }
    for (const thread of SEED_THREADS) {
      stmts.push(
        db.prepare(
          'INSERT OR IGNORE INTO chat_threads (id, created_at, payload) VALUES (?, ?, ?)',
        ).bind(thread.id, thread.createdAt || now, JSON.stringify(thread)),
      )
    }
    for (const message of SEED_MESSAGES) {
      stmts.push(
        db.prepare(
          'INSERT OR IGNORE INTO chat_messages (id, thread_id, created_at, payload) VALUES (?, ?, ?, ?)',
        ).bind(message.id, message.threadId, message.createdAt || now, JSON.stringify(message)),
      )
    }
    if (stmts.length) await db.batch(stmts)
  }
  schemaReady = true
}

function staffEmails(env) {
  return (env.STAFF_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function publicUser(row, env) {
  const staff = staffEmails(env).includes(String(row.email || '').toLowerCase())
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: staff ? 'staff' : 'resident',
  }
}

async function signup(request, env) {
  const body = await readJson(request)
  const username = String(body.username || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!body.privacyAccepted) return json({ error: 'privacy' }, 400)
  if (!username || !email || !password) return json({ error: 'missing' }, 400)
  if (username.length < 3) return json({ error: 'short_username' }, 400)
  if (password.length < 8) return json({ error: 'short_password' }, 400)

  const takenEmail = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (takenEmail) return json({ error: 'taken_email' }, 409)
  const takenName = await env.DB.prepare(
    'SELECT id FROM users WHERE lower(username) = lower(?)',
  ).bind(username).first()
  if (takenName) return json({ error: 'taken_username' }, 409)

  const { salt, hash } = await hashPassword(password)
  const id = `user-${crypto.randomUUID()}`
  const createdAt = new Date().toISOString()
  const role = staffEmails(env).includes(email) ? 'staff' : 'resident'
  await env.DB.prepare(
    'INSERT INTO users (id, username, email, password_salt, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, username, email, salt, hash, role, createdAt).run()

  const user = publicUser({ id, username, email, role }, env)
  await writeEvent(env.DB, user, 'signup', { email })
  return withSession(request, env, user, { user })
}

async function login(request, env) {
  const body = await readJson(request)
  const password = String(body.password || '')
  const identifier = String(body.identifier || body.username || body.email || '').trim()
  if (!identifier || !password) return json({ error: 'missing' }, 400)

  const looksLikeEmail = identifier.includes('@')
  const row = looksLikeEmail
    ? await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(identifier.toLowerCase()).first()
    : await env.DB.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').bind(identifier).first()
  if (!row) return json({ error: 'invalid' }, 401)
  const ok = await verifyPassword(password, row.password_salt, row.password_hash)
  if (!ok) return json({ error: 'invalid' }, 401)

  const user = publicUser(row, env)
  await writeEvent(env.DB, user, 'login', { email: row.email })
  return withSession(request, env, user, { user })
}

async function resetPassword(request, env) {
  const body = await readJson(request)
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) return json({ error: 'missing' }, 400)
  if (password.length < 8) return json({ error: 'short_password' }, 400)

  const row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!row) return json({ error: 'not_found' }, 404)

  const { salt, hash } = await hashPassword(password)
  await env.DB.prepare('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?')
    .bind(salt, hash, row.id)
    .run()
  await writeEvent(env.DB, publicUser(row, env), 'password_reset', { email })
  return json({ ok: true })
}

async function logout(request, env, user) {
  const token = cookieValue(request, COOKIE)
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  if (user) await writeEvent(env.DB, user, 'logout', {})
  return clearSession(request, { ok: true })
}

async function bootstrap(env, user) {
  const sources = await env.DB.prepare('SELECT * FROM sources ORDER BY created_at ASC').all()
  const hazards = await env.DB.prepare('SELECT * FROM hazards ORDER BY created_at ASC').all()
  const threads = await env.DB.prepare('SELECT * FROM chat_threads ORDER BY created_at DESC').all()
  const messages = await env.DB.prepare('SELECT * FROM chat_messages ORDER BY created_at ASC').all()

  let events
  if (user.role === 'staff') {
    events = await env.DB.prepare('SELECT * FROM events ORDER BY at DESC LIMIT 200').all()
  } else {
    events = await env.DB.prepare(
      'SELECT * FROM events WHERE user_id = ? ORDER BY at DESC LIMIT 200',
    ).bind(user.id).all()
  }

  return json({
    user,
    samples: (sources.results || []).map(rowToSource),
    hazards: (hazards.results || []).map(rowToHazard),
    threads: (threads.results || []).map((row) => JSON.parse(row.payload)),
    messages: (messages.results || []).map((row) => JSON.parse(row.payload)),
    activity: (events.results || []).map(rowToEvent),
  })
}

async function createSource(request, env, user) {
  const body = await readJson(request)
  const id = body.id || `sample-${crypto.randomUUID()}`
  const createdAt = body.createdAt || new Date().toISOString()
  const sample = {
    ...body,
    id,
    createdAt,
    createdBy: user.id,
  }
  await env.DB.prepare(
    'INSERT INTO sources (id, created_by, created_at, updated_at, payload) VALUES (?, ?, ?, NULL, ?)',
  ).bind(id, user.id, createdAt, JSON.stringify(sample)).run()
  await writeEvent(env.DB, user, 'sample_add', { id, sourceType: sample.sourceType })
  return json(sample, 201)
}

async function patchSource(request, env, user, id) {
  const row = await env.DB.prepare('SELECT * FROM sources WHERE id = ?').bind(id).first()
  if (!row) return json({ error: 'not_found' }, 404)
  if (!canEdit(user, row.created_by)) return json({ error: 'forbidden' }, 403)

  const patch = await readJson(request)
  const current = JSON.parse(row.payload)
  const updatedAt = new Date().toISOString()
  const next = { ...current, ...patch, id, updatedAt, createdBy: current.createdBy ?? row.created_by }
  await env.DB.prepare('UPDATE sources SET updated_at = ?, payload = ? WHERE id = ?')
    .bind(updatedAt, JSON.stringify(next), id)
    .run()
  await writeEvent(env.DB, user, 'sample_update', { id })
  return json(next)
}

async function deleteSource(env, user, id) {
  const row = await env.DB.prepare('SELECT * FROM sources WHERE id = ?').bind(id).first()
  if (!row) return json({ error: 'not_found' }, 404)
  if (!isStaff(user)) return json({ error: 'forbidden' }, 403)
  await env.DB.prepare('DELETE FROM sources WHERE id = ?').bind(id).run()
  await writeEvent(env.DB, user, 'sample_delete', { id })
  return json({ ok: true, id })
}

async function createHazards(request, env, user) {
  const body = await readJson(request)
  const entries = Array.isArray(body.entries) ? body.entries : []
  if (!entries.length) return json({ error: 'missing' }, 400)
  const now = new Date().toISOString()
  const created = []
  const stmts = []
  for (const entry of entries) {
    const id = `hazard-${crypto.randomUUID()}`
    const hazard = {
      id,
      typeId: entry.typeId,
      activity: entry.activity,
      position: entry.position,
      createdAt: now,
      createdBy: user.id,
    }
    created.push(hazard)
    stmts.push(
      env.DB.prepare(
        'INSERT INTO hazards (id, created_by, created_at, payload) VALUES (?, ?, ?, ?)',
      ).bind(id, user.id, now, JSON.stringify(hazard)),
    )
  }
  await env.DB.batch(stmts)
  await writeEvent(env.DB, user, 'hazard_add', { count: created.length })
  return json({ hazards: created }, 201)
}

async function deleteHazard(env, user, id) {
  const row = await env.DB.prepare('SELECT * FROM hazards WHERE id = ?').bind(id).first()
  if (!row) return json({ error: 'not_found' }, 404)
  if (!isStaff(user)) return json({ error: 'forbidden' }, 403)
  await env.DB.prepare('DELETE FROM hazards WHERE id = ?').bind(id).run()
  await writeEvent(env.DB, user, 'hazard_delete', { id })
  return json({ ok: true, id })
}

async function ensureCommunity(request, env, _user) {
  const body = await readJson(request)
  const townId = String(body.townId || '').trim()
  if (!townId) return json({ error: 'missing' }, 400)
  const id = `community-${townId}`
  const existing = await env.DB.prepare('SELECT payload FROM chat_threads WHERE id = ?').bind(id).first()
  if (existing) return json({ thread: JSON.parse(existing.payload) })
  const now = new Date().toISOString()
  const thread = {
    id,
    kind: 'community',
    basinId: 'lima',
    townId,
    subject: 'status',
    title: '',
    placeId: null,
    placeLabel: null,
    author: 'WaterScope',
    createdAt: now,
  }
  await env.DB.prepare('INSERT INTO chat_threads (id, created_at, payload) VALUES (?, ?, ?)')
    .bind(id, now, JSON.stringify(thread))
    .run()
  return json({ thread }, 201)
}

async function createThread(request, env, user) {
  const body = await readJson(request)
  const now = new Date().toISOString()
  const thread = {
    id: `thread-${crypto.randomUUID()}`,
    kind: 'topic',
    basinId: body.basinId,
    townId: body.townId,
    subject: body.subject,
    title: String(body.title || '').trim(),
    placeId: body.placeId || null,
    placeLabel: body.placeLabel || null,
    author: displayName(user),
    createdAt: now,
  }
  const message = {
    id: `msg-${crypto.randomUUID()}`,
    threadId: thread.id,
    author: thread.author,
    text: String(body.text || '').trim(),
    createdAt: now,
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO chat_threads (id, created_at, payload) VALUES (?, ?, ?)')
      .bind(thread.id, now, JSON.stringify(thread)),
    env.DB.prepare(
      'INSERT INTO chat_messages (id, thread_id, created_at, payload) VALUES (?, ?, ?, ?)',
    ).bind(message.id, thread.id, now, JSON.stringify(message)),
  ])
  await writeEvent(env.DB, user, 'chat_thread', { id: thread.id })
  return json({ thread, message }, 201)
}

async function replyThread(request, env, user, threadId) {
  const existing = await env.DB.prepare('SELECT id FROM chat_threads WHERE id = ?').bind(threadId).first()
  if (!existing) return json({ error: 'not_found' }, 404)
  const body = await readJson(request)
  const now = new Date().toISOString()
  const message = {
    id: `msg-${crypto.randomUUID()}`,
    threadId,
    author: displayName(user),
    text: String(body.text || '').trim(),
    createdAt: now,
  }
  await env.DB.prepare(
    'INSERT INTO chat_messages (id, thread_id, created_at, payload) VALUES (?, ?, ?, ?)',
  ).bind(message.id, threadId, now, JSON.stringify(message)).run()
  await writeEvent(env.DB, user, 'chat_reply', { threadId })
  return json(message, 201)
}

function isStaff(user) {
  return user?.role === 'staff'
}

function canEdit(user, createdBy) {
  if (isStaff(user)) return true
  return Boolean(createdBy) && createdBy === user.id
}

function displayName(user) {
  return user.username || user.email || 'You'
}

function rowToSource(row) {
  const payload = JSON.parse(row.payload)
  return { ...payload, id: row.id, createdBy: payload.createdBy ?? row.created_by ?? null }
}

function rowToHazard(row) {
  const payload = JSON.parse(row.payload)
  return { ...payload, id: row.id, createdBy: payload.createdBy ?? row.created_by ?? null }
}

function rowToEvent(row) {
  return {
    id: row.id,
    type: row.type,
    detail: row.payload ? safeDetail(row.payload) : '',
    at: row.at,
    userId: row.user_id,
    username: row.username,
  }
}

function safeDetail(raw) {
  try {
    const parsed = JSON.parse(raw)
    return parsed.id || parsed.email || parsed.threadId || parsed.count || ''
  } catch {
    return ''
  }
}

async function writeEvent(db, user, type, payload) {
  await db.prepare(
    'INSERT INTO events (id, at, user_id, username, type, payload) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(
    `evt-${crypto.randomUUID()}`,
    new Date().toISOString(),
    user?.id ?? null,
    user?.username ?? null,
    type,
    JSON.stringify(payload ?? {}),
  ).run()
}

async function sessionUser(request, env) {
  const token = cookieValue(request, COOKIE)
  if (!token) return null
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE token = ?').bind(token).first()
  if (!session) return null
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first()
  return row ? publicUser(row, env) : null
}

async function withSession(request, env, user, body) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)))
  const expires = new Date(Date.now() + SESSION_MS).toISOString()
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, user.id, expires)
    .run()
  const headers = new Headers({ 'content-type': 'application/json' })
  headers.append('Set-Cookie', cookieHeader(request, token, SESSION_MS / 1000))
  return new Response(JSON.stringify(body), { status: 200, headers })
}

function clearSession(request, body) {
  const headers = new Headers({ 'content-type': 'application/json' })
  headers.append('Set-Cookie', cookieHeader(request, '', 0))
  return new Response(JSON.stringify(body), { status: 200, headers })
}

function cookieHeader(request, token, maxAge) {
  const secure = new URL(request.url).protocol === 'https:'
  const parts = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAge)}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

function cookieValue(request, name) {
  const header = request.headers.get('Cookie') || ''
  const parts = header.split(';')
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERS },
    key,
    256,
  )
  return { salt: hex(salt), hash: hex(new Uint8Array(bits)) }
}

async function verifyPassword(password, salt, expected) {
  const { hash } = await hashPassword(password, salt)
  return timingSafeEqual(hash, expected)
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(value) {
  const out = new Uint8Array(value.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
