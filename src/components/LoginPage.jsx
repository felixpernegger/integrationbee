import { useState } from 'react'
import { login } from '../utils/storage.js'

export default function LoginPage({ onLogin, onGuest }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    const result = login(username.trim(), password)
    if (result.success) {
      onLogin(username.trim(), result.user)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Integration Bee</h1>
        <p className="login-subtitle">Sign in or create an account to track your rating.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Username</label>
            <input
              className="answer-input"
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(null) }}
              autoFocus
              autoComplete="username"
              spellCheck={false}
            />
          </div>
          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              className="answer-input"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn btn-check login-btn" type="submit">
            Continue
          </button>
        </form>
        <p className="login-hint">New username? An account will be created automatically.</p>
        <div className="login-divider">or</div>
        <button className="btn btn-guest" type="button" onClick={onGuest}>
          Play as guest
        </button>
      </div>
    </div>
  )
}
