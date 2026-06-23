import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { UserProfile, Assessment, RecoveryState, Application, FailureEntry, DSATopic, Project, ActivityLog, WeekSnapshot, PlatformData, KnowledgeData } from '../types'
import { mergeKnowledge, createDefaultKnowledge } from '../data/knowledgeDefaults'
import { backendAPI } from '../services/api'
import { mongoAPI, dashboardToAssessment, setMongoToken, getMongoToken } from '../services/mongoAPI'
import { pingMongo, ensureMongoAuth, syncAssessmentToMongo, syncUserPhoneToMongo, syncFullSessionToMongo, loadSessionFromMongo } from '../services/mongoSync'
import { upsertActivityLog, computeDaysInactive, localDateKey } from '../engine/activityEngine'
import { verifySession, saveUserSession, loadUserSession, findAccount, saveAccount } from '../services/authStore'
import type { UserSessionData } from '../services/authStore'
import { dispatchPlatformNotification } from '../services/notificationDispatchClient'
import {
  buildLocalNotifications,
  fetchMongoNotifications,
  localToNotifications,
  mergeNotifications,
} from '../services/notificationSync'
import {
  type WhatsAppPrefs,
  DEFAULT_WHATSAPP_PREFS,
  syncWhatsAppProfile,
  sendWhatsAppDigest,
  sendWhatsAppWeeklyReport,
  sendApplicationWhatsAppAlert,
  sendWhatsAppAlert,
} from '../services/whatsappService'

export type AppView = 'landing' | 'login' | 'onboarding' | 'assessment' | 'app' | 'notifications'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'danger'
  createdAt: string
  read: boolean
  moduleId?: string
}

interface AppState {
  view: AppView
  user: UserProfile | null
  studentId: number | null
  assessment: Assessment | null
  recovery: RecoveryState
  theme: 'light' | 'dark'
  applications: Application[]
  failures: FailureEntry[]
  dsaTopics: DSATopic[]
  projects: Project[]
  activityLog: ActivityLog[]
  weeklySnapshots: WeekSnapshot[]
  platformData: PlatformData | null
  knowledge: KnowledgeData
  setKnowledge: (k: KnowledgeData) => void
  backendOnline: boolean
  mongoOnline: boolean
  setMongoOnline: (v: boolean) => void
  syncSessionNow: () => void
  nudgeDismissed: boolean
  notifications: AppNotification[]
  whatsappPrefs: WhatsAppPrefs
  setPlatformData: (d: PlatformData) => void
  setView: (v: AppView) => void
  setUser: (u: UserProfile) => void
  setAssessment: (a: Assessment) => void
  updateAssessment: (a: Assessment) => void
  setRecovery: (r: Partial<RecoveryState>) => void
  toggleTheme: () => void
  signOut: () => void
  setApplications: (apps: Application[]) => void
  addApplication: (app: Omit<Application, 'id'>) => void
  setFailures: (f: FailureEntry[]) => void
  setDsaTopics: (t: DSATopic[]) => void
  setProjects: (p: Project[]) => void
  logActivity: (hoursSpent: number, tasksCompleted: number) => void
  recordExecution: (opts?: { tasks?: number; hours?: number; minutes?: number }) => void
  recordVerifiedPlannerTask: (estimatedMins: number) => void
  syncTodayActivity: (tasksCompleted: number, hoursSpent: number) => void
  snapshotWeek: (label: string, readiness: number, hours: number) => void
  dismissNudge: () => void
  resetAssessmentNudge: () => void
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => void
  syncNotifications: () => Promise<void>
  setWhatsappPrefs: (p: Partial<WhatsAppPrefs>) => void
  sendWhatsAppDigestNow: () => Promise<{ status: string; hint?: string; reason?: string; to?: string } | null>
  sendWhatsAppWeeklyNow: () => Promise<{ status: string; hint?: string; reason?: string; to?: string } | null>
}

const AppContext = createContext<AppState>({} as AppState)

const DEFAULT_RECOVERY: RecoveryState = {
  inactive: false, daysInactive: 0, reason: '', planActive: false, tasksDone: {}
}

