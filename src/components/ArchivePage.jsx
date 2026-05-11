import { useState, useMemo } from 'react'
import { BlockMath, InlineMath } from 'react-katex'
import rawProblems from '../data/problems.json'
import IntegralDisplay from './IntegralDisplay'
import AnswerInput from './AnswerInput'

function parsePath(source) {
  if (source.startsWith('MIT ')) {
    const m = source.match(/^MIT (.+?) (\d{4}) Problem \d+$/)
    if (m) return ['MIT', m[1], m[2]]
  }
  if (source.startsWith('Bonn ')) {
    const rest = source.slice(5)
    const yearM = rest.match(/^(\d{4}) /)
    if (yearM) {
      const year = yearM[1]
      let round = rest.slice(year.length + 1)
      round = round
        .replace(/ Tiebreaker( \d+)?$/, '')
        .replace(/ Problem \d+$/, '')
        .trim()
      return ['Bonn', year, round]
    }
  }
  return ['Other', 'Other', source]
}

function buildTree(problems) {
  const tree = {}
  for (const p of problems) {
    const [l1, l2, l3] = parsePath(p.source)
    tree[l1] ??= {}
    tree[l1][l2] ??= {}
    tree[l1][l2][l3] ??= []
    tree[l1][l2][l3].push(p)
  }
  return tree
}

function sortedKeys(keys) {
  return [...keys].sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b)
    if (!isNaN(na) && !isNaN(nb)) return nb - na
    return a.localeCompare(b)
  })
}

function countProblems(node) {
  if (Array.isArray(node)) return node.length
  return Object.values(node).reduce((s, v) => s + countProblems(v), 0)
}

function getProblemLabel(source) {
  const m = source.match(/(Problem \d+|Tiebreaker \d+|Tiebreaker)$/)
  return m ? m[0] : ''
}

function FolderCard({ name, count, onClick }) {
  return (
    <button className="archive-folder" onClick={onClick}>
      <span className="archive-folder-icon">📁</span>
      <span className="archive-folder-name">{name}</span>
      <span className="archive-folder-count">{count} problem{count !== 1 ? 's' : ''}</span>
    </button>
  )
}

export default function ArchivePage({ checkAnswer, onArchiveAnswer }) {
  const tree = useMemo(() => buildTree(rawProblems), [])
  const [path, setPath] = useState([])
  const [activeProblemId, setActiveProblemId] = useState(null)
  const [status, setStatus] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [ratingDelta, setRatingDelta] = useState(null)

  function navigate(segment) {
    setPath(prev => [...prev, segment])
    resetProblemState()
  }

  function navigateTo(depth) {
    setPath(prev => prev.slice(0, depth))
    resetProblemState()
  }

  function resetProblemState() {
    setActiveProblemId(null)
    setStatus(null)
    setRevealed(false)
    setRatingDelta(null)
  }

  function toggleProblem(id) {
    setActiveProblemId(prev => (prev === id ? null : id))
    setStatus(null)
    setRevealed(false)
    setRatingDelta(null)
  }

  function handleAnswer(problem, input) {
    if (status !== null || revealed) return
    const correct = checkAnswer(input, problem.accepted)
    setStatus(correct ? 'correct' : 'wrong')
    if (onArchiveAnswer) {
      const delta = onArchiveAnswer(problem, correct ? 1 : 0)
      setRatingDelta(delta)
    }
  }

  function handleReveal(problem) {
    setRevealed(true)
    if (status === null && onArchiveAnswer) {
      const delta = onArchiveAnswer(problem, 0)
      setRatingDelta(delta)
    }
  }

  // Resolve current node in tree
  let node = tree
  for (const seg of path) node = node?.[seg]

  const problems = path.length === 3 ? (node ?? []) : null

  return (
    <div className="main archive-page">
      {path.length > 0 && (
        <nav className="archive-breadcrumb">
          <button className="archive-crumb" onClick={() => navigateTo(0)}>Archive</button>
          {path.map((seg, i) => (
            <span key={i} className="archive-crumb-group">
              <span className="archive-crumb-sep">›</span>
              <button className="archive-crumb" onClick={() => navigateTo(i + 1)}>{seg}</button>
            </span>
          ))}
        </nav>
      )}

      {path.length === 0 && (
        <h2 className="archive-heading">Archive</h2>
      )}

      {problems === null && (
        <div className="archive-grid">
          {sortedKeys(Object.keys(node ?? {})).map(key => (
            <FolderCard
              key={key}
              name={key}
              count={countProblems(node[key])}
              onClick={() => navigate(key)}
            />
          ))}
        </div>
      )}

      {problems !== null && (
        <div className="archive-problem-list">
          {problems.map(p => {
            const isActive = activeProblemId === p.id
            const done = isActive && (status !== null || revealed)
            const label = getProblemLabel(p.source)
            return (
              <div
                key={p.id}
                className={`archive-problem-row${isActive ? ' archive-problem-active' : ''}`}
              >
                <button
                  className="archive-problem-header"
                  onClick={() => toggleProblem(p.id)}
                >
                  <span className="archive-problem-label">{label}</span>
                  <span className="archive-problem-preview">
                    <InlineMath math={p.integrand} />
                  </span>
                  <span className="archive-problem-chevron">{isActive ? '▲' : '▼'}</span>
                </button>

                {isActive && (
                  <div className="archive-problem-body">
                    <IntegralDisplay latex={p.integrand} />

                    {!done && (
                      <AnswerInput
                        onSubmit={input => handleAnswer(p, input)}
                        disabled={done}
                      />
                    )}

                    {status === 'correct' && (
                      <div className="feedback feedback-correct">
                        Correct!
                        {ratingDelta !== null && (
                          <span className={`rating-delta ${ratingDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
                            {' '}{ratingDelta > 0 ? '+' : ''}{ratingDelta}
                          </span>
                        )}
                      </div>
                    )}
                    {status === 'wrong' && (
                      <div className="feedback feedback-wrong">
                        Not quite — try revealing the answer.
                        {ratingDelta !== null && (
                          <span className={`rating-delta ${ratingDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
                            {' '}{ratingDelta > 0 ? '+' : ''}{ratingDelta}
                          </span>
                        )}
                      </div>
                    )}

                    {revealed && (
                      <div className="reveal-box">
                        <div className="reveal-label">Answer</div>
                        <BlockMath math={p.answer} />
                      </div>
                    )}

                    {!revealed && (
                      <div className="actions">
                        <button className="btn btn-reveal" onClick={() => handleReveal(p)}>
                          Reveal answer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
