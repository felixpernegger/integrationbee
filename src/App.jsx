import { useState } from 'react'
import { BlockMath } from 'react-katex'
import IntegralDisplay from './components/IntegralDisplay'
import AnswerInput from './components/AnswerInput'
import ScoreBoard from './components/ScoreBoard'
import LoginPage from './components/LoginPage'
import Leaderboard from './components/Leaderboard'
import StatsModal from './components/StatsModal'
import rawProblems from './data/problems.json'
import { updateRatings } from './utils/glicko2.js'
import {
  getCurrentUser, getUser, saveUser,
  getProblemRating, saveProblemRating,
  logout, getMistakeIds, addMistake, removeMistake,
  appendRatingHistory, incrementSolveStats,
} from './utils/storage.js'

const RATING_STEP = 300

function normalizeEOrder(s) {
  let depth = 0
  for (const c of s) {
    if (c === '(' || c === '{') depth++
    else if (c === ')' || c === '}') depth--
    else if (depth === 0 && (c === '+' || c === '-')) return s
  }
  const expPat = /(e\^(?:[a-z]+\([^)]*\)|\([^)]*\)|\{[^}]*\}|[a-z0-9^]+))/
  const parts = s.split(expPat)
  if (parts.length !== 3) return s
  const [before, eterm, after] = parts
  return eterm + before.replace(/\*$/, '') + after.replace(/^\*/, '')
}

function normalize(s) {
  const n = s.toLowerCase().replace(/\s+/g, '').replace(/\+c$/, '').replace(/\blog\b/g, 'ln')
  return normalizeEOrder(n)
}

function checkAnswer(input, accepted) {
  const norm = normalize(input)
  return accepted.some(a => normalize(a) === norm)
}

function findNextProblem(targetRating, excludeIds, reviewIds = null) {
  let pool
  if (reviewIds !== null) {
    pool = rawProblems.filter(p => reviewIds.includes(p.id) && !excludeIds.has(p.id))
    if (pool.length === 0) return { problem: null, reset: true }
  } else {
    pool = rawProblems.filter(p => !excludeIds.has(p.id))
    if (pool.length === 0) pool = rawProblems
  }
  const next = pool.reduce((best, p) => {
    const pR = getProblemRating(p.id, p.source).rating
    const bR = getProblemRating(best.id, best.source).rating
    return Math.abs(pR - targetRating) < Math.abs(bR - targetRating) ? p : best
  })
  return { problem: next, reset: false }
}

function buildSession() {
  const storedUser = getCurrentUser()
  const userData = storedUser ? getUser(storedUser) : null
  if (!userData) return { username: null, playerRating: null, currentProblem: null, problemRating: null, seenIds: new Set(), mistakeIds: [] }
  const playerRating = { rating: userData.rating, rd: userData.rd, volatility: userData.volatility }
  const { problem: first } = findNextProblem(userData.rating, new Set())
  return {
    username: storedUser,
    playerRating,
    currentProblem: first,
    problemRating: getProblemRating(first.id, first.source),
    seenIds: new Set([first.id]),
    mistakeIds: userData.mistakeIds || [],
  }
}

