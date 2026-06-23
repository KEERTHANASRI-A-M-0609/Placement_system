import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Brain, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { AptitudeEvidence } from '../../../types'
import { useCameraProctor } from '../../../hooks/useCameraProctor'
import {
  buildAdaptiveSession, scoreAdaptiveAptitude,
  getAptitudeRecommendations, getAptitudeWeakAreas,
} from '../../../services/adaptiveAptitude'
import type { AptQuestion } from '../../../services/aptitudeQuestions'

interface Props {
  onComplete: (evidence: AptitudeEvidence) => void
  onClose: () => void
}

export default function AptitudeModule({ onComplete, onClose }: Props) {
  const [session] = useState(() => buildAdaptiveSession())
  const [started, setStarted] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [evidence, setEvidence] = useState<AptitudeEvidence | null>(null)
  const [cheat, setCheat] = useState(false)
  const proctor = useCameraProctor()

  const q: AptQuestion = session[currentQ]

  const start = async () => {
    proctor.resetProctor()
    proctor.startTabWatch()
    const ok = await proctor.startCamera()
    if (!ok) return
    setStarted(true)
  }

  const submit = () => {
    if (proctor.isCheatDetected(true)) {
      proctor.stopTabWatch()
      proctor.stopCamera()
      setCheat(true)
      setStarted(false)
      return
    }
    proctor.stopTabWatch()
    proctor.stopCamera()
    const ev = scoreAdaptiveAptitude(session, answers)
    setEvidence(ev)
    setSubmitted(true)
  }

  const reset = () => {
    proctor.resetProctor()
    setCheat(false)
    setStarted(false)
    setSubmitted(false)
    setAnswers({})
    setCurrentQ(0)
    setEvidence(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={18} style={{ color: '#6366f1' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Adaptive Aptitude Assessment</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)]"><X size={16} /></button>
      </div>

      {!started && !submitted && !cheat && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            15 adaptive questions across Quant, Logical Reasoning & Verbal. Difficulty adjusts based on your performance. Camera proctoring active.
          </p>
          <button onClick={start} className="btn-primary w-full py-3 text-sm">Start Adaptive Test</button>
        </div>
      )}

      {cheat && (
        <div className="text-center p-6 rounded-xl space-y-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertTriangle size={28} className="text-red-500 mx-auto" />
          <p className="font-semibold text-red-700">Attempt voided — retake required</p>
          <button onClick={reset} className="btn-primary w-full py-3 text-sm">Retake</button>
        </div>
      )}

      {started && !submitted && q && (
        <div className="space-y-8 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
              <span>Question {currentQ + 1} of {session.length}</span>
              <span>{Math.round(((currentQ + 1) / session.length) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${((currentQ + 1) / session.length) * 100}%` }}
                style={{ background: 'var(--accent)' }}
              />
            </div>
          </div>

          {/* Single question focus */}
          <div className="text-center space-y-6 py-6">
            <span className="badge badge-blue">{q.category}</span>
            <p className="text-xl font-display font-bold leading-snug max-w-lg mx-auto" style={{ color: 'var(--text)' }}>
              {q.question}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-3">
            {q.options.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setAnswers(a => ({ ...a, [q.id]: i }))}
                className="w-full text-left px-5 py-4 text-sm font-medium transition-all"
                style={{
                  borderRadius: 'var(--radius)',
                  border: answers[q.id] === i ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: answers[q.id] === i ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  color: 'var(--text)',
                  boxShadow: answers[q.id] === i ? 'var(--shadow-glow)' : 'var(--shadow-xs)',
                }}
              >
                {opt}
              </motion.button>
            ))}
          </div>

          <div className="flex justify-between max-w-md mx-auto pt-4">
            <button onClick={() => setCurrentQ(c => Math.max(0, c - 1))} disabled={currentQ === 0}
              className="btn-ghost disabled:opacity-30">← Previous</button>
            {currentQ < session.length - 1 ? (
              <button onClick={() => setCurrentQ(c => c + 1)} disabled={answers[q.id] === undefined}
                className="btn-accent disabled:opacity-40">Continue →</button>
            ) : (
              <button onClick={submit} disabled={Object.keys(answers).length < session.length}
                className="btn-accent disabled:opacity-40">Submit Assessment</button>
            )}
          </div>
        </div>
      )}

      {submitted && evidence && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center p-6 glass-card">
            <p className="text-4xl font-bold" style={{ color: '#6366f1' }}>{evidence.score}%</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{evidence.correct}/{evidence.totalQuestions} correct</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['quant', 'logical', 'verbal'] as const).map(cat => (
              <div key={cat} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{evidence.categoryScores[cat]}%</p>
                <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{cat}</p>
              </div>
            ))}
          </div>
          {getAptitudeWeakAreas(evidence).length > 0 && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--warning-l)', color: 'var(--warning)' }}>
              <strong>Weak areas:</strong> {getAptitudeWeakAreas(evidence).join(', ')}
            </div>
          )}
          <div className="space-y-1">
            {getAptitudeRecommendations(evidence).map((r, i) => (
              <p key={i} className="text-xs" style={{ color: 'var(--text-2)' }}>• {r}</p>
            ))}
          </div>
          <button onClick={() => onComplete(evidence)} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 size={14} /> Save & Update Readiness
          </button>
        </motion.div>
      )}
    </div>
  )
}
