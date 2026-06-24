import { useState } from 'react'
import { ShieldCheck, ShieldAlert, Fingerprint } from 'lucide-react'
import { useApp } from '../../store/AppContext'

interface Props {
  partnerId: string
  partnerName: string
}

// TOFU key-verification surface for a 1:1 DM (#13). Shows the partner's key
// fingerprint so it can be compared out of band, and escalates to a prominent
// warning with an accept action when the key changed since it was first pinned
// (possible substitution by a compromised ProfileService).
export default function KeyVerificationNotice({ partnerId, partnerName }: Props) {
  const { getKeyStatus, acceptKeyChange } = useApp()
  const [accepting, setAccepting] = useState(false)
  const status = getKeyStatus(partnerId)

  // No resolved key yet (still loading or recipient has no E2E key) → show nothing.
  if (!status) return null

  if (status.trust === 'mismatch') {
    return (
      <div className="mx-4 mt-3 px-3 py-2.5 rounded-lg bg-discord-red/10 border border-discord-red/30 text-discord-red text-xs flex items-start gap-2.5">
        <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Der Schlüssel von {partnerName} hat sich geändert.</p>
          <p className="opacity-90 mt-0.5">
            Möglicherweise eine Key-Substitution. Bis du den neuen Fingerprint
            außerhalb des Chats verifizierst und bestätigst, gehen deine
            Nachrichten weiterhin an den zuvor vertrauten Schlüssel:
          </p>
          <p className="font-mono tracking-wide mt-1 text-discord-text">{status.fingerprint}</p>
        </div>
        <button
          type="button"
          className="flex-shrink-0 self-center text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-discord-red/20 hover:bg-discord-red/30 transition-colors disabled:opacity-50"
          disabled={accepting}
          onClick={async () => { setAccepting(true); try { await acceptKeyChange(partnerId) } finally { setAccepting(false) } }}
        >
          {accepting ? 'Bestätige…' : 'Bestätigen'}
        </button>
      </div>
    )
  }

  // first-use / verified — a subtle line with the fingerprint for comparison.
  const verified = status.trust === 'verified'
  return (
    <div className="mx-4 mt-2 flex items-center gap-1.5 text-[11px] text-discord-muted">
      {verified
        ? <ShieldCheck size={12} className="text-discord-green flex-shrink-0" />
        : <Fingerprint size={12} className="flex-shrink-0" />}
      <span>{verified ? 'Schlüssel verifiziert' : 'Schlüssel erstmals gesehen (TOFU)'} ·</span>
      <span className="font-mono tracking-wide">{status.fingerprint}</span>
    </div>
  )
}
