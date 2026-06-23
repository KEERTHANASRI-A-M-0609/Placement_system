const UA = 'Vertex-Placement-Platform/1.0'

export interface LeetCodeProfile {
  username: string
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  acceptanceRate: number
  ranking: number
  contestRating: number | null
}

export interface GitHubProfile {
  username: string
  publicRepos: number
  followers: number
  totalStars: number
  topLanguages: string[]
  recentCommitDays: number
  hasReadmeRepos: number
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { ...(init?.headers ?? {}), 'User-Agent': UA } })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status: number }
    err.status = res.status
    throw err
  }
  return res.json()
}

function normalizeLeetCode(username: string, data: Record<string, unknown>): LeetCodeProfile {
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

export async function fetchLeetCodeProfile(username: string): Promise<LeetCodeProfile> {
  const clean = username.trim()
  if (!/^[a-zA-Z0-9_-]{3,25}$/.test(clean)) {
    throw new Error('Invalid LeetCode username format')
  }

  const sources = [
    `https://alfa-leetcode-api.onrender.com/${clean}`,
    `https://alfa-leetcode-api.onrender.com/userProfile/${clean}`,
    `https://leetcode-stats-api.herokuapp.com/${clean}`,
  ]

  let lastErr: Error | null = null
  for (const url of sources) {
    try {
      const data = await fetchJson(url)
      return normalizeLeetCode(clean, data as Record<string, unknown>)
    } catch (e) {
      lastErr = e as Error
    }
  }

  throw lastErr ?? new Error('Could not reach LeetCode — try again in a moment.')
}

export async function fetchGitHubProfile(username: string): Promise<GitHubProfile> {
  const clean = username.trim()
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(clean)) {
    throw new Error('Invalid GitHub username format')
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': UA,
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  const [userRes, reposRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${clean}`, { headers }),
    fetch(`https://api.github.com/users/${clean}/repos?per_page=100&sort=updated`, { headers }),
    fetch(`https://api.github.com/users/${clean}/events/public?per_page=100`, { headers }),
  ])

  if (userRes.status === 404) throw new Error(`GitHub user "${clean}" not found`)
  if (!userRes.ok) throw new Error('GitHub API error — try again.')

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
