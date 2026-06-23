const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
}

export const pingBackend = () => req<{ status: string }>('GET', '/health')

export const backendAPI = {
  fullAnalysis: (data: { dsa: number; aptitude: number; communication: number; resume: number; momentum: number }) =>
    req<{
      diagnosis: { patterns: string[]; risk_level: string }
      probability: { base_probability: number; final_probability: number; signal_quality: string }
      recommendation: { roadmap: string[] }
      momentum: { momentum_score: number; trend: string }
    }>('POST', '/full-analysis', data),

  diagnose: (data: { dsa: number; aptitude: number; communication: number; resume: number; momentum: number }) =>
    req<{ patterns: string[]; risk_level: string }>('POST', '/diagnose', data),

  failureIntelligence: (reasons: string[]) =>
    req<{ failure_breakdown: Record<string, number>; largest_issue: string; recovery_plan: string[] }>('POST', '/failure-intelligence', { reasons }),

  weeklyReview: (readiness: number, momentum: number, completed_tasks: number) =>
    req<{ summary: string; next_steps: string[] }>('POST', '/weekly-review', { readiness, momentum, completed_tasks }),

  opportunityRadar: (probability: number) =>
    req<{ safe: string[]; target: string[]; stretch: string[] }>('POST', '/opportunity-radar', { probability }),

  upsertStudent: (name: string, email: string, target_role: string) =>
    req<{ id: number; message: string }>('POST', '/upsert-student', { name, email, target_role }),

  saveAssessment: (student_id: number, dsa: number, aptitude: number, communication: number, resume: number) =>
    req<{ assessment_id: number; message: string }>('POST', '/assessment', { student_id, dsa, aptitude, communication, resume }),

  saveAssessmentModule: (student_id: number, module: string, data: Record<string, unknown>) =>
    req<{ status: string; module: string }>('POST', '/assessment/module', { student_id, module, data: data as Record<string, unknown> }),

  saveMockInterview: (student_id: number, session: Record<string, unknown>) =>
    req<{ status: string; id: number }>('POST', '/assessment/mock-interview', { student_id, ...session }),

  getAssessmentPriority: (student_id: number) =>
    req<{ priority: string; reason: string; impact: number }>('GET', `/assessment/priority/${student_id}`),

  saveInterview: (student_id: number, company: string, round: string, result: string, failure_reason: string) =>
    req<{ id: number; message: string }>('POST', '/interview', { student_id, company, round, result, failure_reason }),

  notifyWhatsApp: (phone: string, message: string) =>
    req<{ status: string; reason?: string; sid?: string; to?: string }>('POST', '/notify/whatsapp', { phone, message }),

  whatsappSync: (payload: Record<string, unknown>) =>
    req<{ status: string; phone?: string; reason?: string }>('POST', '/whatsapp/sync', payload),

  whatsappDigest: (payload: Record<string, unknown>) =>
    req<{ status: string; sid?: string; reason?: string; to?: string; hint?: string; twilio_status?: string }>('POST', '/whatsapp/digest', payload),

  whatsappWeeklyReport: (payload: Record<string, unknown>) =>
    req<{ status: string; sid?: string; reason?: string; to?: string; hint?: string; twilio_status?: string }>('POST', '/whatsapp/weekly-report', payload),

  whatsappApplicationAlert: (payload: Record<string, unknown>) =>
    req<{ status: string; sid?: string; reason?: string; to?: string }>('POST', '/whatsapp/application-alert', payload),

  whatsappCommands: () =>
    req<{ commands: { cmd: string; desc: string }[]; webhook_path: string; note: string }>('GET', '/whatsapp/commands'),

  dashboard: (student_id: number) =>
    req<{
      student_id: number; name: string; target_role: string;
      placement_probability: number; weakness: string;
      daily_plan: string[]; opportunities: { safe: string[]; target: string[]; stretch: string[] }
    }>('GET', `/student-dashboard/${student_id}`),

  generateDailyPlan: (data: {
    student_id?: number
    email?: string
    date?: string
    mode?: 'daily' | 'weekly'
    target_role?: string
    domain?: string
    target_companies?: string[]
    dsa?: number
    resume?: number
    projects?: number
    communication?: number
    aptitude?: number
    interview?: number
    weekly_hours?: string
    completed_yesterday?: string[]
    applications?: { company: string; role: string; status: string; deadline?: string }[]
    activity_log?: { date: string; tasksCompleted: number; hoursSpent: number; executions?: number }[]
  }) => req<{
    date?: string
    tasks?: { text: string; category: string; priority: string; estimatedMins: number; resourceUrl?: string; why?: string; impact?: string }[]
    days?: Record<string, { text: string; category: string; priority: string; estimatedMins: number; resourceUrl?: string }[]>
  }>('POST', '/planner/generate', data),
}
