import { useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import './LoginScreen.css'

// PROTOTYPE — fake auth. Any email/password combo "works"; there is no
// real Supabase call here yet. The point is to test the flow, not the
// backend.
export default function LoginScreen() {
  const { login } = useAppState()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    login(email)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="/icons.svg#drop" alt="" className="login-mark" aria-hidden="true" />
        <h1>WaterScope</h1>
        <p className="login-tagline">
          Log your water source, see how the whole watershed is doing.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          <button type="submit" className="login-submit">
            Log in
          </button>
        </form>
        <p className="login-note">Prototype — any email/password works.</p>
      </div>
    </div>
  )
}
