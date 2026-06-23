// Public platform integrations — backend proxy first, direct APIs as fallback

const API_BASE = import.meta.env.VITE_MONGO_API_URL || 'http://localhost:5000'

export interface LeetCodeData {
  username: string
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  acceptanceRate: number
  ranking: number
  contestRating: number | null
}

export interface GitHubData {
  username: string
  publicRepos: number
  followers: number
  totalStars: number
  topLanguages: string[]
  recentCommitDays: number
  hasReadmeRepos: number
}

export interface PlatformData {
  leetcode: LeetCodeData | null
  github: GitHubData | null
  fetchedAt: string
}

async function fetchFromBackend<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function normalizeLeetCode(username: string, data: Record<string, unknown>): LeetCodeData {
  const total = Number(data.totalSolved ?? data.totalSolvedCount ?? 0)
  if (!Number.isFinite(total)) {
    throw new Error(`LeetCode user "${username}" not found or profile is private`)
  }
  return {
    username,
    totalSolved: total,
    easySolved: Number(data.easySolved ?? data.easySolvedCount ?? 0),
    mediumSolved: Number(data.mediumSolved ?? data.mediumSolvedCount ?? 0),
    hardSolved: Number(data.hardSolved ?? data.hardSolvedCount ?? 0),
    acceptanceRate: Number(data.acceptanceRate ?? 0),
    ranking: Number(data.ranking ?? 0),
    contestRating: data.contestRating != null ? Number(data.contestRating) : null,
  }
}

export async function fetchLeetCode(username: string): Promise<LeetCodeData> {
  const clean = username.trim()
  if (!/^[a-zA-Z0-9_-]{3,25}$/.test(clean)) {
    throw new Error('Invalid LeetCode username format')
  }

  const proxied = await fetchFromBackend<LeetCodeData>(`/api/platforms/leetcode/${encodeURIComponent(clean)}`)
  if (proxied?.username) return proxied

  const directUrls = [
    `https://alfa-leetcode-api.onrender.com/${clean}`,
    `https://alfa-leetcode-api.onrender.com/userProfile/${clean}`,
    `https://leetcode-stats-api.herokuapp.com/${clean}`,
  ]

  let lastErr: Error | null = null
  for (const url of directUrls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (res.status === 404) throw new Error(`LeetCode user "${clean}" not found`)
      if (!res.ok) continue
      const data = await res.json()
      return normalizeLeetCode(clean, data)
    } catch (e) {
      lastErr = e as Error
      if ((e as Error).message.includes('not found')) throw e
    }
  }

  throw lastErr ?? new Error('Could not reach LeetCode — check your connection and try again.')
}

export async function fetchGitHub(username: string): Promise<GitHubData> {
  const clean = username.trim()
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(clean)) {
    throw new Error('Invalid GitHub username format')
  }

  const proxied = await fetchFromBackend<GitHubData>(`/api/platforms/github/${encodeURIComponent(clean)}`)
  if (proxied?.username) return proxied

  const headers = { Accept: 'application/vnd.github+json' }

  const [userRes, reposRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${clean}`, { headers }),
    fetch(`https://api.github.com/users/${clean}/repos?per_page=100&sort=updated`, { headers }),
    fetch(`https://api.github.com/users/${clean}/events/public?per_page=100`, { headers }),
  ])

  if (userRes.status === 404) throw new Error(`GitHub user "${clean}" not found`)
  if (!userRes.ok) throw new Error('GitHub API rate limit or error — try again in a minute.')

  const user = await userRes.json()
  const repos: { stargazers_count: number; language: string | null; fork: boolean }[] =
    reposRes.ok ? await reposRes.json() : []
  const events: { type: string; created_at: string }[] =
    eventsRes.ok ? await eventsRes.json() : []

  const owned = repos.filter((r) => !r.fork)
  const totalStars = owned.reduce((s, r) => s + (r.stargazers_count ?? 0), 0)

  const langFreq: Record<string, number> = {}
  owned.filter((r) => r.language).forEach((r) => {
    langFreq[r.language!] = (langFreq[r.language!] || 0) + 1
  })
  const topLanguages = Object.entries(langFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([l]) => l)

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const pushDays = new Set(
    events
      .filter((e) => e.type === 'PushEvent' && new Date(e.created_at).getTime() > thirtyDaysAgo)
      .map((e) => e.created_at.split('T')[0])
  )

  return {
    username: clean,
    publicRepos: user.public_repos ?? 0,
    followers: user.followers ?? 0,
    totalStars,
    topLanguages,
    recentCommitDays: pushDays.size,
    hasReadmeRepos: owned.length,
  }
}
