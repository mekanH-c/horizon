import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Loader2, LogOut, Mail } from 'lucide-react'
import { getClient, onAuthChange, sendMagicLink, signOut } from '../lib/sync'
import { hasSupabase } from '../lib/sync'
import type { SyncState } from '../lib/sync'

/**
 * Magic-link sign-in. No passwords: the user types an email, Supabase emails a
 * one-time link, and the session is persisted by the client. Progress is pulled
 * and merged into the local record as soon as a session appears.
 */
export function AuthBar({ sync, onSignedIn }: { sync: SyncState; onSignedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // React to session changes (magic link click, sign-out elsewhere).
  useEffect(() => {
    if (!hasSupabase) return
    return onAuthChange((session) => {
      if (session) onSignedIn()
      else
        setSent(false)
    })
  }, [onSignedIn])

  if (!hasSupabase) {
    return (
      <span
        className="flex items-center gap-1.5 text-[11px] font-bold text-[#111111]/60"
        title="Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable cross-device sync"
      >
        <CloudOff size={13} />
        local only
      </span>
    )
  }

  if (sync.userEmail) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#111111]" title={sync.userEmail ?? ''}>
          {sync.status === 'syncing' ? (
            <Loader2 size={13} className="animate-spin text-[#111111]" />
          ) : sync.status === 'error' ? (
            <CloudOff size={13} className="text-[#FF6B9E]" />
          ) : (
            <Cloud size={13} className="text-[#00C48C]" />
          )}
          {sync.status === 'syncing'
            ? 'syncing…'
            : sync.status === 'error'
              ? 'sync failed'
              : 'synced'}
        </span>
        <button
          onClick={() => void signOut(getClient()!)}
          className="flex items-center gap-1 rounded border-2 border-[#111111] bg-[#FF6B9E] px-2 py-0.5 text-[10px] font-black uppercase text-[#111111] shadow-[1px_1px_0px_#111111] transition active:translate-x-[1px] active:translate-y-[1px]"
        >
          <LogOut size={12} />
          sign out
        </button>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const client = getClient()
    if (!client || !email.trim()) return
    setBusy(true)
    setError(null)
    const res = await sendMagicLink(client, email.trim())
    setBusy(false)
    if (res.ok) setSent(true)
    else setError(res.error)
  }

  if (sent) {
    return (
      <span className="flex items-center gap-1.5 rounded border-2 border-[#111111] bg-[#00C48C] px-2 py-1 text-[11px] font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111]">
        <Mail size={13} />
        check your inbox
      </span>
    )
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="sync across devices"
        className="w-40 rounded-md border-2 border-[#111111] bg-white px-2 py-1 text-[11px] font-bold text-[#111111] placeholder:text-[#111111]/50 shadow-[2px_2px_0px_#111111] focus:bg-[#FFFDE6] focus:outline-none"
        aria-label="Email for cross-device sync"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md border-2 border-[#111111] bg-[#00C48C] px-2.5 py-1 text-[11px] font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111] transition active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40"
      >
        {busy ? '…' : 'sign in'}
      </button>
      {error && (
        <span className="max-w-[160px] truncate text-[11px] font-bold text-[#FF6B9E]" title={error}>
          {error}
        </span>
      )}
    </form>
  )
}