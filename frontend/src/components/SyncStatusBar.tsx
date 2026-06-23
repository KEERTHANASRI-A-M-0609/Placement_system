import { AlertTriangle, CloudOff, RefreshCw, Database } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { getBackendHealth, pingMongo } from '../services/mongoSync'
import { useEffect, useState } from 'react'

export default function SyncStatusBar() {
  const { mongoOnline, setMongoOnline, user, syncSessionNow } = useApp()
  const [retrying, setRetrying] = useState(false)
  const [apiUp, setApiUp] = useState(false)
  const [hint, setHint] = useState<string | undefined>()

  useEffect(() => {
    if (!user) return
    getBackendHealth().then(h => {
      setApiUp(h.api)
      setHint(h.hint)
      setMongoOnline(h.api && h.database)
    })
  }, [user, setMongoOnline])

  if (!user || mongoOnline) return null

  const retry = async () => {
    setRetrying(true)
    const h = await getBackendHealth()
    setApiUp(h.api)
    setHint(h.hint)
    const ok = await pingMongo()
    setMongoOnline(ok)
    if (ok) syncSessionNow()
    setRetrying(false)
  }

  return (
    <div
      className="shrink-0 px-4 py-2.5 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm border-b"
      style={{ background: 'var(--warning-soft)', borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      {apiUp ? <Database size={16} className="text-amber-600 shrink-0" /> : <AlertTriangle size={16} className="text-amber-600 shrink-0" />}
      <span>
        {apiUp ? (
          <>
            <strong>API running but sync unavailable.</strong> {hint || 'Sign out and sign in again to reconnect your account.'}
          </>
        ) : (
          <>
            <strong>Cloud sync is offline.</strong> Sign out and sign in again, or tap Retry.
          </>
        )}
      </span>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg font-semibold text-white"
        style={{ background: 'var(--accent)' }}
      >
        {retrying ? <RefreshCw size={12} className="animate-spin" /> : <CloudOff size={12} />}
        Retry
      </button>
    </div>
  )
}