export default function App() {
  const [init] = useState(buildSession)
  const [username, setUsername] = useState(init.username)
  const [playerRating, setPlayerRating] = useState(init.playerRating)
  const [currentProblem, setCurrentProblem] = useState(init.currentProblem)
  const [problemRating, setProblemRating] = useState(init.problemRating)
  const [seenIds, setSeenIds] = useState(init.seenIds)
  const [mistakeIds, setMistakeIds] = useState(init.mistakeIds)
  const [streak, setStreak] = useState(0)
  const [status, setStatus] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [ratingDelta, setRatingDelta] = useState(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [guestMode, setGuestMode] = useState(false)

  const done = status !== null || revealed

  function advanceProblem(ratingOffset) {
    const targetRating = (playerRating?.rating ?? 1500) + ratingOffset
    const currentSeen = new Set(seenIds)
    if (currentProblem) currentSeen.add(currentProblem.id)

    const { problem: next, reset } = findNextProblem(
      targetRating,
      currentSeen,
      reviewMode ? mistakeIds : null
    )

    if (next === null) {
      // All review mistakes cleared — exit review mode
      setReviewMode(false)
      const { problem: fallback } = findNextProblem(targetRating, currentSeen)
      setCurrentProblem(fallback)
      setProblemRating(getProblemRating(fallback.id, fallback.source))
      setSeenIds(new Set([...currentSeen, fallback.id]))
    } else {
      setCurrentProblem(next)
      setProblemRating(getProblemRating(next.id, next.source))
      setSeenIds(reset ? new Set([next.id]) : new Set([...currentSeen, next.id]))
    }
    setStatus(null)
    setRevealed(false)
    setRatingDelta(null)
  }

  function handleLogin(name, userData) {
    setUsername(name)
    const rating = { rating: userData.rating, rd: userData.rd, volatility: userData.volatility }
    setPlayerRating(rating)
    const ids = userData.mistakeIds || []
    setMistakeIds(ids)
    const { problem: first } = findNextProblem(userData.rating, new Set())
    setCurrentProblem(first)
    setProblemRating(getProblemRating(first.id, first.source))
    setSeenIds(new Set([first.id]))
    setStreak(0)
    setStatus(null)
    setRevealed(false)
    setRatingDelta(null)
    setReviewMode(false)
  }

  function handleLogout() {
    logout()
    setUsername(null)
    setPlayerRating(null)
    setCurrentProblem(null)
    setProblemRating(null)
    setSeenIds(new Set())
    setMistakeIds([])
    setStreak(0)
    setStatus(null)
    setRevealed(false)
    setRatingDelta(null)
    setReviewMode(false)
  }

  function applyRatingUpdate(score) {
    if (!username || !playerRating || !currentProblem) return
    const problemStored = getProblemRating(currentProblem.id, currentProblem.source)
    const { player: newPlayer, problem: newProblemRating } = updateRatings(playerRating, problemStored, score)

    const delta = Math.round(newPlayer.rating - playerRating.rating)
    setRatingDelta(delta)
    setPlayerRating(newPlayer)

    const userData = getUser(username)
    saveUser(username, { ...userData, rating: newPlayer.rating, rd: newPlayer.rd, volatility: newPlayer.volatility })
    saveProblemRating(currentProblem.id, newProblemRating)
    appendRatingHistory(username, newPlayer.rating)
    incrementSolveStats(username, score === 1)

    // Update mistake tracking
    if (score === 1) {
      removeMistake(username, currentProblem.id)
      setMistakeIds(prev => prev.filter(id => id !== currentProblem.id))
    } else {
      addMistake(username, currentProblem.id)
      setMistakeIds(prev => prev.includes(currentProblem.id) ? prev : [...prev, currentProblem.id])
    }
  }

  function handleAnswer(input) {
    if (done) return
    const correct = checkAnswer(input, currentProblem.accepted)
    setStatus(correct ? 'correct' : 'wrong')
    if (correct) {
      setStreak(s => s + 1)
      applyRatingUpdate(1)
    } else {
      setStreak(0)
      applyRatingUpdate(0)
    }
  }

  function handleReveal() {
    setRevealed(true)
    if (status === null) {
      setStreak(0)
      applyRatingUpdate(0)
    }
  }

  function handleStartReview() {
    setShowStats(false)
    setReviewMode(true)
    // Reset seen so all mistakes are available
    setSeenIds(new Set())
    setStatus(null)
    setRevealed(false)
    setRatingDelta(null)
    const { problem: first } = findNextProblem(playerRating?.rating ?? 1500, new Set(), mistakeIds)
    if (first) {
      setCurrentProblem(first)
      setProblemRating(getProblemRating(first.id, first.source))
      setSeenIds(new Set([first.id]))
    }
  }

  function handleGuest() {
    setGuestMode(true)
    const { problem: first } = findNextProblem(1500, new Set())
    setCurrentProblem(first)
    setProblemRating(getProblemRating(first.id, first.source))
    setSeenIds(new Set([first.id]))
  }

  function handleLoginFromGuest() {
    setGuestMode(false)
    setCurrentProblem(null)
    setSeenIds(new Set())
    setStatus(null)
    setRevealed(false)
    setRatingDelta(null)
    setStreak(0)
  }

  if (!username && !guestMode) {
    return <LoginPage onLogin={handleLogin} onGuest={handleGuest} />
  }

  return (
    <div className="app">
      {showLeaderboard && <Leaderboard currentUser={username} onClose={() => setShowLeaderboard(false)} />}
      {showStats && (
        <StatsModal
          username={username}
          onClose={() => setShowStats(false)}
          onStartReview={handleStartReview}
        />
      )}

      <header className="header">
        <h1 className="site-title">Integration Bee</h1>
        <div className="header-right">
          <ScoreBoard
            rating={playerRating?.rating ?? null}
            rd={playerRating?.rd ?? null}
            ratingDelta={ratingDelta}
            streak={streak}
          />
          <div className="user-area">
            <button className="btn btn-leaderboard" onClick={() => setShowLeaderboard(true)}>Leaderboard</button>
            {!guestMode && <button className="btn btn-leaderboard" onClick={() => setShowStats(true)}>Stats</button>}
            {guestMode
              ? <button className="btn btn-check" onClick={handleLoginFromGuest}>Log in</button>
              : <><span className="username">{username}</span><button className="btn btn-logout" onClick={handleLogout}>Log out</button></>
            }
          </div>
        </div>
      </header>

      <main className="main">
        <div className="card">
          {reviewMode && (
            <div className="review-banner">
              <span>Review mode · {mistakeIds.length} problem{mistakeIds.length === 1 ? '' : 's'}</span>
              <button className="btn btn-logout" onClick={() => setReviewMode(false)}>Exit</button>
            </div>
          )}

          {done && currentProblem.source && (
            <div className="problem-meta">
              <span className="source">{currentProblem.source}</span>
              {problemRating && (
                <span className="problem-rating">· {Math.round(problemRating.rating)}</span>
              )}
            </div>
          )}

          <IntegralDisplay latex={currentProblem.integrand} />

          {!done && (
            <AnswerInput onSubmit={handleAnswer} disabled={done} />
          )}

          {status === 'correct' && (
            <div className="feedback feedback-correct">Correct!</div>
          )}
          {status === 'wrong' && (
            <div className="feedback feedback-wrong">Not quite — try revealing the answer.</div>
          )}

          {revealed && (
            <div className="reveal-box">
              <div className="reveal-label">Answer</div>
              <BlockMath math={currentProblem.answer} />
            </div>
          )}

          <div className="actions">
            {!revealed && (
              <button className="btn btn-reveal" onClick={handleReveal}>
                Reveal answer
              </button>
            )}
            {done && !reviewMode && (
              <>
                <button className="btn btn-easier" onClick={() => advanceProblem(-RATING_STEP)}>← Easier</button>
                <button className="btn btn-next" onClick={() => advanceProblem(0)}>Next →</button>
                <button className="btn btn-harder" onClick={() => advanceProblem(RATING_STEP)}>Harder →</button>
              </>
            )}
            {done && reviewMode && (
              <button className="btn btn-next" onClick={() => advanceProblem(0)}>Next →</button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
