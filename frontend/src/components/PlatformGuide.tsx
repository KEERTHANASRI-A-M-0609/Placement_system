import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, ChevronDown, ChevronRight, CheckCircle2, Circle,
  LogIn, Target, Activity, Briefcase, CalendarDays, Settings, Cloud,
} from 'lucide-react'
import { useApp } from '../store/AppContext'

const STEPS = [
  {
    id: 'account',
    icon: LogIn,
    title: 'Create account & sign in',
    detail: 'Register with email + password. Your profile and progress save to your account when signed in.',
    path: null,
    done: (u: boolean) => u,
  },
  {
    id: 'onboard',
    icon: Target,
    title: 'Complete onboarding',
    detail: 'Pick your domain (SWE, Cyber, etc.), target role, and companies. Vertex filters incompatible companies automatically.',
    path: null,
    done: (_u: boolean, domain?: string) => Boolean(domain?.trim()),
  },
  {
    id: 'assess',
    icon: Activity,
    title: 'Run Career Health assessments',
    detail: 'Resume, LeetCode, GitHub, aptitude, communication, mock interview — each module updates your real readiness score.',
    path: '/health',
    done: (_u: boolean, _d?: string, assessed?: boolean) => assessed ?? false,
  },
  {
    id: 'pipeline',
    icon: Briefcase,
    title: 'Track applications',
    detail: 'Add companies you apply to. Status, deadlines, and alerts sync to MongoDB.',
    path: '/applications',
    done: (_u: boolean, _d?: string, _a?: boolean, apps?: number) => (apps ?? 0) > 0,
  },
  {
    id: 'planner',
    icon: CalendarDays,
    title: 'Follow your daily plan',
    detail: 'Open Daily Planner for role-aware tasks based on your gaps and target companies.',
    path: '/planner',
    done: (_u: boolean, _d?: string, _a?: boolean, _apps?: number, tasks?: number) => (tasks ?? 0) > 0,
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Enable notifications (optional)',
    detail: 'Add phone in Settings for WhatsApp digests. Test email/WhatsApp from the same page.',
    path: '/settings',
    done: (_u: boolean, _d?: string, _a?: boolean, _apps?: number, _tasks?: number, phone?: string) => Boolean(phone?.trim()),
  },
]

export default function PlatformGuide() {
  const { user, assessment, applications, activityLog, mongoOnline } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const assessed = Boolean(assessment && (assessment.dsa + assessment.resume + assessment.communication) > 0)
  const tasksDone = activityLog.reduce((s, d) => s + d.tasksCompleted, 0)

  const completed = STEPS.filter(s =>
    s.done(!!user, user?.domain, assessed, applications.length, tasksDone, user?.phone)
  ).length

  if (!user) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
            <BookOpen size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>How to use Vertex</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>
              {completed}/{STEPS.length} steps done · App at localhost:5173 · API at localhost:5000
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1"
            style={{
              background: mongoOnline ? 'var(--success-soft)' : 'var(--warning-soft)',
              color: mongoOnline ? 'var(--success)' : 'var(--warning)',
            }}
          >
            <Cloud size={10} />
            {mongoOnline ? 'Cloud sync on' : 'Cloud sync off'}
          </span>
          {open ? <ChevronDown size={18} style={{ color: 'var(--text-3)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-3)' }} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <ol className="p-4 sm:p-5 space-y-3">
              {STEPS.map((step, i) => {
                const done = step.done(!!user, user?.domain, assessed, applications.length, tasksDone, user?.phone)
                const Icon = step.icon
                return (
                  <li key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      {done
                        ? <CheckCircle2 size={18} className="text-emerald-500" />
                        : <Circle size={18} style={{ color: 'var(--text-3)' }} />}
                      {i < STEPS.length - 1 && (
                        <div className="w-px flex-1 min-h-[12px] my-1" style={{ background: 'var(--border)' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                          <Icon size={14} style={{ color: 'var(--accent)' }} />
                          {step.title}
                        </p>
                        {step.path && (
                          <button
                            type="button"
                            onClick={() => navigate(step.path!)}
                            className="text-xs font-semibold shrink-0"
                            style={{ color: 'var(--accent)' }}
                          >
                            Open →
                          </button>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-2)' }}>{step.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
            {!mongoOnline && (
              <div className="mx-4 mb-4 p-3 rounded-xl text-xs space-y-1" style={{ background: 'var(--warning-soft)', color: 'var(--text-2)' }}>
                <p><strong>Cloud sync is off.</strong> Sign out and sign in again. If it persists, check your connection or visit Settings.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
