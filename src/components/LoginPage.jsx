import { useState, useEffect } from 'react'
import { login } from '../utils/storage.js'

export default function LoginPage({ onLogin, onClose }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="login-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Sign in</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="login-subtitle">New username? An account is created automatically.</p>
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
      </div>
    </div>
  )
}
