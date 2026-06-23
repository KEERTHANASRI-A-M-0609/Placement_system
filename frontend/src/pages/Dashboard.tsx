import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mic, Brain, ChevronRight, AlertCircle, Target, TrendingUp, Zap, Activity,
  Code2, FileText, Briefcase, Calendar, BookOpen, Flame, BarChart2, ArrowRight,
  RefreshCcw, MessageSquare, LayoutGrid, Award, Shield, Sparkles,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  computeOverall, readinessLabel, computeGaps,
  computePlacementProbability, recommendResourcePlan,
  computeConsistency, computeMomentumTrend,
} from '../engine/intelligence'
import {
  computeReadinessConfidence,
  getTopPriority,
  getAssessmentModuleCards,
  ASSESSMENT_MODULES,
  type AssessmentModuleId,
} from '../engine/assessmentEngine'
import { backendAPI } from '../services/api'
import ReadinessRadar from '../components/design/ReadinessRadar'
import MomentumPanel from '../components/design/MomentumPanel'
import AnimatedNumber from '../components/motion/AnimatedNumber'
import LivePulse from '../components/motion/LivePulse'
import PlatformGuide from '../components/PlatformGuide'

type BackendData = {
  risk_level: string
  final_probability: number
  trend: string
}

const QUICK_MODULES = [
  { icon: Code2, label: 'DSA & Coding', path: '/health?module=dsa', color: '#D97706', bg: '#FEF3C7' },
  { icon: FileText, label: 'Resume', path: '/health?module=resume', color: '#1E56C0', bg: '#DBEAFE' },
  { icon: Mic, label: 'Communication', path: '/health?module=communication', color: '#7C3AED', bg: '#EDE9FE' },
  { icon: Brain, label: 'Aptitude', path: '/health?module=aptitude', color: '#0D9488', bg: '#CCFBF1' },
  { icon: Briefcase, label: 'Applications', path: '/applications', color: '#059669', bg: '#D1FAE5' },
  { icon: Target, label: 'Readiness', path: '/readiness', color: '#1E56C0', bg: '#DBEAFE' },
  { icon: Calendar, label: 'Daily Plan', path: '/planner', color: '#DC2626', bg: '#FEE2E2' },
  { icon: BookOpen, label: 'Resources', path: '/resources', color: '#0D9488', bg: '#CCFBF1' },
  { icon: Flame, label: 'Momentum', path: '/momentum', color: '#EA580C', bg: '#FFEDD5' },
  { icon: RefreshCcw, label: 'Failures', path: '/failures', color: '#B45309', bg: '#FFEDD5' },
  { icon: MessageSquare, label: 'Interview', path: '/health?module=interview', color: '#7C3AED', bg: '#EDE9FE' },
  { icon: Activity, label: 'Career Health', path: '/health', color: '#0891B2', bg: '#CFFAFE' },
]

function loadSkipped(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('cos_skipped_modules') || '{}') } catch { return {} }
}

const MODULE_ICONS: Partial<Record<AssessmentModuleId, typeof Mic>> = {
  communication: Mic,
  aptitude: Brain,
}

