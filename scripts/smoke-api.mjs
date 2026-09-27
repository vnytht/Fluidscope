const BASE = process.env.API_BASE || 'http://127.0.0.1:8787'

let failed = 0
let passed = 0

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1
    console.log(`ok  ${name}`)
    return
  }
  failed += 1
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

async function req(path, { method = 'GET', body, cookie } = {}, attempt = 0) {
  const headers = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400))
      return req(path, { method, body, cookie }, attempt + 1)
    }
    throw err
  }
  const setCookie = res.headers.getSetCookie?.() ?? []
  const raw = res.headers.get('set-cookie')
  const cookieHeader = setCookie[0] || raw || ''
  const match = /ws_session=([^;]+)/.exec(cookieHeader)
  let json = {}
  try {
    json = await res.json()
  } catch {
    json = {}
  }
  return { status: res.status, json, session: match?.[1] }
}

function stamp() {
  return Date.now().toString(36)
}

const userA = {
  username: `smokea${stamp()}`,
  email: `smoke-a-${stamp()}@example.com`,
  password: 'workshop1',
}
const userB = {
  username: `smokeb${stamp()}`,
  email: `smoke-b-${stamp()}@example.com`,
  password: 'workshop1',
}

try {
  const health = await req('/api/health')
  assert('health', health.status === 200 && health.json.ok === true)

  const unauth = await req('/api/bootstrap')
  assert('bootstrap requires session', unauth.status === 401)

  const noPrivacy = await req('/api/auth/signup', {
    method: 'POST',
    body: { ...userA, privacyAccepted: false },
  })
  assert('signup needs privacy', noPrivacy.status === 400 && noPrivacy.json.error === 'privacy')

  const shortPw = await req('/api/auth/signup', {
    method: 'POST',
    body: { username: 'ab', email: 'x@y.com', password: 'short', privacyAccepted: true },
  })
  assert(
    'signup validates',
    shortPw.status === 400 && (shortPw.json.error === 'short_username' || shortPw.json.error === 'short_password'),
  )

  const signupA = await req('/api/auth/signup', {
    method: 'POST',
    body: { ...userA, privacyAccepted: true },
  })
  assert('signup A', signupA.status === 200 && signupA.json.user?.username === userA.username && signupA.session)
  const cookieA = `ws_session=${signupA.session}`

  const taken = await req('/api/auth/signup', {
    method: 'POST',
    body: { ...userA, privacyAccepted: true },
  })
  assert('signup rejects taken email', taken.status === 409)

  const badLogin = await req('/api/auth/login', {
    method: 'POST',
    body: { identifier: userA.username, password: 'wrongpass' },
  })
  assert('login rejects bad password', badLogin.status === 401)

  const loginNameOnly = await req('/api/auth/login', {
    method: 'POST',
    body: { identifier: userA.username, password: userA.password },
  })
  assert('login with username only', loginNameOnly.status === 200 && loginNameOnly.session)

  const loginMailOnly = await req('/api/auth/login', {
    method: 'POST',
    body: { identifier: userA.email, password: userA.password },
  })
  assert('login with email only', loginMailOnly.status === 200 && loginMailOnly.session)

  const boot = await req('/api/bootstrap', { cookie: cookieA })
  assert(
    'bootstrap seeds',
    boot.status === 200 &&
      boot.json.samples?.length >= 9 &&
      boot.json.hazards?.length >= 3 &&
      boot.json.threads?.length >= 1,
  )

  const created = await req('/api/sources', {
    method: 'POST',
    cookie: cookieA,
    body: {
      position: [41.7, -8.8],
      sourceType: 'Spring',
      readings: [{ measureId: 'ph', value: '7' }],
      hazards: [],
      usages: ['drinking'],
    },
  })
  assert('create source', created.status === 201 && created.json.createdBy === signupA.json.user.id)
  const ownId = created.json.id

  const patchOwn = await req(`/api/sources/${ownId}`, {
    method: 'PATCH',
    cookie: cookieA,
    body: { sourceType: 'Dug well' },
  })
  assert('owner can edit own pin', patchOwn.status === 200 && patchOwn.json.sourceType === 'Dug well')

  const patchSeed = await req('/api/sources/seed-1', {
    method: 'PATCH',
    cookie: cookieA,
    body: { sourceType: 'Borehole' },
  })
  assert('resident cannot edit seed pin', patchSeed.status === 403)

  const deleteSeed = await req('/api/sources/seed-1', { method: 'DELETE', cookie: cookieA })
  assert('resident cannot delete seed pin', deleteSeed.status === 403)

  const hazards = await req('/api/hazards', {
    method: 'POST',
    cookie: cookieA,
    body: { entries: [{ typeId: 'septic', activity: 'active', position: [41.71, -8.79] }] },
  })
  assert('create hazard', hazards.status === 201 && hazards.json.hazards?.[0]?.typeId === 'septic')

  const thread = await req('/api/chat/threads', {
    method: 'POST',
    cookie: cookieA,
    body: {
      basinId: 'lima',
      townId: 'viana',
      subject: 'status',
      title: 'Smoke thread',
      text: 'Hello from smoke test',
    },
  })
  assert('create thread', thread.status === 201 && thread.json.thread?.id && thread.json.message?.text)

  const reply = await req(`/api/chat/threads/${thread.json.thread.id}/messages`, {
    method: 'POST',
    cookie: cookieA,
    body: { text: 'Reply from smoke' },
  })
  assert('reply thread', reply.status === 201 && reply.json.text === 'Reply from smoke')

  const community = await req('/api/chat/community', {
    method: 'POST',
    cookie: cookieA,
    body: { townId: 'caminha' },
  })
  assert('ensure community thread', community.status === 200 || community.status === 201)

  const signupB = await req('/api/auth/signup', {
    method: 'POST',
    body: { ...userB, privacyAccepted: true },
  })
  const cookieB = `ws_session=${signupB.session}`
  const steal = await req(`/api/sources/${ownId}`, {
    method: 'PATCH',
    cookie: cookieB,
    body: { sourceType: 'Mina (mine)' },
  })
  assert('other resident cannot edit', steal.status === 403)

  const stealDelete = await req(`/api/sources/${ownId}`, { method: 'DELETE', cookie: cookieB })
  assert('other resident cannot delete', stealDelete.status === 403)

  const deleteOwn = await req(`/api/sources/${ownId}`, { method: 'DELETE', cookie: cookieA })
  assert('owner can delete own pin', deleteOwn.status === 200 && deleteOwn.json.ok)

  const gone = await req(`/api/sources/${ownId}`, {
    method: 'PATCH',
    cookie: cookieA,
    body: { sourceType: 'Spring' },
  })
  assert('deleted source is gone', gone.status === 404)

  const hazardId = hazards.json.hazards[0].id
  const deleteHazard = await req(`/api/hazards/${hazardId}`, { method: 'DELETE', cookie: cookieA })
  assert('owner can delete hazard', deleteHazard.status === 200 && deleteHazard.json.ok)

  const reset = await req('/api/auth/reset', {
    method: 'POST',
    body: { email: userA.email, password: 'workshop2' },
  })
  assert('workshop password reset', reset.status === 200)

  const loginOld = await req('/api/auth/login', {
    method: 'POST',
    body: { identifier: userA.email, password: 'workshop1' },
  })
  assert('old password fails after reset', loginOld.status === 401)

  const loginNew = await req('/api/auth/login', {
    method: 'POST',
    body: { identifier: userA.username, password: 'workshop2' },
  })
  assert('new password works', loginNew.status === 200 && loginNew.session)

  const out = await req('/api/auth/logout', { method: 'POST', cookie: `ws_session=${loginNew.session}` })
  assert('logout', out.status === 200)

  const afterOut = await req('/api/bootstrap', { cookie: `ws_session=${loginNew.session}` })
  assert('session revoked', afterOut.status === 401)
} catch (err) {
  failed += 1
  console.error(`FAIL suite — ${err.message}`)
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
