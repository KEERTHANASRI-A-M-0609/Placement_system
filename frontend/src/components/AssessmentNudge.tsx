import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, Zap, BarChart2, ArrowRight, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { computeReadinessConfidence } from '../engine/assessmentEngine'

const benefits = [
  { icon: Activity,  text: '6 intelligent modules — complete anytime' },
  { icon: BarChart2, text: 'Evidence-based modules — complete anytime' },
  { icon: Zap,       text: 'Voice, coding and aptitude assessments' },
]

export default function AssessmentNudge() {
  const { assessment, platformData, nudgeDismissed, dismissNudge } = useApp()
  const navigate = useNavigate()
  const [minimized, setMinimized] = useState(false)

  const confidence = computeReadinessConfidence(assessment, platformData)
  if (confidence.measuredSections > 0 || nudgeDismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-50"
        style={{ maxWidth: minimized ? 'auto' : '340px', width: minimized ? 'auto' : '100%' }}>

        {minimized ? (
          <motion.button
            onClick={() => setMinimized(false)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg font-semibold text-sm text-white"
            style={{ background: 'var(--primary)' }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}>
            <div className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
            Career Health Center
            <ChevronDown size={15} className="rotate-180" />
          </motion.button>
        ) : (
          <div className="card-elevated rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)' }}>

            <div className="px-5 pt-5 pb-4" style={{ background: 'var(--accent)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                      Optional · No rush
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-white text-base leading-tight">
                    Build your readiness profile
                  </h3>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">
                    Start any assessment module — ranked by your gap analysis.
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <button onClick={() => setMinimized(true)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
                    style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={dismissNudge}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
                    style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="space-y-2.5">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--primary-l)' }}>
                      <b.icon size={13} style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 space-y-2.5">
              <button onClick={() => navigate('/health')}
                className="btn-primary w-full justify-center py-2.5 text-sm">
                Open Career Health Center <ArrowRight size={14} />
              </button>
              <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                No forced onboarding · Skip any module
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
