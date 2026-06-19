import { useEffect, useMemo, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { objectService } from '../../services/objectService'
import type { ChannelData } from '../../store/spacesHelpers'
import type { ChannelType } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  // Optional category to preselect, e.g. when triggered from a category header.
  defaultCategoryName?: string
}

// German labels for every channel type, keyed by the ChannelType union so the
// select stays exhaustive if a new type is added to the union.
const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  text:         'Text',
  voice:        'Sprache',
  video:        'Video',
  forum:        'Forum',
  faq:          'FAQ',
  onboarding:   'Onboarding',
  stage:        'Bühne',
  announcement: 'Ankündigung',
}

// Sentinel value for the category select that switches to free-text input.
const NEW_CATEGORY = '__new__'

export default function CreateChannelModal({ isOpen, onClose, defaultCategoryName }: Props) {
  const { currentUser, spaces, activeSpaceId, reloadSpaces, setActiveChannel } = useApp()
  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('text')
  const [categoryName, setCategoryName] = useState('')
  // Single access mode rather than two independent booleans — guarantees that
  // exactly one option is active and gives one-click switching for free.
  // 'encrypted' (E2E, default) ⊻ 'public' (free-to-join, no E2E).
  const [accessMode, setAccessMode] = useState<'encrypted' | 'public'>('encrypted')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Existing categories of the active space, used to populate the select.
  const existingCategories = useMemo(() => {
    const space = spaces.find(s => s.id === activeSpaceId)
    return space?.categories.map(c => c.name) ?? []
  }, [spaces, activeSpaceId])

  // Reset all fields whenever the modal (re)opens, preselecting the category.
  useEffect(() => {
    if (isOpen) {
      setName('')
      setType('text')
      setCategoryName(defaultCategoryName ?? '')
      setAccessMode('encrypted')
      setError('')
      setSubmitting(false)
    }
  }, [isOpen, defaultCategoryName])

  if (!isOpen || !currentUser) return null

  const isEncrypted = accessMode === 'encrypted'
  const isPublic = accessMode === 'public'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!activeSpaceId) {
      setError('Kein aktiver Space ausgewählt.')
      return
    }
    if (!name.trim()) {
      setError('Name darf nicht leer sein.')
      return
    }
    if (!categoryName.trim()) {
      setError('Kategorie darf nicht leer sein.')
      return
    }
    setSubmitting(true)
    try {
      const created = await objectService.create<ChannelData>('channels', {
        data: {
          spaceId: activeSpaceId,
          categoryName: categoryName.trim(),
          name: name.trim(),
          type,
          isEncrypted,
          isPublic,
          memberIds: [currentUser!.id],
        },
      })
      await reloadSpaces()
      setActiveChannel(created.id)
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

  // Whether the category select currently sits on the "new category" option:
  // either the picked value is the sentinel, or the typed value is not among the
  // existing categories (e.g. a preselected name that no longer matches).
  const usingNewCategory = !existingCategories.includes(categoryName) || existingCategories.length === 0

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
            <h1 className="font-display text-xl font-bold text-white">Channel erstellen</h1>
            <p className="text-discord-muted text-sm mt-0.5">Lege einen neuen Channel an.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input
              className={inputCls}
              placeholder="z. B. allgemein"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>Channel-Typ</label>
            <select className={inputCls} value={type} onChange={e => setType(e.target.value as ChannelType)}>
              {(Object.keys(CHANNEL_TYPE_LABELS) as ChannelType[]).map(t => (
                <option key={t} value={t}>{CHANNEL_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Kategorie *</label>
            {existingCategories.length > 0 && (
              <select
                className={`${inputCls} mb-2`}
                value={usingNewCategory ? NEW_CATEGORY : categoryName}
                onChange={e => setCategoryName(e.target.value === NEW_CATEGORY ? '' : e.target.value)}
              >
                {existingCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={NEW_CATEGORY}>Neue Kategorie …</option>
              </select>
            )}
            {usingNewCategory && (
              <input
                className={inputCls}
                placeholder="Neue Kategorie eingeben"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
              />
            )}
          </div>

          {/* Mutually exclusive access mode: exactly one is active, both stay
              clickable, the inactive one is only visually dimmed. */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 accent-discord-blurple"
                checked={isEncrypted}
                onChange={() => setAccessMode('encrypted')}
              />
              <span className={isPublic ? 'opacity-40' : ''}>
                <span className="block text-sm font-semibold text-discord-text">Ende-zu-Ende-Verschlüsselung</span>
                <span className="block text-xs text-discord-muted">Nachrichten sind nur für Mitglieder lesbar.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 accent-discord-blurple"
                checked={isPublic}
                onChange={() => setAccessMode('public')}
              />
              <span className={isEncrypted ? 'opacity-40' : ''}>
                <span className="block text-sm font-semibold text-discord-text">Frei beitretbar</span>
                <span className="block text-xs text-discord-muted">Jeder mit dem Link kann beitreten (deaktiviert die Verschlüsselung).</span>
              </span>
            </label>
          </div>

          {error && (
            <p className="text-discord-red text-xs bg-discord-red/10 rounded-lg px-3 py-2 border border-discord-red/20">{error}</p>
          )}

          <button type="submit" className={btnPrimary} disabled={submitting}>
            {submitting ? 'Wird erstellt …' : 'Channel erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}
