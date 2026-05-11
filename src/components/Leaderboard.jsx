import { useEffect } from 'react'
import { getAllUsers } from '../utils/storage.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ currentUser, onClose }) {
  const players = getAllUsers()

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Leaderboard</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {players.length === 0 ? (
          <p className="lb-empty">No players yet.</p>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th className="lb-th lb-rank">#</th>
                <th className="lb-th lb-name">Player</th>
                <th className="lb-th lb-rating">Rating</th>
                <th className="lb-th lb-rd">RD</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.username} className={p.username === currentUser ? 'lb-row lb-row-me' : 'lb-row'}>
                  <td className="lb-td lb-rank">{MEDALS[i] ?? i + 1}</td>
                  <td className="lb-td lb-name">{p.username}</td>
                  <td className="lb-td lb-rating">{Math.round(p.rating)}</td>
                  <td className="lb-td lb-rd">±{Math.round(p.rd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="lb-warning">Warning: Since it is extremely easy to cheat, this leaderboard should not be taken too seriously.</p>
      </div>
    </div>
  )
}
