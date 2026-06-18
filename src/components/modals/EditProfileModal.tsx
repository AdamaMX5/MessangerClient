import { useEffect, useRef, useState } from 'react'
import { X, UserCog, Upload } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { mediaService } from '../../services/mediaService'
import { profileService } from '../../services/profileService'
import Avatar from '../common/Avatar'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function EditProfileModal({ isOpen, onClose }: Props) {
  const { currentUser, refreshProfile } = useApp()
  const [displayName, setDisplayName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset fields whenever the modal (re)opens for the current user.
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser?.displayName ?? '')
      setFile(null)
      setPreviewUrl(null)
      setError('')
      setSubmitting(false)
    }
  }, [isOpen, currentUser])

  // Revoke the object URL when the chosen file changes or the modal unmounts.
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!isOpen || !currentUser) return null

  function handleClose() {
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Anzeigename darf nicht leer sein.')
      return
    }
    setSubmitting(true)
    try {
      let avatar = currentUser!.avatarUrl
      if (file) {
        const media = await mediaService.upload(file, { folder: 'avatars' })
        avatar = media.url
      }
      await profileService.updateGlobalProfile({ displayName: displayName.trim(), avatar })
      await refreshProfile()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full bg-discord-input border border-white/8 rounded-lg px-4 py-2.5 text-discord-text placeholder-discord-muted text-sm outline-none transition-all duration-150 focus:border-discord-blurple/60 focus:shadow-[0_0_10px_2px_rgba(245,168,37,0.12)]'
  const labelCls = 'block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5'
  const btnPrimary = 'w-full bg-discord-blurple text-discord-sidebar font-bold py-2.5 rounded-lg transition-all duration-150 text-sm hover:brightness-110 active:brightness-90 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-discord-channels rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/5 animate-slide-up relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-5 top-5 text-discord-muted hover:text-discord-text transition-colors"
          title="Schließen"
          onClick={handleClose}
        >
          <X size={18} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-discord-blurple flex items-center justify-center flex-shrink-0">
            <UserCog size={18} className="text-discord-sidebar" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Profil bearbeiten</h1>
            <p className="text-discord-muted text-sm mt-0.5">Avatar und Anzeigename ändern.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img src={previewUrl} alt="Vorschau" className="w-16 h-16 rounded-full object-cover" style={{ background: '#0A0D1D' }} />
            ) : (
              <Avatar user={currentUser} size={64} showStatus={false} />
            )}
            <div>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-semibold text-discord-blurple hover:underline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} /> Avatar wählen
              </button>
              {file && <p className="text-discord-muted text-xs mt-1 truncate max-w-[180px]">{file.name}</p>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className={labelCls}>Anzeigename *</label>
            <input
              className={inputCls}
              placeholder="Dein Name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-discord-red text-xs bg-discord-red/10 rounded-lg px-3 py-2 border border-discord-red/20">{error}</p>
          )}

          <button type="submit" className={btnPrimary} disabled={submitting}>
            {submitting ? 'Wird gespeichert …' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
