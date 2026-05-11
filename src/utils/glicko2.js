const SCALE = 173.7178
const TAU = 0.75
const EPSILON = 0.000001

function toGlicko2(r, rd) {
  return { mu: (r - 1500) / SCALE, phi: rd / SCALE }
}

function fromGlicko2(mu, phi) {
  return { rating: SCALE * mu + 1500, rd: SCALE * phi }
}

function g(phi) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
}

function E(mu, mu_j, phi_j) {
  return 1 / (1 + Math.exp(-g(phi_j) * (mu - mu_j)))
}

function updateVolatility(phi, sigma, delta, v) {
  const a = Math.log(sigma * sigma)
  const delta2 = delta * delta
  const phi2 = phi * phi

  function f(x) {
    const ex = Math.exp(x)
    return (ex * (delta2 - phi2 - v - ex)) / (2 * Math.pow(phi2 + v + ex, 2)) - (x - a) / (TAU * TAU)
  }

  let A = a
  let B
  if (delta2 > phi2 + v) {
    B = Math.log(delta2 - phi2 - v)
  } else {
    let k = 1
    while (f(a - k * TAU) < 0) k++
    B = a - k * TAU
  }

  let fA = f(A)
  let fB = f(B)

  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) {
      A = B
      fA = fB
    } else {
      fA = fA / 2
    }
    B = C
    fB = fC
  }

  return Math.exp(A / 2)
}

function updateOne(player, oppMu, oppPhi, score) {
  const { mu, phi } = toGlicko2(player.rating, player.rd)
  const sigma = player.volatility

  const g_opp = g(oppPhi)
  const e = E(mu, oppMu, oppPhi)
  const v = 1 / (g_opp * g_opp * e * (1 - e))
  const delta = v * g_opp * (score - e)

  const sigma2 = updateVolatility(phi, sigma, delta, v)
  const phiStar = Math.sqrt(phi * phi + sigma2 * sigma2)
  const phi2 = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const mu2 = mu + phi2 * phi2 * g_opp * (score - e)

  const { rating, rd } = fromGlicko2(mu2, phi2)
  return { rating, rd, volatility: sigma2 }
}

// Updates both player and problem ratings for one solve.
// score: 1 = player solved correctly, 0 = player failed/revealed
export function updateRatings(player, problem, score) {
  const pMu = toGlicko2(problem.rating, problem.rd)
  const plMu = toGlicko2(player.rating, player.rd)

  const newPlayer = updateOne(player, pMu.mu, pMu.phi, score)
  const newProblem = updateOne(problem, plMu.mu, plMu.phi, 1 - score)

  return { player: newPlayer, problem: newProblem }
}

// Derive initial problem rating from its source string.
export function initProblemRating(source) {
  const match = source && source.match(/Problem (\d+)/)
  const n = match ? parseInt(match[1], 10) : 10
  const rating = Math.min(1200 + (n - 1) * 60, 2500)
  return { rating, rd: 300, volatility: 0.09 }
}
