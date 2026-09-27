async function request(path, options = {}) {
  let res
  try {
    res = await fetch(path, {
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
  } catch {
    const err = new Error('offline')
    err.code = 'offline'
    throw err
  }

  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok) {
    const err = new Error(body.error || 'unknown')
    err.code = body.error || 'unknown'
    err.status = res.status
    throw err
  }
  return body
}

export const api = {
  health: () => request('/api/health'),
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload) => request('/api/auth/reset', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: '{}' }),
  bootstrap: () => request('/api/bootstrap'),
  createSource: (payload) => request('/api/sources', { method: 'POST', body: JSON.stringify(payload) }),
  updateSource: (id, patch) =>
    request(`/api/sources/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteSource: (id) => request(`/api/sources/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createHazards: (entries) =>
    request('/api/hazards', { method: 'POST', body: JSON.stringify({ entries }) }),
  deleteHazard: (id) => request(`/api/hazards/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  ensureCommunity: (townId) =>
    request('/api/chat/community', { method: 'POST', body: JSON.stringify({ townId }) }),
  createThread: (payload) =>
    request('/api/chat/threads', { method: 'POST', body: JSON.stringify(payload) }),
  replyToThread: (threadId, text) =>
    request(`/api/chat/threads/${encodeURIComponent(threadId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
}

export function failCode(err, fallback = 'unknown') {
  return err?.code || fallback
}
