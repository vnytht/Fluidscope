import { useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { useLanguage } from '../../context/LanguageContext'
import './LoginScreen.css'

export default function LoginScreen() {
  const { login, signup, resetPassword, apiError } = useAppState()
  const { t } = useLanguage()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'signup' && !privacyAccepted) {
      setError(t('login.error.privacy'))
      return
    }
    setBusy(true)
    const result =
      mode === 'signup'
        ? await signup({ username, email, password, privacyAccepted })
        : mode === 'forgot'
          ? await resetPassword({ email, password })
          : await login({ identifier, password })
    setBusy(false)
    if (!result.ok) {
      const key =
        result.error === 'missing' && mode === 'signup'
          ? 'login.error.missingSignup'
          : `login.error.${result.error}`
      setError(t(key) || t('login.error.unknown'))
      return
    }
    if (mode === 'forgot') {
      setNotice(t('login.resetOk'))
      setMode('login')
      setPassword('')
    }
  }

  if (showPrivacy) {
    return (
      <div className="login-screen">
        <div className="login-card login-card--privacy">
          <h1>{t('privacy.title')}</h1>
          <p className="login-privacy-body">{t('privacy.body')}</p>
          <button type="button" className="login-submit" onClick={() => setShowPrivacy(false)}>
            {t('privacy.back')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="/icons.svg#drop" alt="" className="login-mark" aria-hidden="true" />
        <h1>WaterScope</h1>
        <p className="login-tagline">{t('login.tagline')}</p>

        {apiError && <p className="login-error" role="alert">{t('login.error.offline')}</p>}

        {mode !== 'forgot' && (
          <div className="login-modes" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => {
                setMode('login')
                setError('')
              }}
            >
              {t('login.submit')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => {
                setMode('signup')
                setError('')
              }}
            >
              {t('login.create')}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'login' && (
            <label>
              {t('login.identifier')}
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('login.identifierHint')}
                required
              />
            </label>
          )}
          {mode === 'signup' && (
            <label>
              {t('login.username')}
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('login.usernameHint')}
                required
              />
            </label>
          )}
          {mode !== 'login' && (
            <label>
              {t('login.email')}
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
          )}
          <label>
            {mode === 'forgot' ? t('login.newPassword') : t('login.password')}
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={mode === 'login' ? undefined : 8}
            />
          </label>
          {mode === 'signup' && (
            <label className="login-privacy-check">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <span>
                {t('login.privacy')}{' '}
                <button type="button" className="login-inline-link" onClick={() => setShowPrivacy(true)}>
                  {t('login.privacyLink')}
                </button>
              </span>
            </label>
          )}
          {error && <p className="login-error" role="alert">{error}</p>}
          {notice && <p className="login-notice">{notice}</p>}
          <button type="submit" className="login-submit" disabled={busy}>
            {mode === 'signup'
              ? t('login.create')
              : mode === 'forgot'
                ? t('login.reset')
                : t('login.submit')}
          </button>
        </form>

        {mode === 'forgot' ? (
          <button
            type="button"
            className="login-link"
            onClick={() => {
              setMode('login')
              setError('')
              setNotice('')
            }}
          >
            {t('login.back')}
          </button>
        ) : (
          <button
            type="button"
            className="login-link"
            onClick={() => {
              setMode('forgot')
              setError('')
              setNotice('')
            }}
          >
            {t('login.forgot')}
          </button>
        )}

        <p className="login-note">{t('login.note')}</p>
      </div>
    </div>
  )
}
