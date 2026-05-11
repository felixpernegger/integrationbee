export default function ScoreBoard({ rating, rd, ratingDelta, streak }) {
  const ratingDisplay = rating !== null ? Math.round(rating) : '—'
  const rdDisplay = rd !== null ? Math.round(rd) : ''

  return (
    <div className="scoreboard">
      <div className="stat">
        <span className="stat-label">Rating</span>
        <span className="stat-value stat-rating">
          {ratingDisplay}
          {rdDisplay ? <span className="stat-rd"> ±{rdDisplay}</span> : null}
          {ratingDelta !== null && (
            <span className={ratingDelta >= 0 ? 'rating-delta delta-up' : 'rating-delta delta-down'}>
              {ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta}
            </span>
          )}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Streak</span>
        <span className="stat-value">{streak}</span>
      </div>
    </div>
  )
}
