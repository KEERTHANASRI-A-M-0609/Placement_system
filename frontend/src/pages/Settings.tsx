import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import { Sun, Moon, Bell, User, Palette, MessageCircle, Send, Loader2, Mail } from 'lucide-react'
import { mongoAPI, getMongoToken } from '../services/mongoAPI'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} type="button"
      className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-[var(--accent)]' : 'bg-stone-200 dark:bg-slate-600'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}

export default function Settings() {
  const { user, theme, toggleTheme, setView, whatsappPrefs, setWhatsappPrefs, sendWhatsAppDigestNow, sendWhatsAppWeeklyNow, backendOnline } = useApp()
  const [sending, setSending] = useState<'digest' | 'weekly' | 'email' | 'inactive' | null>(null)
  const [waStatus, setWaStatus] = useState('')
  const [emailStatus, setEmailStatus] = useState('')
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)

  useEffect(() => {
    if (!getMongoToken()) return
    mongoAPI.getNotificationStatus()
      .then(s => {
        setEmailConfigured(s.emailConfigured)
        setWhatsappConfigured(s.whatsappConfigured)
      })
      .catch(() => {})
  }, [])

  const formatWaResult = (res: { status: string; hint?: string; reason?: string; to?: string; twilio_status?: string } | null) => {
    if (!res) return 'No response from server.'
    if (res.status === 'sent' || res.status === 'queued') {
      return `Sent to ${res.to ?? 'your number'}${res.twilio_status ? ` (${res.twilio_status})` : ''}. ${res.hint ?? 'Check WhatsApp in 1–2 min. If nothing arrives, join the Twilio sandbox (see note above).'}`
    }
    if (res.status === 'skipped') return res.reason ?? 'Twilio not configured on backend.'
    return `${res.reason ?? 'Failed'}${res.hint ? ` — ${res.hint}` : ''}`
  }

  const testDigest = async () => {
    setSending('digest')
    setWaStatus('')
    const res = await sendWhatsAppDigestNow()
    setWaStatus(formatWaResult(res))
    setSending(null)
  }

  const testWeekly = async () => {
    setSending('weekly')
    setWaStatus('')
    const res = await sendWhatsAppWeeklyNow()
    setWaStatus(formatWaResult(res))
    setSending(null)
  }

  const testEmail = async () => {
    setSending('email')
    setEmailStatus('')
    try {
      const res = await mongoAPI.sendTestEmail({
        title: 'Vertex test notification',
        message: 'Your email notifications are working. You will receive alerts for assessments, deadlines, and weekly reports.',
      })
      setEmailStatus(res.sent
        ? (res.mode === 'smtp' ? 'Test email sent — check your inbox.' : 'Email logged on server (configure SMTP in backend .env for live delivery).')
        : 'Email delivery failed — check SMTP settings.')
    } catch (err) {
      setEmailStatus((err as Error).message)
    }
    setSending(null)
  }

  const testInactiveEmail = async () => {
    setSending('inactive')
    setEmailStatus('')
    try {
      const res = await mongoAPI.sendTestInactiveEmail()
      setEmailStatus(res.sent
        ? (res.mode === 'smtp' ? 'Inactive reminder sample sent — check your inbox.' : 'Logged on server (configure SMTP for live email).')
        : 'Delivery failed — check SMTP settings.')
    } catch (err) {
      setEmailStatus((err as Error).message)
    }
    setSending(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-label">Profile</p>
        <h1 className="text-display font-display">Settings</h1>
        <p className="text-base" style={{ color: 'var(--text-2)' }}>Manage your Vertex preferences</p>
      </header>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <User size={15} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Profile</h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Phone (WhatsApp)', value: user?.phone },
            { label: 'College', value: user?.college },
            { label: 'Domain', value: user?.domain },
            { label: 'Goal', value: user?.goal },
            { label: 'Skill Level', value: user?.level },
            { label: 'Weekly Hours', value: user?.weeklyHours },
            { label: 'Target Companies', value: user?.targetCompanies?.join(', ') },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>{item.label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.value || '—'}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4">
          <button onClick={() => setView('onboarding')}
            className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: 'var(--accent)' }}>
            Edit Profile →
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Mail size={15} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Email notifications</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Receive assessment results, deadline alerts, and <strong>3-day inactive reminders</strong> when you lose track (even if you don&apos;t open the app).
          </p>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Inactive reminders (email)</p>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>Email after 3, 7, and 14 days without verified planner tasks</p>
            </div>
            <Toggle
              on={whatsappPrefs.inactiveReminders}
              onToggle={() => setWhatsappPrefs({ inactiveReminders: !whatsappPrefs.inactiveReminders })}
            />
          </div>
          {!user?.email && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              Add an email at sign-up to enable email notifications.
            </p>
          )}
          {!emailConfigured && getMongoToken() && (
            <p className="text-xs p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
              <strong>Email not live yet.</strong> Uncomment and set SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env, then restart <code>npm run dev</code> in the backend folder.
            </p>
          )}
          {!getMongoToken() && (
            <p className="text-xs p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
              <strong>Server sign-in required.</strong> Log out and sign in with your email/password to enable email and WhatsApp delivery.
            </p>
          )}
          <button onClick={testEmail} disabled={!user?.email || sending !== null || !getMongoToken()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--accent)' }}>
            {sending === 'email' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send test email
          </button>
          <button onClick={testInactiveEmail} disabled={!user?.email || sending !== null || !getMongoToken()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            {sending === 'inactive' ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            Test 3-day reminder email
          </button>
          {emailStatus && <p className="text-xs" style={{ color: 'var(--text-2)' }}>{emailStatus}</p>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <MessageCircle size={15} style={{ color: '#128C7E' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>WhatsApp via Twilio</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Get your readiness status, weakness-based resource picks, and daily focus on WhatsApp.
            Reply <strong>STATUS</strong>, <strong>RESOURCES</strong>, or <strong>PLAN</strong> anytime.
          </p>
          {!backendOnline && (
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Optional Python API (port 8000) is offline. WhatsApp now sends via the Node backend (port 5000) — ensure <code>npm run dev</code> is running in the backend folder.
            </p>
          )}
          {!user?.phone && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              Add your phone at sign-up (with country code +91…) to enable WhatsApp updates.
            </p>
          )}
          {!whatsappConfigured && getMongoToken() && (
            <p className="text-xs p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
              <strong>WhatsApp not configured on server.</strong> Set TWILIO_SID and TWILIO_TOKEN in backend/.env, then restart the backend.
            </p>
          )}
          {whatsappConfigured && getMongoToken() && (
            <p className="text-xs p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">
              Twilio is configured. If messages don&apos;t arrive, join the sandbox: send your Twilio join code to <strong>+1 415 523 8886</strong> on WhatsApp.
            </p>
          )}
          {[
            { key: 'enabled' as const, label: 'WhatsApp notifications', desc: 'Master switch for all WhatsApp messages' },
            { key: 'dailyDigest' as const, label: 'Daily digest', desc: 'Morning summary: scores, gaps, resource picks, deadlines' },
            { key: 'weeklyReport' as const, label: 'Weekly report (Sundays)', desc: 'End-of-week progress, pipeline, weakness resources' },
            { key: 'applicationAlerts' as const, label: 'New application alerts', desc: 'WhatsApp when you add a company + deadline to tracker' },
            { key: 'urgentAlerts' as const, label: 'Urgent alerts', desc: 'Deadline and streak warnings between digests' },
            { key: 'inactiveReminders' as const, label: 'Inactive reminders (WhatsApp)', desc: 'Message after 3, 7, and 14 days without verified tasks' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{n.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{n.desc}</p>
              </div>
              <Toggle on={whatsappPrefs[n.key]} onToggle={() => setWhatsappPrefs({ [n.key]: !whatsappPrefs[n.key] })} />
            </div>
          ))}
          <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: 'var(--bg-muted)', color: 'var(--text-2)' }}>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>WhatsApp commands (reply to Vertex bot):</p>
            <p>STATUS — scores and biggest gap</p>
            <p>RESOURCES — picks for your weaknesses + role interest</p>
            <p>PLAN — today&apos;s priority action</p>
            <p>WEEKLY — full weekly progress report</p>
            <p>HELP — command menu</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={testDigest} disabled={!user?.phone || sending !== null || !whatsappPrefs.enabled || !getMongoToken()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#128C7E' }}>
              {sending === 'digest' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Test daily digest
            </button>
            <button onClick={testWeekly} disabled={!user?.phone || sending !== null || !whatsappPrefs.enabled || !getMongoToken()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--accent)' }}>
              {sending === 'weekly' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Test weekly report
            </button>
          </div>
          {waStatus && <p className="text-xs" style={{ color: 'var(--text-2)' }}>{waStatus}</p>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Palette size={15} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Appearance</h2>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Theme</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Currently {theme} mode</p>
          </div>
          <button onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {theme === 'dark' ? <><Sun size={14} /> Light Mode</> : <><Moon size={14} /> Dark Mode</>}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Bell size={15} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>In-app notifications</h2>
        </div>
        {[
          { label: 'Daily Focus Reminders', desc: 'Nudge for daily tasks', on: true },
          { label: 'Weekly Report', desc: 'Auto-generated every Sunday', on: true },
          { label: 'Application Deadlines', desc: '48h before deadline', on: true },
          { label: 'Inactivity Alerts', desc: 'When streak is at risk', on: true },
        ].map((n, i) => (
          <div key={n.label} className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: i < 3 ? '1px solid var(--border)' : undefined }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{n.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>{n.desc}</p>
            </div>
            <Toggle on={n.on} onToggle={() => {}} />
          </div>
        ))}
      </div>

      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Readiness Assessment</p>
        <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
          Retake the assessment if your skills have improved significantly.
        </p>
        <button onClick={() => setView('assessment')}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
          style={{ background: 'var(--accent)' }}>
          Retake Assessment
        </button>
      </div>
    </div>
  )
}
