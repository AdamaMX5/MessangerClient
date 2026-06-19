import { useEffect, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { objectService } from '../../services/objectService'
import type { SpaceData } from '../../store/spacesHelpers'

interface Props {
  isOpen: boolean
  onClose: () => void
}

// Derive a short abbreviation suggestion from the space name's initials,
// e.g. "Büro Berlin" → "BB". Falls back to the first two characters for
// single-word names. Capped at three characters to fit the icon.
function suggestAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
}

export default function CreateSpaceModal({ isOpen, onClose }: Props) {
  const { currentUser, reloadSpaces, setActiveSpace } = useApp()
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  // Track whether the user manually edited the abbreviation; once they do we
  // stop auto-suggesting from the name so we never overwrite their input.
  const [abbrTouched, setAbbrTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset all fields whenever the modal (re)opens.
  useEffect(() => {
    if (isOpen) {
      setName('')
      setAbbreviation('')
      setAbbrTouched(false)
      setError('')
      setSubmitting(false)
    }
  }, [isOpen])

  // Keep the suggested abbreviation in sync with the name until edited.
  useEffect(() => {
    if (!abbrTouched) setAbbreviation(suggestAbbreviation(name))
  }, [name, abbrTouched])

  if (!isOpen || !currentUser) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Name darf nicht leer sein.')
      return
    }
    if (!abbreviation.trim()) {
      setError('Kürzel darf nicht leer sein.')
      return
    }
    setSubmitting(true)
    try {
      const created = await objectService.create<SpaceData>('spaces', {
        data: {
          name: name.trim(),
          abbreviation: abbreviation.trim(),
          memberIds: [currentUser!.id],
        },
      })
      await reloadSpaces()
      setActiveSpace(created.id)
      onClose()
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
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
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
            <Plus size={18} className="text-discord-sidebar" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Space erstellen</h1>
            <p className="text-discord-muted text-sm mt-0.5">Lege einen neuen Space an.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input
              className={inputCls}
              placeholder="z. B. Büro Berlin"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>Kürzel *</label>
            <input
              className={inputCls}
              placeholder="z. B. BB"
              maxLength={4}
              value={abbreviation}
              onChange={e => { setAbbrTouched(true); setAbbreviation(e.target.value) }}
            />
            <p className="text-discord-muted text-xs mt-1.5">Wird als Space-Icon in der Seitenleiste angezeigt.</p>
          </div>

          {error && (
            <p className="text-discord-red text-xs bg-discord-red/10 rounded-lg px-3 py-2 border border-discord-red/20">{error}</p>
          )}

          <button type="submit" className={btnPrimary} disabled={submitting}>
            {submitting ? 'Wird erstellt …' : 'Space erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}
