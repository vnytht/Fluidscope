const USERS_KEY = 'waterscope.users'
const USER_KEY = 'waterscope.user'
const ACTIVITY_KEY = 'waterscope.activity'

export async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function loadUsers() {
  return readJson(USERS_KEY, [])
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function loadCurrentUser() {
  return readJson(USER_KEY, null)
}

export function saveCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(USER_KEY)
    return
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function loadActivity() {
  return readJson(ACTIVITY_KEY, [])
}

export function saveActivity(entries) {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(entries.slice(0, 200)))
}

export function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email }
}