export default function Dashboard() {
  const { user, assessment, recovery, applications, activityLog, backendOnline, platformData } = useApp()
  const navigate = useNavigate()
  const [backendData, setBackendData] = useState<BackendData | null>(null)
  const [liveTime, setLiveTime] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const skippedModules = useMemo(() => loadSkipped(), [assessment])
  const confidence = computeReadinessConfidence(assessment, platformData ?? null)
  const hasEvidence = confidence.measuredSections > 0
  const score = assessment && hasEvidence ? computeOverall(assessment) : null
  const label = score !== null && score > 0 ? readinessLabel(score) : 'Complete assessments'
  const domain = user?.domain || 'Software Engineering'
  const gaps = assessment && hasEvidence ? computeGaps(assessment, domain) : []
  const weakest = gaps[0]

  const placementProb = (assessment && hasEvidence && score !== null)
    ? computePlacementProbability(assessment, applications)
    : null

  const resourcePlan = recommendResourcePlan({
    assessment: hasEvidence ? assessment : null,
    domain,
    level: user?.level ?? 'intermediate',
    weeklyHours: user?.weeklyHours,
    targetCompanies: user?.targetCompanies ?? [],
  })

  const topPriority = getTopPriority(user, assessment, platformData, skippedModules)
  const moduleCards = getAssessmentModuleCards(assessment, platformData, skippedModules)
  const pendingAssessments = moduleCards.filter(
    c => c.status === 'pending' && ['communication', 'aptitude'].includes(c.module.id),
  )
  const completedModules = moduleCards.filter(c => ['completed', 'connected'].includes(c.status)).length

  const { consistencyScore, streak } = computeConsistency(activityLog)
  const activityTrend = computeMomentumTrend(activityLog)

  useEffect(() => {
    if (!hasEvidence || !assessment || !backendOnline) return
    const momentum = Math.min(consistencyScore, 100)
    backendAPI.fullAnalysis({
      dsa: assessment.dsa,
      aptitude: assessment.aptitude,
      communication: assessment.communication,
      resume: assessment.resume,
      momentum,
    }).then(analysis => {
      setBackendData({
        risk_level: analysis.diagnosis.risk_level,
        final_probability: analysis.probability.final_probability,
        trend: analysis.momentum.trend,
      })
    }).catch(() => {})
  }, [assessment, backendOnline, hasEvidence, consistencyScore])

  const prob = backendData?.final_probability ?? placementProb?.probability ?? null
  const trend = backendOnline && backendData
    ? (backendData.trend as 'rising' | 'declining' | 'stable')
    : activityTrend

  const priorityTitle = topPriority?.title
    ?? (weakest ? `Improve ${weakest.label}` : 'Start Career Health assessment')

  const priorityReason = topPriority?.reason
    ?? (weakest
      ? `${weakest.label} is at ${weakest.current}% vs ${weakest.target}% target for ${domain}.`
      : 'Complete assessment modules to unlock your real readiness score.')

  const priorityTime = topPriority
    ? `${ASSESSMENT_MODULES.find(m => m.id === topPriority.moduleId)?.estimatedMinutes ?? 30} min`
    : '35 min'

  const radarScores = assessment ? {
    dsa: assessment.dsa,
    resume: assessment.resume,
    projects: assessment.projects,
    communication: assessment.communication,
    aptitude: assessment.aptitude,
    interview: assessment.interview ?? 0,
  } : { dsa: 0, resume: 0, projects: 0, communication: 0, aptitude: 0, interview: 0 }

  const openModule = (id: AssessmentModuleId) => navigate(`/health?module=${id}`)
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const pipelineCounts = useMemo(() => {
    const stages = ['Wishlist', 'Applied', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Selected'] as const
    return stages.map(s => ({
      stage: s,
      count: applications.filter(a => a.status === s).length,
    }))
  }, [applications])

  const dealCards = useMemo(() => {
    const cards: { title: string; sub: string; badge: string; badgeClass: string; path: string; gradient: string }[] = []
    const soon = applications.find(a => {
      if (!a.deadline || ['Rejected', 'Selected'].includes(a.status)) return false
      const d = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
      return d >= 0 && d <= 5
    })
    if (soon) {
      const d = Math.ceil((new Date(soon.deadline!).getTime() - Date.now()) / 86400000)
      cards.push({
        title: `${soon.company} deadline`,
        sub: `${d}d left · ${soon.role}`,
        badge: 'Urgent',
        badgeClass: 'deal-badge-hot',
        path: '/applications',
        gradient: 'linear-gradient(135deg, #DC2626 0%, #B45309 100%)',
      })
    }
    cards.push({
      title: "Today's AI plan",
      sub: `${domain} · role & company tasks`,
      badge: 'Daily',
      badgeClass: 'deal-badge-new',
      path: '/planner',
      gradient: 'linear-gradient(135deg, #1E56C0 0%, #0D9488 100%)',
    })
    if (weakest) {
      cards.push({
        title: `Fix ${weakest.label} gap`,
        sub: `+${Math.min(weakest.gap, 10)} pts potential · ${weakest.current}% → ${weakest.target}%`,
        badge: 'Top gap',
        badgeClass: 'deal-badge-sale',
        path: '/readiness',
        gradient: 'linear-gradient(135deg, #7C3AED 0%, #1E56C0 100%)',
      })
    } else {
      cards.push({
        title: 'Complete Career Health',
        sub: 'Unlock evidence-based readiness',
        badge: 'Start',
        badgeClass: 'deal-badge-sale',
        path: '/health',
        gradient: 'linear-gradient(135deg, #7C3AED 0%, #1E56C0 100%)',
      })
    }
    return cards.slice(0, 3)
  }, [applications, domain, weakest])

  return (
    <div className="page-container py-6 sm:py-8 space-y-6 sm:space-y-8 max-w-[1200px]" style={{ background: 'var(--landing-bg, #F4F7FB)' }}>
      {/* Announcement ticker — Flipkart-style */}
      <div className="overflow-hidden rounded-lg bg-slate-900 text-white text-xs font-semibold py-2 px-4 flex items-center gap-2">
        <Sparkles size={14} className="text-amber-400 shrink-0" />
        <p className="truncate">
          {prob != null ? `Placement odds ${prob}%` : 'Complete assessment for live odds'}
          {' · '}{streak > 0 ? `${streak}-day streak` : 'Start your streak today'}
          {' · '}{activePipelineCount(applications)} active applications
          {user?.targetCompanies?.length ? ` · Targeting ${user.targetCompanies.slice(0, 2).join(', ')}` : ''}
        </p>
      </div>

      <PlatformGuide />

      {/* Hero welcome */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="dash-hero"
      >
        <div className="dash-hero-inner flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
              <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                Command Center · {liveTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Good {getGreeting()}, {firstName}
            </h1>
            <p className="text-white/85 text-sm sm:text-base max-w-xl">
              {domain} · {label}
              {user?.targetCompanies?.length ? ` · Targeting ${user.targetCompanies.slice(0, 2).join(', ')}` : ''}
            </p>
            <p className="text-xs text-white/60 mt-2">
              Evidence: {completedModules}/{moduleCards.length} modules · Confidence {confidence.confidencePct}%
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/planner')} className="btn-commerce text-sm font-bold">
              Today&apos;s Plan <ArrowRight size={16} />
            </button>
            <button type="button" onClick={() => navigate('/workspace')} className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-colors">
              Workspace
            </button>
          </div>
        </div>
      </motion.section>

      {/* Deal cards — Amazon/Flipkart promo row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {dealCards.map((deal, i) => (
          <motion.button
            key={deal.title}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => navigate(deal.path)}
            className="relative text-left p-5 rounded-xl text-white overflow-hidden min-h-[120px] flex flex-col justify-end group hover:scale-[1.02] transition-transform shadow-lg"
            style={{ background: deal.gradient }}
          >
            <span className={`deal-badge absolute top-3 left-3 ${deal.badgeClass}`}>{deal.badge}</span>
            <ArrowRight size={18} className="absolute top-3 right-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            <p className="font-bold text-lg leading-tight pr-6">{deal.title}</p>
            <p className="text-sm text-white/85 mt-1">{deal.sub}</p>
          </motion.button>
        ))}
      </div>

      {/* Pipeline snapshot */}
      {applications.length > 0 && (
        <section className="dash-section">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Pipeline</p>
              <h2 className="text-lg font-bold text-slate-900">Application tracker</h2>
            </div>
            <button type="button" onClick={() => navigate('/applications')} className="text-sm font-semibold text-blue-600">
              Open kanban →
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {pipelineCounts.map(({ stage, count }) => (
              <button
                key={stage}
                type="button"
                onClick={() => navigate('/applications')}
                className="shrink-0 min-w-[100px] p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all text-center"
              >
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 leading-tight">{stage}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Trust strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Shield, title: 'Evidence-based', sub: `${confidence.confidencePct}% confidence` },
          { icon: Award, title: 'Placement odds', sub: prob != null ? `${prob}% live` : 'Assess to unlock' },
          { icon: LayoutGrid, title: 'Full workspace', sub: 'All tools in one hub' },
          { icon: Flame, title: 'Momentum', sub: `${streak}d streak · ${trend}` },
        ].map(t => (
          <div key={t.title} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <t.icon size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{t.title}</p>
              <p className="text-[10px] text-slate-500">{t.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard icon={Target} label="Readiness" value={score} suffix="%" sub={hasEvidence ? label : 'Needs assessment'} color="#1E56C0" bg="#DBEAFE" />
        <MetricCard icon={TrendingUp} label="Placement Odds" value={prob} suffix="%" sub={placementProb?.topBlocker ? `Fix ${placementProb.topBlocker}` : 'From profile'} color="#059669" bg="#D1FAE5" />
        <MetricCard icon={Flame} label="Momentum" value={consistencyScore} suffix="%" sub={
          <span className="flex items-center gap-1 capitalize">
            <LivePulse label="" color={trend === 'rising' ? '#059669' : trend === 'declining' ? '#DC2626' : '#94A3B8'} />
            {trend} · {streak}d streak
          </span>
        } color="#EA580C" bg="#FFEDD5" />
        <MetricCard icon={BarChart2} label="Gap Remaining" value={hasEvidence ? resourcePlan.summary.totalGapPoints : null} suffix=" pts" sub={hasEvidence ? `~${resourcePlan.summary.estimatedWeeks} weeks` : 'Assess first'} color="#7C3AED" bg="#EDE9FE" />
      </div>

      {/* Today's priority */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="dash-section relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #1E56C0 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-4"
            style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <Zap size={12} /> Today&apos;s Priority
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 max-w-2xl">{priorityTitle}</h2>
          <p className="text-sm text-slate-600 mb-5 max-w-xl">{priorityReason}</p>
          <div className="flex flex-wrap items-center gap-6 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Impact</p>
              <p className="text-lg font-bold text-emerald-600">
                {topPriority ? `+${topPriority.potentialImpact}` : weakest ? `+${Math.min(weakest.gap, 8)}` : '+5'} readiness
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time</p>
              <p className="text-lg font-bold text-slate-800">{priorityTime}</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate(topPriority ? `/health?module=${topPriority.moduleId}` : '/health')}
            className="btn-landing-primary inline-flex items-center gap-2 px-6 py-3 text-sm">
            Start Now <ArrowRight size={16} />
          </button>
        </div>
      </motion.section>

      {/* Quick modules */}
      <section className="dash-section">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1">Placement Modules</p>
            <h2 className="text-lg font-bold text-slate-900">Quick Access</h2>
          </div>
          <button type="button" onClick={() => navigate('/health')} className="text-sm font-semibold text-blue-600">
            All modules →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          {QUICK_MODULES.map((mod, i) => {
            const Icon = mod.icon
            return (
              <motion.button
                key={mod.label}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(mod.path)}
                className="dash-module"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: mod.bg }}>
                  <Icon size={20} style={{ color: mod.color }} />
                </div>
                <span className="text-xs font-bold text-slate-700 leading-tight">{mod.label}</span>
              </motion.button>
            )
          })}
        </div>
      </section>

      {pendingAssessments.length > 0 && (
        <section className="dash-section">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-amber-500" />
            <h2 className="font-bold text-slate-900">Pending Assessments</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingAssessments.map(({ module, statusLabel }) => {
              const Icon = MODULE_ICONS[module.id] ?? Mic
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => openModule(module.id)}
                  className="flex items-center gap-4 p-4 rounded-xl text-left border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all bg-slate-50/50"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#DBEAFE' }}>
                    <Icon size={22} style={{ color: '#1E56C0' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800">{module.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{statusLabel} · {module.estimatedMinutes} min</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {hasEvidence ? (
          <div className="dash-section">
            <ReadinessRadar scores={radarScores} onSkillClick={() => navigate('/readiness')} />
          </div>
        ) : (
          <EmptyPanel title="Readiness Map" message="Complete Career Health modules to unlock your skill radar." cta="Start Assessment" onCta={() => navigate('/health')} />
        )}
        <div className="dash-section">
          <MomentumPanel activityLog={activityLog} trend={trend} recoveryActive={recovery.inactive} />
          <button type="button" onClick={() => navigate('/momentum')} className="mt-3 text-sm font-semibold text-blue-600">
            View Momentum Center →
          </button>
        </div>
      </div>

      {confidence.missingEvidence.length > 0 && (
        <div className="p-4 rounded-xl text-sm border border-amber-200 bg-amber-50">
          <p className="font-bold text-slate-800 mb-1">Missing evidence</p>
          <p className="text-slate-600">
            {confidence.missingEvidence.join(' · ')} — complete in{' '}
            <button type="button" className="font-semibold text-blue-600 underline" onClick={() => navigate('/health')}>Career Health</button>.
          </p>
        </div>
      )}

      {hasEvidence && resourcePlan.topPicks.length > 0 && (
        <section className="dash-section space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1">Learning Intelligence</p>
              <h2 className="text-lg font-bold text-slate-900">Resources for your targets</h2>
              {user?.targetCompanies?.length ? (
                <p className="text-xs text-slate-500 mt-1">
                  Ranked for {user.targetCompanies.slice(0, 3).join(', ')}
                </p>
              ) : null}
            </div>
            <button type="button" onClick={() => navigate('/resources')} className="text-sm font-semibold text-blue-600 shrink-0">
              Open workspace →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {resourcePlan.topPicks.slice(0, 6).map((r, i) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all group bg-white"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#1E56C0' }}>
                    {r.company ? `${r.company}` : r.provider ?? r.tag}
                  </span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <p className="font-bold text-sm text-slate-800 group-hover:text-blue-600 leading-snug">{r.title}</p>
                {r.why && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{r.why}</p>}
                <div className="flex gap-2 mt-3 text-[10px] font-semibold text-slate-400">
                  <span>{r.impact ?? 'Medium'} impact</span>
                  <span>·</span>
                  <span>{r.effort ?? '30 min'}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function activePipelineCount(apps: { status: string }[]) {
  return apps.filter(a => !['Rejected', 'Selected'].includes(a.status)).length
}

function MetricCard({ icon: Icon, label, value, suffix, sub, color, bg }: {
  icon: typeof Target
  label: string
  value?: number | null
  suffix?: string
  sub?: ReactNode
  color: string
  bg: string
}) {
  return (
    <div className="dash-metric">
      <div className="dash-metric-icon" style={{ background: bg }}>
        <Icon size={20} style={{ color }} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-slate-900">
        {value != null ? <AnimatedNumber value={value} suffix={suffix} /> : '—'}
      </p>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  )
}

function EmptyPanel({ title, message, cta, onCta }: {
  title: string; message: string; cta: string; onCta: () => void
}) {
  return (
    <div className="dash-section flex flex-col items-center justify-center text-center min-h-[320px]">
      <p className="text-xl font-bold text-slate-800 mb-2">{title}</p>
      <p className="text-sm text-slate-500 max-w-xs mb-6">{message}</p>
      <button type="button" onClick={onCta} className="btn-landing-primary px-6 py-2.5 text-sm">{cta}</button>
    </div>
  )
}
