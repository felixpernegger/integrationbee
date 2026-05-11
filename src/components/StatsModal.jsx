import { useEffect } from 'react'
import { getRatingHistory, getSolveStats, getMistakeIds } from '../utils/storage.js'

function RatingGraph({ history }) {
  if (history.length < 2) {
    return <p className="graph-empty">Solve a few problems to see your rating graph.</p>
  }

  const W = 400
  const H = 120
  const PAD = 8

  const ratings = history.map(h => h.rating)
  const minR = Math.min(...ratings)
  const maxR = Math.max(...ratings)
  const span = maxR - minR || 1

  const pts = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (h.rating - minR) / span) * (H - PAD * 2)
    return [x, y]
  })

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')

  const first = Math.round(history[0].rating)
  const last = Math.round(history[history.length - 1].rating)
  const peak = Math.round(maxR)

  return (
    <div className="graph-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="rating-graph" preserveAspectRatio="none">
        <defs>
          <linearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${pts[0][0]},${H} ${polyline} ${pts[pts.length - 1][0]},${H}`}
          fill="url(#graphGrad)"
        />
        <polyline points={polyline} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="var(--accent)" />
      </svg>
      <div className="graph-labels">
        <span className="graph-label">Start: {first}</span>
        <span className="graph-label graph-peak">Peak: {peak}</span>
        <span className="graph-label">Now: {last}</span>
      </div>
    </div>
  )
}

export default function StatsModal({ username, onClose, onStartReview }) {
  const history = getRatingHistory(username)
  const { totalSolved, totalAttempted } = getSolveStats(username)
  const mistakeIds = getMistakeIds(username)
  const accuracy = totalAttempted > 0 ? Math.round((totalSolved / totalAttempted) * 100) : null

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-stats" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Stats — {username}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <RatingGraph history={history} />

        <div className="stats-grid">
          <div className="stats-cell">
            <span className="stats-label">Solved</span>
            <span className="stats-val">{totalSolved}</span>
          </div>
          <div className="stats-cell">
            <span className="stats-label">Attempted</span>
            <span className="stats-val">{totalAttempted}</span>
          </div>
          <div className="stats-cell">
            <span className="stats-label">Accuracy</span>
            <span className="stats-val">{accuracy !== null ? `${accuracy}%` : '—'}</span>
          </div>
          <div className="stats-cell">
            <span className="stats-label">Mistakes</span>
            <span className="stats-val">{mistakeIds.length}</span>
          </div>
        </div>

        <button
          className="btn btn-check review-btn"
          onClick={onStartReview}
          disabled={mistakeIds.length === 0}
        >
          {mistakeIds.length === 0 ? 'No mistakes to review' : `Review ${mistakeIds.length} mistake${mistakeIds.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