const STORAGE_KEY = 'cos_v5'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function sessionFromStore(s: ReturnType<typeof load>): UserSessionData {
  return {
    assessment: s.assessment ?? null,
    studentId: s.studentId ?? null,
    platformData: s.platformData ?? null,
    applications: s.applications ?? [],
    failures: s.failures ?? [],
    projects: s.projects ?? [],
    activityLog: s.activityLog ?? [],
    weeklySnapshots: s.weeklySnapshots ?? [],
    dsaTopics: s.dsaTopics ?? [],
    recovery: s.recovery,
    notifications: s.notifications ?? [],
    whatsappPrefs: s.whatsappPrefs,
    nudgeDismissed: s.nudgeDismissed,
    theme: s.theme,
    knowledge: s.knowledge,
  }
}

function save(patch: object) {
  const next = { ...load(), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  const email = (next as { user?: UserProfile }).user?.email
  if (email) saveUserSession(email, sessionFromStore(next))
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [view,            setViewState]      = useState<AppView>('landing')
  const [user,            setUserState]      = useState<UserProfile | null>(null)
  const [studentId,       setStudentId]      = useState<number | null>(null)
  const [assessment,      setAssessState]    = useState<Assessment | null>(null)
  const [recovery,        setRecovState]     = useState<RecoveryState>(DEFAULT_RECOVERY)
  const [theme,           setThemeState]     = useState<'light' | 'dark'>('light')
  const [applications,    setAppsState]      = useState<Application[]>([])
  const [failures,        setFailState]      = useState<FailureEntry[]>([])
  const [dsaTopics,       setDsaState]       = useState<DSATopic[]>([])
  const [projects,        setProjState]      = useState<Project[]>([])
  const [activityLog,     setActivityState]  = useState<ActivityLog[]>([])
  const [weeklySnapshots, setSnapshotsState] = useState<WeekSnapshot[]>([])
  const [platformData,    setPlatformState]  = useState<PlatformData | null>(null)
  const [knowledge,       setKnowledgeState] = useState<KnowledgeData>(createDefaultKnowledge())
  const [backendOnline,   setBackendOnline]  = useState(false)
  const [mongoOnline,     setMongoOnline]    = useState(false)
  const [nudgeDismissed,  setNudgeDismissed] = useState(false)
  const [notifications,   setNotifications]  = useState<AppNotification[]>([])
  const [whatsappPrefs,   setWhatsappPrefsState] = useState<WhatsAppPrefs>(DEFAULT_WHATSAPP_PREFS)
  const [ready,           setReady]          = useState(false)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notifSyncRef = useRef(false)

  const pushSessionToMongo = useCallback(() => {
    if (!getMongoToken()) return
    const s = load()
    if (!s.user) return
    syncFullSessionToMongo({
      user: s.user,
      assessment: s.assessment ?? null,
      applications: s.applications ?? [],
      failures: s.failures ?? [],
      activityLog: s.activityLog ?? [],
      platformData: s.platformData ?? null,
      knowledge: mergeKnowledge(s.knowledge),
    }).catch(() => {})
  }, [])

  const scheduleMongoSync = useCallback(() => {
    if (!getMongoToken()) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      pushSessionToMongo()
    }, 2000)
  }, [pushSessionToMongo])

  const setKnowledge = useCallback((k: KnowledgeData) => {
    setKnowledgeState(k)
    save({ knowledge: k })
    scheduleMongoSync()
  }, [scheduleMongoSync])

  const loadSkippedModules = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem('cos_skipped_modules') || '{}') } catch { return {} }
  }

  const syncNotifications = useCallback(async () => {
    if (!user || notifSyncRef.current) return
    notifSyncRef.current = true
    try {
      const skipped = loadSkippedModules()
      const localItems = buildLocalNotifications(user, assessment, platformData, applications, activityLog, skipped)
      const localNotifs = localToNotifications(localItems)

      let incoming = localNotifs
      if (mongoOnline && getMongoToken()) {
        try {
          const mongoNotifs = await fetchMongoNotifications()
          incoming = mergeNotifications(mongoNotifs, localNotifs)
        } catch {
          incoming = localNotifs
        }
      }

      setNotifications(prev => {
        const next = mergeNotifications(prev, incoming)
        save({ notifications: next })
        return next
      })
    } finally {
      notifSyncRef.current = false
    }
  }, [user, assessment, platformData, applications, activityLog, mongoOnline])

  const applySession = (session: UserSessionData | undefined) => {
    if (!session) return
    if (session.assessment !== undefined) setAssessState(session.assessment)
    if (session.studentId !== undefined) setStudentId(session.studentId)
    if (session.platformData !== undefined) setPlatformState(session.platformData)
    if (session.applications) setAppsState(session.applications)
    if (session.failures) setFailState(session.failures)
    if (session.projects) setProjState(session.projects)
    if (session.activityLog) setActivityState(session.activityLog)
    if (session.weeklySnapshots) setSnapshotsState(session.weeklySnapshots)
    if (session.dsaTopics) setDsaState(session.dsaTopics)
    if (session.recovery) setRecovState(session.recovery)
    if (session.notifications) {
      setNotifications(session.notifications.map(n => ({
        ...n,
        type: (['info', 'warning', 'success', 'danger'].includes(n.type) ? n.type : 'info') as AppNotification['type'],
      })))
    }
    if (session.whatsappPrefs) setWhatsappPrefsState({ ...DEFAULT_WHATSAPP_PREFS, ...session.whatsappPrefs })
    if (session.nudgeDismissed !== undefined) setNudgeDismissed(session.nudgeDismissed)
    if (session.theme) setThemeState(session.theme)
    if (session.knowledge) setKnowledgeState(mergeKnowledge(session.knowledge))
  }

  useEffect(() => {
    const s = load()
    // Validate session — must have a registered account
    if (s.user && !verifySession(s.user)) {
      localStorage.removeItem(STORAGE_KEY)
      setReady(true)
      return
    }
    if (s.user) {
      setUserState(s.user)
      const accountSession = loadUserSession(s.user.email)
      if (accountSession) {
        applySession(accountSession)
      } else {
        if (s.studentId) setStudentId(s.studentId)
        if (s.assessment) setAssessState(s.assessment)
        if (s.recovery) setRecovState(s.recovery)
        if (s.theme) setThemeState(s.theme)
        setAppsState(s.applications ?? [])
        setFailState(s.failures ?? [])
        setDsaState(s.dsaTopics ?? [])
        setProjState(s.projects ?? [])
        if (s.activityLog) setActivityState(s.activityLog)
        if (s.weeklySnapshots) setSnapshotsState(s.weeklySnapshots)
        if (s.platformData) setPlatformState(s.platformData)
        if (s.knowledge) setKnowledgeState(mergeKnowledge(s.knowledge))
        setNudgeDismissed(s.nudgeDismissed ?? false)
        setNotifications(s.notifications ?? [])
        if (s.whatsappPrefs) setWhatsappPrefsState({ ...DEFAULT_WHATSAPP_PREFS, ...s.whatsappPrefs })
      }
    }
  // Restore app only for signed-in users — never auto-open assessment or notifications overlay
    if (s.user) {
      const savedView = s.view as AppView | undefined
      const restored: AppView =
        savedView === 'assessment' || savedView === 'notifications'
          ? 'app'
          : savedView && savedView !== 'landing' && savedView !== 'login'
            ? savedView
            : 'app'
      setViewState(restored)
      if (savedView === 'notifications') save({ view: 'app' })
    }
    setReady(true)
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/health`).then(r => r.ok && setBackendOnline(true)).catch(() => {})
    pingMongo().then(async ok => {
      setMongoOnline(ok)
      if (!ok || !getMongoToken()) return
      const stored = load()
      if (!stored.user) return
      const merged = await loadSessionFromMongo({
        user: stored.user,
        assessment: stored.assessment ?? null,
        applications: stored.applications ?? [],
        failures: stored.failures ?? [],
        activityLog: stored.activityLog ?? [],
        platformData: stored.platformData ?? null,
        knowledge: mergeKnowledge(stored.knowledge),
      })
      if (merged.assessment) setAssessState(merged.assessment)
      if (merged.platformData) setPlatformState(merged.platformData)
      if (merged.applications?.length) setAppsState(merged.applications)
      if (merged.failures?.length) setFailState(merged.failures)
      if (merged.activityLog?.length) setActivityState(merged.activityLog)
      if (merged.knowledge) setKnowledgeState(mergeKnowledge(merged.knowledge))
      save({
        assessment: merged.assessment,
        platformData: merged.platformData,
        applications: merged.applications,
        failures: merged.failures,
        activityLog: merged.activityLog,
        knowledge: merged.knowledge,
      })
    })
  }, [])

  // Sync notifications when user data changes
  useEffect(() => {
    if (!user || !ready) return
    const t = setTimeout(() => { syncNotifications() }, 800)
    return () => clearTimeout(t)
  }, [user, assessment, applications, activityLog, platformData, mongoOnline, ready, syncNotifications])

  // Derive recovery state from real execution activity
  useEffect(() => {
    if (!user || !ready) return
    const daysInactive = computeDaysInactive(activityLog)
    const hasHistory = activityLog.some(l => l.tasksCompleted > 0 || l.hoursSpent > 0 || (l.executions ?? 0) > 0)

    setRecovState(prev => {
      const next: RecoveryState = hasHistory && daysInactive >= 3
        ? {
            ...prev,
            inactive: true,
            daysInactive,
            reason: `No execution activity for ${daysInactive} days`,
            planActive: prev.planActive || daysInactive >= 3,
          }
        : {
            ...prev,
            inactive: false,
            daysInactive,
            reason: prev.reason,
            planActive: hasHistory && daysInactive >= 3 ? prev.planActive : false,
          }
      save({ recovery: next })
      return next
    })
  }, [activityLog, user, ready])

  // Daily digest — once per day when app opens
  useEffect(() => {
    if (!user) return
    const lastChecked = localStorage.getItem('cos_daily_check')
    const today = new Date().toISOString().split('T')[0]
    if (lastChecked === today) return
    localStorage.setItem('cos_daily_check', today)
    syncNotifications()

    const prefs = { ...DEFAULT_WHATSAPP_PREFS, ...load().whatsappPrefs }
    if (prefs.enabled && prefs.dailyDigest && user.phone) {
      sendWhatsAppDigest(user, assessment, applications, activityLog, weeklySnapshots)
    }

    const isSunday = new Date().getDay() === 0
    const sundayKey = new Date().toISOString().split('T')[0]
    const lastWeekly = localStorage.getItem('cos_weekly_wa')
    if (isSunday && prefs.enabled && prefs.weeklyReport && user.phone && lastWeekly !== sundayKey) {
      localStorage.setItem('cos_weekly_wa', sundayKey)
      sendWhatsAppWeeklyReport(user, assessment, applications, activityLog, weeklySnapshots)
    }
  }, [user])

  // Keep backend WhatsApp profile in sync for STATUS / RESOURCES replies
  useEffect(() => {
    if (!user?.phone || !whatsappPrefs.enabled) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      syncWhatsAppProfile(user, assessment, applications, activityLog, weeklySnapshots)
    }, 1500)
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current) }
  }, [user, assessment, applications, activityLog, weeklySnapshots, whatsappPrefs.enabled])

  // Sync execution activity + reminder prefs to Mongo for server-side 3/7/14-day alerts
  useEffect(() => {
    if (!user || !ready || !mongoOnline || !getMongoToken()) return
    const t = setTimeout(() => {
      mongoAPI.syncActivitySession({
        activityLog,
        phone: user.phone,
        notificationPrefs: {
          emailInactive: whatsappPrefs.inactiveReminders !== false,
          whatsappInactive: whatsappPrefs.inactiveReminders !== false,
          whatsappEnabled: whatsappPrefs.enabled,
          whatsappUrgent: whatsappPrefs.urgentAlerts,
          whatsappDailyDigest: whatsappPrefs.dailyDigest,
          whatsappWeeklyReport: whatsappPrefs.weeklyReport,
          whatsappApplicationAlerts: whatsappPrefs.applicationAlerts,
          emailDigest: whatsappPrefs.dailyDigest || whatsappPrefs.weeklyReport,
        },
      }).catch(() => {})
    }, 2500)
    return () => clearTimeout(t)
  }, [activityLog, whatsappPrefs, user, ready, mongoOnline])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.body.style.background = theme === 'dark' ? '#0F172A' : '#FFFFFF'
  }, [theme])

  const setView = (v: AppView) => {
    const next = v === 'notifications' ? 'app' : v
    setViewState(next)
    save({ view: next })
  }

  const setUser = (u: UserProfile) => {
    if (!u.email?.trim()) return
    const email = u.email.trim().toLowerCase()
    const account = findAccount(email)
    const withPhone: UserProfile = {
      ...u,
      email,
      phone: u.phone?.trim() || account?.phone || account?.profile?.phone || '',
    }
    setUserState(withPhone)

    const session = loadUserSession(email)
    applySession(session)
    save({ user: withPhone, ...(session ?? {}) })

    if (account) {
      saveAccount({
        ...account,
        name: withPhone.name || account.name,
        phone: withPhone.phone || account.phone,
        profile: withPhone,
      })
    }

    backendAPI.upsertStudent(withPhone.name, email, withPhone.domain)
      .then(res => { setStudentId(res.id); save({ studentId: res.id }) })
      .catch(() => {})

    ensureMongoAuth(withPhone).then(async ok => {
      if (!ok) {
        pingMongo().then(setMongoOnline)
        return
      }
      setMongoOnline(true)
      if (withPhone.phone) syncUserPhoneToMongo(withPhone.phone).catch(() => {})
      try {
        const localSession: import('../services/mongoSync').FullSessionPayload = {
          user: withPhone,
          assessment: load().assessment ?? null,
          applications: load().applications ?? [],
          failures: load().failures ?? [],
          activityLog: load().activityLog ?? [],
          platformData: load().platformData ?? null,
          knowledge: mergeKnowledge(load().knowledge),
        }
        const merged = await loadSessionFromMongo(localSession)
        if (merged.user) {
          setUserState(merged.user)
          save({ user: merged.user })
        }
        if (merged.assessment) { setAssessState(merged.assessment); save({ assessment: merged.assessment }) }
        if (merged.platformData) { setPlatformState(merged.platformData); save({ platformData: merged.platformData }) }
        if (merged.applications?.length) { setAppsState(merged.applications); save({ applications: merged.applications }) }
        if (merged.failures?.length) { setFailState(merged.failures); save({ failures: merged.failures }) }
        if (merged.activityLog?.length) { setActivityState(merged.activityLog); save({ activityLog: merged.activityLog }) }
        if (merged.knowledge) { setKnowledgeState(mergeKnowledge(merged.knowledge)); save({ knowledge: merged.knowledge }) }
      } catch {
        try {
          const dash = await mongoAPI.getDashboard()
          const { assessment: a, platformData: pd } = dashboardToAssessment(dash)
          if (a) { setAssessState(a); save({ assessment: a }) }
          if (pd) { setPlatformState(pd); save({ platformData: pd }) }
        } catch { /* keep local state */ }
      }
      pushSessionToMongo()
    })
  }

  const setAssessment = (a: Assessment) => {
    setAssessState(a)
    save({ assessment: a })
    const sid = load().studentId
    if (sid) {
      backendAPI.saveAssessment(sid, a.dsa, a.aptitude, a.communication, a.resume).catch(() => {})
    }
    pushNotificationInternal({
      title: 'Assessment complete',
      message: `Your placement readiness profile has been built. Check your Dashboard.`,
      type: 'success',
    }, true)
    recordExecutionInternal({ executionsDelta: 1, minutes: 45 })
  }

  const updateAssessment = (a: Assessment) => {
    setAssessState(a)
    save({ assessment: a })
    const sid = load().studentId
    if (sid) {
      backendAPI.saveAssessment(sid, a.dsa, a.aptitude, a.communication, a.resume).catch(() => {})
    }
    const pd = load().platformData
    syncAssessmentToMongo({
      dsa: a.dsa, resume: a.resume, projects: a.projects,
      communication: a.communication, aptitude: a.aptitude, interview: a.interview,
      resumeEvidence: a.resumeEvidence, commEvidence: a.commEvidence,
      aptitudeEvidence: a.aptitudeEvidence, platformData: pd,
    }).catch(() => {})
    scheduleMongoSync()
    recordExecutionInternal({ executionsDelta: 1, minutes: 30 })
  }

  const setRecovery = (r: Partial<RecoveryState>) => {
    setRecovState(prev => { const next = { ...prev, ...r }; save({ recovery: next }); return next })
  }
  const toggleTheme = () => {
    setThemeState(t => { const next = t === 'dark' ? 'light' : 'dark'; save({ theme: next }); return next })
  }
  const setApplications = (apps: Application[]) => { setAppsState(apps); save({ applications: apps }); scheduleMongoSync() }

  const addApplication = (app: Omit<Application, 'id'>) => {
    const newApp: Application = { ...app, id: Date.now().toString() }
    const next = [newApp, ...applications]
    setAppsState(next)
    save({ applications: next })

    pushNotificationInternal({
      title: `${newApp.company} added to pipeline`,
      message: newApp.deadline
        ? `${newApp.role} — deadline ${newApp.deadline}. Tracked in your pipeline.`
        : `${newApp.role} — added to ${newApp.status}.`,
      type: 'info',
    }, false)

    const prefs = { ...DEFAULT_WHATSAPP_PREFS, ...load().whatsappPrefs }
    if (prefs.enabled && prefs.applicationAlerts && user?.phone) {
      sendApplicationWhatsAppAlert(
        user,
        newApp,
        assessment,
        next,
        activityLog,
        weeklySnapshots,
      )
    }
    recordExecutionInternal({ executionsDelta: 1 })
    scheduleMongoSync()
  }
  const setFailures = (f: FailureEntry[]) => {
    const added = f.length > failures.length
    setFailState(f)
    save({ failures: f })
    if (added) recordExecutionInternal({ executionsDelta: 1, minutes: 15 })
    scheduleMongoSync()
  }
  const setDsaTopics = (t: DSATopic[]) => { setDsaState(t); save({ dsaTopics: t }) }
  const setProjects = (p: Project[]) => { setProjState(p); save({ projects: p }) }
  const setPlatformData = (d: PlatformData) => { setPlatformState(d); save({ platformData: d }) }
  const dismissNudge = () => { setNudgeDismissed(true); save({ nudgeDismissed: true }) }

  // Reset assessment nudge on fresh sign-in so dashboard popup appears
  const resetAssessmentNudge = () => {
    setNudgeDismissed(false)
    save({ nudgeDismissed: false })
  }

  function recordExecutionInternal(opts?: { tasks?: number; hours?: number; minutes?: number; executionsDelta?: number }) {
    const date = localDateKey()
    const hoursDelta = opts?.hours ?? (opts?.minutes ? opts.minutes / 60 : 0)
    const execDelta = opts?.executionsDelta ?? (opts?.tasks === undefined && hoursDelta === 0 ? 1 : 0)

    setActivityState(prev => {
      const existing = prev.find(l => l.date === date)
      const nextEntry: ActivityLog = existing
        ? {
            ...existing,
            tasksCompleted: existing.tasksCompleted + (opts?.tasks ?? 0),
            hoursSpent: parseFloat((existing.hoursSpent + hoursDelta).toFixed(2)),
            executions: (existing.executions ?? 0) + execDelta,
          }
        : {
            date,
            tasksCompleted: opts?.tasks ?? 0,
            hoursSpent: parseFloat(hoursDelta.toFixed(2)),
            executions: execDelta,
          }
      const next = existing
        ? prev.map(l => (l.date === date ? nextEntry : l))
        : [...prev, nextEntry].sort((a, b) => a.date.localeCompare(b.date))
      save({ activityLog: next })
      return next
    })
    scheduleMongoSync()
  }

  const recordExecution = (opts?: { tasks?: number; hours?: number; minutes?: number }) => {
    recordExecutionInternal(opts)
  }

  const recordVerifiedPlannerTask = (estimatedMins: number) => {
    const date = localDateKey()
    const hoursDelta = parseFloat((estimatedMins / 60).toFixed(2))
    setActivityState(prev => {
      const existing = prev.find(l => l.date === date)
      const nextEntry: ActivityLog = existing
        ? {
            ...existing,
            verifiedTasks: (existing.verifiedTasks ?? 0) + 1,
            hoursSpent: parseFloat((existing.hoursSpent + hoursDelta).toFixed(2)),
            executions: (existing.executions ?? 0) + 1,
          }
        : {
            date,
            tasksCompleted: 0,
            hoursSpent: hoursDelta,
            verifiedTasks: 1,
            executions: 1,
        }
      const next = existing
        ? prev.map(l => (l.date === date ? nextEntry : l))
        : [...prev, nextEntry].sort((a, b) => a.date.localeCompare(b.date))
      save({ activityLog: next })
      return next
    })
    scheduleMongoSync()
  }

  const syncTodayActivity = (tasksCompleted: number, hoursSpent: number) => {
    const date = localDateKey()
    setActivityState(prev => {
      const next = upsertActivityLog(prev, { date, tasksCompleted, hoursSpent })
      save({ activityLog: next })
      return next
    })
    scheduleMongoSync()
  }

  const logActivity = (hoursSpent: number, tasksCompleted: number) => {
    recordExecutionInternal({ hours: hoursSpent, tasks: tasksCompleted })
  }

  const snapshotWeek = (label: string, readiness: number, hours: number) => {
    setSnapshotsState(prev => {
      const next = [...prev, { week: label, readiness, hours }]
      save({ weeklySnapshots: next })
      return next
    })
  }

  function pushNotificationInternal(
    n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
    sendDigest = false,
  ) {
    const notif: AppNotification = {
      ...n,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      read: false,
    }
    setNotifications(prev => {
      const next = [notif, ...prev].slice(0, 50)
      save({ notifications: next })
      return next
    })
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(n.title, { body: n.message, icon: '/favicon.svg' })
    }

    const u = load().user as UserProfile | undefined
    const prefs = { ...DEFAULT_WHATSAPP_PREFS, ...load().whatsappPrefs }

    if (sendDigest) {
      if (u?.phone && prefs.enabled) {
        sendWhatsAppDigest(u, load().assessment ?? null, load().applications ?? [], load().activityLog ?? [], load().weeklySnapshots ?? [])
      }
      return
    }

    if (mongoOnline && getMongoToken()) {
      dispatchPlatformNotification({
        title: n.title,
        message: n.message,
        type: n.type,
        moduleId: n.moduleId,
      })
    } else if (u?.phone && prefs.enabled && prefs.urgentAlerts && (n.type === 'danger' || n.type === 'warning' || n.type === 'success')) {
      sendWhatsAppAlert(u.phone, n.title, n.message)
    }
  }

  const pushNotification = (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    pushNotificationInternal(n, false)
  }

  const setWhatsappPrefs = (p: Partial<WhatsAppPrefs>) => {
    setWhatsappPrefsState(prev => {
      const next = { ...prev, ...p }
      save({ whatsappPrefs: next })
      return next
    })
  }

  const sendWhatsAppDigestNow = async () => {
    if (!user?.phone?.trim()) {
      return { status: 'error', reason: 'No WhatsApp number on your profile. Add +91… in Settings or re-register with phone.' }
    }
    if (!getMongoToken()) {
      return { status: 'error', reason: 'Sign in with your email and password to send WhatsApp messages.', hint: 'Log out and log in again so the app can reach the notification server.' }
    }
    try {
      await mongoAPI.syncActivitySession({ phone: user.phone }).catch(() => {})
      return await mongoAPI.triggerDailyDigest()
    } catch (err) {
      return { status: 'error', reason: (err as Error).message }
    }
  }

  const sendWhatsAppWeeklyNow = async () => {
    if (!user?.phone?.trim()) {
      return { status: 'error', reason: 'No WhatsApp number on your profile.' }
    }
    if (!getMongoToken()) {
      return { status: 'error', reason: 'Sign in with your email and password to send WhatsApp messages.' }
    }
    try {
      await mongoAPI.syncActivitySession({ phone: user.phone }).catch(() => {})
      return await mongoAPI.triggerWeeklyReport()
    } catch (err) {
      return { status: 'error', reason: (err as Error).message }
    }
  }

  const markAllRead = () => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      save({ notifications: next })
      return next
    })
    if (mongoOnline && getMongoToken()) {
      mongoAPI.markNotificationsRead().catch(() => {})
    }
  }

  const signOut = () => {
    const s = load()
    if (s.user?.email) {
      saveUserSession(s.user.email, sessionFromStore(s))
    }
    localStorage.removeItem(STORAGE_KEY)
    setMongoToken(null)
    setUserState(null); setAssessState(null); setStudentId(null)
    setRecovState(DEFAULT_RECOVERY); setViewState('landing')
    setAppsState([]); setFailState([]); setDsaState([]); setProjState([])
    setActivityState([]); setSnapshotsState([]); setPlatformState(null); setKnowledgeState(createDefaultKnowledge())
    setNudgeDismissed(false); setNotifications([])
    setWhatsappPrefsState(DEFAULT_WHATSAPP_PREFS)
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Loading Vertex…</p>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{
      view, user, studentId, assessment, recovery, theme, backendOnline, mongoOnline, setMongoOnline: setMongoOnline, syncSessionNow: pushSessionToMongo, nudgeDismissed,
      applications, failures, dsaTopics, projects, activityLog, weeklySnapshots, platformData, knowledge,
      notifications, whatsappPrefs,
      setView, setUser, setAssessment, updateAssessment, setRecovery, toggleTheme, signOut, dismissNudge, resetAssessmentNudge,
      setApplications, addApplication, setFailures, setDsaTopics, setProjects, logActivity, recordExecution, recordVerifiedPlannerTask, syncTodayActivity, snapshotWeek,
      setPlatformData, setKnowledge, pushNotification, markAllRead, syncNotifications, setWhatsappPrefs, sendWhatsAppDigestNow, sendWhatsAppWeeklyNow,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
