import { initProblemRating } from './glicko2.js'

const USERS_KEY = 'ib_users'
const PROBLEM_RATINGS_KEY = 'ib_problem_ratings'
const CURRENT_USER_KEY = 'ib_current_user'

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {} } catch { return {} }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getUser(username) {
  return getUsers()[username] || null
}

export function saveUser(username, data) {
  const users = getUsers()
  users[username] = data
  saveUsers(users)
}

export function getProblemRating(id, source) {
  try {
    const all = JSON.parse(localStorage.getItem(PROBLEM_RATINGS_KEY)) || {}
    return all[id] || initProblemRating(source)
  } catch {
    return initProblemRating(source)
  }
}

export function saveProblemRating(id, data) {
  let all = {}
  try { all = JSON.parse(localStorage.getItem(PROBLEM_RATINGS_KEY)) || {} } catch {}
  all[id] = data
  localStorage.setItem(PROBLEM_RATINGS_KEY, JSON.stringify(all))
}

export function getCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY) || null
}

export function setCurrentUser(username) {
  if (username === null) {
    localStorage.removeItem(CURRENT_USER_KEY)
  } else {
    localStorage.setItem(CURRENT_USER_KEY, username)
  }
}

// Returns { success, error, user }
export function login(username, password) {
  if (!username.trim()) return { success: false, error: 'Username required.' }
  if (!password) return { success: false, error: 'Password required.' }
  const existing = getUser(username)
  if (existing) {
    if (existing.password !== password) return { success: false, error: 'Wrong password.' }
    setCurrentUser(username)
    return { success: true, user: existing }
  }
  // New user — register
  const user = { password, rating: 1500, rd: 500, volatility: 0.09, ratingHistory: [], mistakeIds: [], totalSolved: 0, totalAttempted: 0 }
  saveUser(username, user)
  setCurrentUser(username)
  return { success: true, user }
}

export function appendRatingHistory(username, rating) {
  const userData = getUser(username)
  if (!userData) return
  const history = userData.ratingHistory || []
  history.push({ rating, ts: Date.now() })
  if (history.length > 500) history.splice(0, history.length - 500)
  saveUser(username, { ...userData, ratingHistory: history })
}

export function getRatingHistory(username) {
  const userData = getUser(username)
  return userData?.ratingHistory || []
}

export function getMistakeIds(username) {
  const userData = getUser(username)
  return userData?.mistakeIds || []
}

export function addMistake(username, problemId) {
  const userData = getUser(username)
  if (!userData) return
  const ids = new Set(userData.mistakeIds || [])
  ids.add(problemId)
  saveUser(username, { ...userData, mistakeIds: [...ids] })
}

export function removeMistake(username, problemId) {
  const userData = getUser(username)
  if (!userData) return
  const ids = (userData.mistakeIds || []).filter(id => id !== problemId)
  saveUser(username, { ...userData, mistakeIds: ids })
}

export function incrementSolveStats(username, correct) {
  const userData = getUser(username)
  if (!userData) return
  saveUser(username, {
    ...userData,
    totalAttempted: (userData.totalAttempted || 0) + 1,
    totalSolved: (userData.totalSolved || 0) + (correct ? 1 : 0),
  })
}

export function getSolveStats(username) {
  const userData = getUser(username)
  return { totalSolved: userData?.totalSolved || 0, totalAttempted: userData?.totalAttempted || 0 }
}

export function logout() {
  setCurrentUser(null)
}

export function getAllUsers() {
  const users = getUsers()
  return Object.entries(users)
    .map(([username, data]) => ({ username, rating: data.rating, rd: data.rd }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10)
}
