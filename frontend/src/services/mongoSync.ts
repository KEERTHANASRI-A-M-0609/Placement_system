import type { UserProfile, Assessment, Application, FailureEntry, ActivityLog, PlatformData, KnowledgeData } from '../types'
import { mergeKnowledge } from '../data/knowledgeDefaults'

import { mongoAPI, setMongoToken, getMongoToken, profileToMongoRegister } from './mongoAPI'

const PENDING_PW_KEY = 'cos_mongo_pending_pw'



export function storePendingPassword(password: string) {

  sessionStorage.setItem(PENDING_PW_KEY, password)

}



export function getPendingPassword(): string | null {

  try { return sessionStorage.getItem(PENDING_PW_KEY) } catch { return null }

}



export function clearPendingPassword() {

  sessionStorage.removeItem(PENDING_PW_KEY)

}



export async function getBackendHealth(): Promise<{ api: boolean; database: boolean; hint?: string }> {
  try {
    const h = await mongoAPI.ping()
    return { api: true, database: h.database === 'connected', hint: h.hint }
  } catch {
    return { api: false, database: false }
  }
}

export async function pingMongo(): Promise<boolean> {
  const h = await getBackendHealth()
  return h.api && h.database
}



export async function loginMongo(email: string, password: string): Promise<boolean> {

  try {

    const res = await mongoAPI.login(email, password)

    setMongoToken(res.token)

    clearPendingPassword()

    return true

  } catch {

    return false

  }

}



export async function registerMongo(user: UserProfile, password: string): Promise<boolean> {

  try {

    const res = await mongoAPI.register(profileToMongoRegister(user, password))

    setMongoToken(res.token)

    clearPendingPassword()

    return true

  } catch (err) {

    const msg = (err as Error).message

    if (msg.includes('already registered')) {

      return loginMongo(user.email, password)

    }

    return false

  }

}



/** Login or register against Mongo — no longer blocked by missing domain/college. */

export async function ensureMongoAuth(user: UserProfile, password?: string): Promise<boolean> {

  if (getMongoToken()) return true

  const pw = password || getPendingPassword()

  if (!pw) return false



  const loggedIn = await loginMongo(user.email, pw)

  if (loggedIn) return true



  return registerMongo(user, pw)

}



export type FullSessionPayload = {

  user: UserProfile | null

  assessment: Assessment | null

  applications: Application[]

  failures: FailureEntry[]

  activityLog: ActivityLog[]

  platformData: PlatformData | null
  knowledge?: KnowledgeData | null
}



export async function syncFullSessionToMongo(session: FullSessionPayload): Promise<boolean> {

  if (!getMongoToken() || !session.user?.email) return false

  try {

    await mongoAPI.syncSession({

      profile: {

        name: session.user.name,

        email: session.user.email,

        phone: session.user.phone,

        college: session.user.college,

        branch: session.user.branch,

        graduationYear: session.user.graduationYear,

        cgpa: session.user.cgpa,

        domain: session.user.domain,

        targetRole: session.user.targetRole,

        targetCompanies: session.user.targetCompanies,

        weeklyHours: session.user.weeklyHours,

        level: session.user.level,

        goal: session.user.goal,

      },

      assessment: session.assessment

        ? {

            dsa: session.assessment.dsa,

            resume: session.assessment.resume,

            projects: session.assessment.projects,

            communication: session.assessment.communication,

            aptitude: session.assessment.aptitude,

            interview: session.assessment.interview,

            resumeEvidence: session.assessment.resumeEvidence,

            commEvidence: session.assessment.commEvidence,

            aptitudeEvidence: session.assessment.aptitudeEvidence,

          }

        : null,

      platformData: session.platformData,

      applications: session.applications,

      failures: session.failures,

      activityLog: session.activityLog,

      knowledgeData: session.knowledge ?? null,

    })

    return true

  } catch (err) {

    console.warn('[mongoSync] syncFullSession failed:', (err as Error).message)

    return false

  }

}



export async function syncAssessmentToMongo(data: Record<string, unknown>): Promise<boolean> {

  if (!getMongoToken()) return false

  try {

    await mongoAPI.syncProfile(data)

    return true

  } catch {

    return false

  }

}



export async function syncUserPhoneToMongo(phone: string): Promise<boolean> {

  if (!getMongoToken() || !phone?.trim()) return false

  try {

    await mongoAPI.syncProfile({ phone })

    return true

  } catch {

    return false

  }

}



function hasAssessmentData(a: Assessment | null | undefined): boolean {
  if (!a) return false
  const sum = (a.dsa ?? 0) + (a.resume ?? 0) + (a.projects ?? 0) + (a.communication ?? 0) + (a.aptitude ?? 0) + (a.interview ?? 0)
  return sum > 0 || Boolean(a.assessedAt)
}

function mergeActivityLogs(local: ActivityLog[], remote: ActivityLog[]): ActivityLog[] {
  const map = new Map<string, ActivityLog>()
  for (const entry of [...remote, ...local]) {
    const prev = map.get(entry.date)
    if (!prev || entry.tasksCompleted > prev.tasksCompleted || entry.hoursSpent > prev.hoursSpent) {
      map.set(entry.date, entry)
    }
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function mergeRemoteSession(local: FullSessionPayload, remote: Awaited<ReturnType<typeof mongoAPI.getSession>>): FullSessionPayload {
  const profile = remote.profile
  const user = local.user
    ? {
        ...local.user,
        name: profile.name || local.user.name,
        phone: profile.phone || local.user.phone,
        college: profile.college || local.user.college,
        branch: profile.branch || local.user.branch,
        graduationYear: profile.graduationYear || local.user.graduationYear,
        cgpa: profile.cgpa || local.user.cgpa,
        domain: profile.domain || local.user.domain,
        targetRole: profile.targetRole || local.user.targetRole,
        targetCompanies: profile.targetCompanies?.length ? profile.targetCompanies : local.user.targetCompanies,
        weeklyHours: profile.weeklyHours || local.user.weeklyHours,
        level: local.user.level,
        goal: local.user.goal,
        email: local.user.email,
      }
    : null

  const remoteAssessment = remote.assessment
    ? { ...remote.assessment, completed: hasAssessmentData(remote.assessment) } as Assessment
    : null
  const assessment = hasAssessmentData(remoteAssessment) ? remoteAssessment : local.assessment

  const applications = (remote.applications?.length ?? 0) >= (local.applications?.length ?? 0)
    ? remote.applications
    : local.applications

  const failures = (remote.failures?.length ?? 0) >= (local.failures?.length ?? 0)
    ? remote.failures
    : local.failures

  const knowledge = remote.knowledgeData
    ? mergeKnowledge(remote.knowledgeData as KnowledgeData)
    : mergeKnowledge(local.knowledge)

  return {
    user,
    assessment,
    platformData: remote.platformData ?? local.platformData,
    applications,
    failures,
    activityLog: mergeActivityLogs(local.activityLog ?? [], remote.activityLog ?? []),
    knowledge,
  }
}

export async function loadSessionFromMongo(local: FullSessionPayload): Promise<FullSessionPayload> {
  if (!getMongoToken()) return local
  try {
    const remote = await mongoAPI.getSession()
    return mergeRemoteSession(local, remote)
  } catch (err) {
    console.warn('[mongoSync] loadSession failed:', (err as Error).message)
    return local
  }
}
