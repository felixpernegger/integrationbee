import { useState } from 'react'
import { BlockMath } from 'react-katex'
import IntegralDisplay from './components/IntegralDisplay'
import AnswerInput from './components/AnswerInput'
import ScoreBoard from './components/ScoreBoard'
import LoginPage from './components/LoginPage'
import Leaderboard from './components/Leaderboard'
import StatsModal from './components/StatsModal'
import ResourcesPage from './components/ResourcesPage'
import ArchivePage from './components/ArchivePage'
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
  const targetRating = userData?.rating ?? 1500
  const { problem: first } = findNextProblem(targetRating, new Set())
  return {
    username: storedUser || null,
    playerRating: userData ? { rating: userData.rating, rd: userData.rd, volatility: userData.volatility } : null,
    currentProblem: first,
    problemRating: getProblemRating(first.id, first.source),
    seenIds: new Set([first.id]),
    mistakeIds: userData?.mistakeIds || [],
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
  const [currentPage, setCurrentPage] = useState('practice')
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

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
    setPlayerRating({ rating: userData.rating, rd: userData.rd, volatility: userData.volatility })
    setMistakeIds(userData.mistakeIds || [])
    const { problem: first } = findNextProblem(userData.rating, new Set())
    setCurrentProblem(first)
    setProblemRating(getProblemRating(first.id, first.source))
    setSeenIds(new Set([first.id]))
    setStreak(0)
    setStatus(null)
    setRevealed(false)
    setRatingDelta(null)
    setReviewMode(false)
    setShowLogin(false)
  }

  function handleLogout() {
    logout()
    setUsername(null)
    setPlayerRating(null)
    setMistakeIds([])
    setRatingDelta(null)
    setReviewMode(false)
    // Keep playing — just pick a new problem as guest
    const { problem: first } = findNextProblem(1500, new Set())
    setCurrentProblem(first)
    setProblemRating(getProblemRating(first.id, first.source))
    setSeenIds(new Set([first.id]))
    setStreak(0)
    setStatus(null)
    setRevealed(false)
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
    if (correct) { setStreak(s => s + 1); applyRatingUpdate(1) }
    else { setStreak(0); applyRatingUpdate(0) }
  }

  function handleReveal() {
    setRevealed(true)
    if (status === null) { setStreak(0); applyRatingUpdate(0) }
  }

  function handleArchiveAnswer(problem, score) {
    if (!username || !playerRating) return null
    const problemStored = getProblemRating(problem.id, problem.source)
    const { player: newPlayer, problem: newProblemRating } = updateRatings(playerRating, problemStored, score)
    const delta = Math.round(newPlayer.rating - playerRating.rating)
    setPlayerRating(newPlayer)
    const userData = getUser(username)
    saveUser(username, { ...userData, rating: newPlayer.rating, rd: newPlayer.rd, volatility: newPlayer.volatility })
    saveProblemRating(problem.id, newProblemRating)
    appendRatingHistory(username, newPlayer.rating)
    incrementSolveStats(username, score === 1)
    if (score === 1) {
      removeMistake(username, problem.id)
      setMistakeIds(prev => prev.filter(id => id !== problem.id))
    } else {
      addMistake(username, problem.id)
      setMistakeIds(prev => prev.includes(problem.id) ? prev : [...prev, problem.id])
    }
    return delta
  }

  function handleStartReview() {
    setShowStats(false)
    setReviewMode(true)
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

  return (
    <div className="app">
      {showLeaderboard && <Leaderboard currentUser={username} onClose={() => setShowLeaderboard(false)} />}
      {showStats && username && (
        <StatsModal username={username} onClose={() => setShowStats(false)} onStartReview={handleStartReview} />
      )}
      {showLogin && <LoginPage onLogin={handleLogin} onClose={() => setShowLogin(false)} />}

      <header className="header">
        <h1 className="site-title" style={{cursor:'pointer'}} onClick={() => setCurrentPage('practice')}>Integration Bee</h1>
        <nav className="nav-tabs">
          <button className={`nav-tab${currentPage === 'practice' ? ' nav-tab-active' : ''}`} onClick={() => setCurrentPage('practice')}>Practice</button>
          <button className={`nav-tab${currentPage === 'archive' ? ' nav-tab-active' : ''}`} onClick={() => setCurrentPage('archive')}>Archive</button>
          <button className={`nav-tab${currentPage === 'resources' ? ' nav-tab-active' : ''}`} onClick={() => setCurrentPage('resources')}>Resources</button>
        </nav>
        <div className="header-right">
          <ScoreBoard
            rating={playerRating?.rating ?? null}
            rd={playerRating?.rd ?? null}
            ratingDelta={ratingDelta}
            streak={streak}
          />
          <div className="user-area">
            <button className="btn btn-leaderboard" onClick={() => setShowLeaderboard(true)}>Leaderboard</button>
            {username && <button className="btn btn-leaderboard" onClick={() => setShowStats(true)}>Stats</button>}
            {username
              ? <><span className="username">{username}</span><button className="btn btn-logout" onClick={handleLogout}>Log out</button></>
              : <button className="btn btn-check" onClick={() => setShowLogin(true)}>Log in</button>
            }
          </div>
        </div>
      </header>

      {currentPage === 'resources' && <ResourcesPage />}

      {currentPage === 'archive' && (
        <ArchivePage
          checkAnswer={checkAnswer}
          onArchiveAnswer={handleArchiveAnswer}
        />
      )}

      {currentPage === 'practice' && (
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
              {problemRating && <span className="problem-rating">· {Math.round(problemRating.rating)}</span>}
            </div>
          )}

          <IntegralDisplay latex={currentProblem.integrand} />

          {!done && <AnswerInput onSubmit={handleAnswer} disabled={done} />}

          {status === 'correct' && <div className="feedback feedback-correct">Correct!</div>}
          {status === 'wrong' && <div className="feedback feedback-wrong">Not quite — try revealing the answer.</div>}

          {revealed && (
            <div className="reveal-box">
              <div className="reveal-label">Answer</div>
              <BlockMath math={currentProblem.answer} />
            </div>
          )}

          <div className="actions">
            {!revealed && <button className="btn btn-reveal" onClick={handleReveal}>Reveal answer</button>}
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
      )}
    </div>
  )
}
