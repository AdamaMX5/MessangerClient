import { useEffect, useMemo, useState } from 'react'
import { X, Users, Shield, ShieldOff, UserMinus, UserPlus, LogOut } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'
import {
  channelMembershipService,
  type ChannelMembership,
} from '../../services/channelMembershipService'
import { e2eService } from '../../services/e2eService'

interface Props {
  channelId: string
  isOpen: boolean
  onClose: () => void
}

// View and manage a channel's membership. Every mutating action goes through the
// MessageService, which enforces the ACL server-side (ChannelAdmin / Service-
// Admin / Self-Leave) — the UI gating below is convenience only, not the
// security boundary (issue #6).
export default function ChannelMembersModal({ channelId, isOpen, onClose }: Props) {
  const { currentUser, users, getChannel, reloadSpaces, refreshProfile, setActiveSpace, activeSpaceId } = useApp()
  const channel = getChannel(channelId)

  const [membership, setMembership] = useState<ChannelMembership | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [addUserId, setAddUserId] = useState('')
  // Status of the E2E group-key rotation triggered after a membership change.
  const [rotationNote, setRotationNote] = useState('')

  // Fetch the authoritative membership snapshot whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)
    setError('')
    setAddUserId('')
    setRotationNote('')
    channelMembershipService.getMembers(channelId)
      .then(m => { if (!cancelled) setMembership(m) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Mitglieder konnten nicht geladen werden.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, channelId])

  const memberIds = membership?.memberIds ?? []
  const adminIds = membership?.adminIds ?? []
  const isAdmin = !!currentUser && adminIds.includes(currentUser.id)

  // Users known to the client that are not yet members — candidates to add.
  const addable = useMemo(
    () => users.filter(u => !memberIds.includes(u.id)),
    [users, memberIds],
  )

  if (!isOpen || !currentUser) return null

  // Run a membership mutation, fold its returned snapshot into local state and
  // propagate the change to the rest of the app (sidebar/profile). `targetId`
  // drives the per-row busy indicator. When `rotateKeys` is set (membership add/
  // remove on an encrypted channel) and the actor is a channel admin, a new E2E
  // group key is rotated to the resulting member set afterwards (#11).
  async function run(
    targetId: string,
    op: () => Promise<ChannelMembership>,
    rotateKeys = false,
  ): Promise<boolean> {
    setBusyId(targetId)
    setError('')
    try {
      const next = await op()
      setMembership(next)
      void reloadSpaces()
      void refreshProfile()
      if (rotateKeys && channel?.isEncrypted && isAdmin) {
        await rotateGroupKey(next.memberIds)
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  // Rotate the channel's E2E group key to a new version for exactly `memberIds`.
  // Key rotation requires an online admin client (the server never sees keys);
  // surfaces a hint if it could not complete so the gap is visible rather than a
  // silent downgrade. A removed member never receives the new version (backward
  // secrecy); a newly added member can read from the new version onward.
  async function rotateGroupKey(memberIds: string[]): Promise<void> {
    setRotationNote('🔄 Schlüssel werden rotiert …')
    const res = await e2eService.rotateForMembership(channelId, memberIds)
    if (res.version === null) {
      setRotationNote('⚠️ Schlüssel-Rotation ausstehend — ein Channel-Admin muss online sein.')
    } else if (res.skipped > 0) {
      setRotationNote(`🔒 Rotiert (Version ${res.version}), aber ${res.skipped} Mitglied${res.skipped === 1 ? '' : 'er'} ohne Schlüssel übersprungen.`)
    } else {
      setRotationNote(`🔒 Schlüssel rotiert (Version ${res.version}).`)
    }
  }

  async function handleLeave() {
    if (!currentUser) return
    const ok = await run(currentUser.id, () => channelMembershipService.removeMember(channelId, currentUser.id))
    if (ok) {
      // Leaving the active channel: drop back to the space-level view.
      setActiveSpace(activeSpaceId)
      onClose()
    }
  }

  const overlayCls = 'fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4'
  const rowBusy = (id: string) => busyId === id
  const ghostBtn = 'p-1.5 rounded-md text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className={overlayCls} onClick={onClose}>
      <div
        className="bg-discord-channels rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/5 animate-slide-up relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-5 top-5 text-discord-muted hover:text-discord-text transition-colors"
          title="Schließen"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-discord-blurple flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-discord-sidebar" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-white truncate">Mitglieder</h1>
            <p className="text-discord-muted text-sm mt-0.5 truncate">
              {channel ? channel.name : 'Channel'} · {memberIds.length} Mitglied{memberIds.length === 1 ? '' : 'er'}
            </p>
          </div>
        </div>

        {/* Add member — admins only. The server still rejects non-admins, this
            just hides controls the user cannot use. */}
        {isAdmin && (
          <div className="flex gap-2 mb-4">
            <select
              className="flex-1 bg-discord-input border border-white/8 rounded-lg px-3 py-2 text-discord-text text-sm outline-none focus:border-discord-blurple/60"
              value={addUserId}
              onChange={e => setAddUserId(e.target.value)}
            >
              <option value="">Mitglied hinzufügen …</option>
              {addable.map(u => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>
            <button
              type="button"
              className="bg-discord-blurple text-discord-sidebar font-bold px-3 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              disabled={!addUserId || rowBusy(addUserId)}
              onClick={() => addUserId && run(addUserId, () => channelMembershipService.addMember(channelId, addUserId), true).then(() => setAddUserId(''))}
            >
              <UserPlus size={15} /> Add
            </button>
          </div>
        )}

        {error && (
          <p className="text-discord-red text-xs bg-discord-red/10 rounded-lg px-3 py-2 border border-discord-red/20 mb-3">{error}</p>
        )}

        {rotationNote && (
          <p className="text-discord-muted text-xs bg-discord-input/40 rounded-lg px-3 py-2 border border-white/5 mb-3">{rotationNote}</p>
        )}

        <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
          {loading && <p className="text-discord-muted text-sm py-4 text-center">Lädt …</p>}
          {!loading && memberIds.length === 0 && (
            <p className="text-discord-muted text-sm py-4 text-center">Keine Mitglieder.</p>
          )}
          {memberIds.map(id => {
            const user = users.find(u => u.id === id)
            const memberIsAdmin = adminIds.includes(id)
            const isSelf = id === currentUser.id
            return (
              <div key={id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-discord-hover group">
                {user
                  ? <Avatar user={user} size={30} />
                  : <div className="w-[30px] h-[30px] rounded-full bg-discord-input flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-discord-text truncate">
                    {user?.displayName ?? id}{isSelf && <span className="text-discord-muted font-normal"> (du)</span>}
                  </p>
                  {memberIsAdmin && (
                    <p className="text-[11px] text-discord-yellow flex items-center gap-1 leading-4">
                      <Shield size={10} /> Admin
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-0.5">
                    {memberIsAdmin ? (
                      <button
                        type="button" className={ghostBtn} title="Admin-Rechte entziehen"
                        disabled={rowBusy(id)}
                        onClick={() => run(id, () => channelMembershipService.removeAdmin(channelId, id))}
                      >
                        <ShieldOff size={15} />
                      </button>
                    ) : (
                      <button
                        type="button" className={ghostBtn} title="Zum Admin machen"
                        disabled={rowBusy(id)}
                        onClick={() => run(id, () => channelMembershipService.addAdmin(channelId, id))}
                      >
                        <Shield size={15} />
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        type="button" className={`${ghostBtn} hover:text-discord-red`} title="Entfernen"
                        disabled={rowBusy(id)}
                        onClick={() => run(id, () => channelMembershipService.removeMember(channelId, id), true)}
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Self-leave is allowed for any member regardless of admin status. */}
        {memberIds.includes(currentUser.id) && (
          <button
            type="button"
            className="mt-5 w-full flex items-center justify-center gap-2 text-discord-red text-sm font-semibold py-2.5 rounded-lg border border-discord-red/20 hover:bg-discord-red/10 transition-colors disabled:opacity-50"
            disabled={rowBusy(currentUser.id)}
            onClick={handleLeave}
          >
            <LogOut size={15} /> Channel verlassen
          </button>
        )}
      </div>
    </div>
  )
}
