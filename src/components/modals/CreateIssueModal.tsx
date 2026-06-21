import { useEffect, useState } from 'react'
import { X, Bug, CheckCircle2, ExternalLink } from 'lucide-react'
import { gitService, type GitRepo, type CreateIssueResult } from '../../services/gitService'

const FALLBACK_REPO = 'MessangerClient'

const LABEL_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'enhancement', label: 'Verbesserung' },
  { value: 'question', label: 'Frage' },
] as const

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function CreateIssueModal({ isOpen, onClose }: Props) {
  const [repos, setRepos] = useState<GitRepo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposWarning, setReposWarning] = useState('')

  const [repo, setRepo] = useState(FALLBACK_REPO)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [labels, setLabels] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CreateIssueResult | null>(null)

  function resetState() {
    setRepos([])
    setReposWarning('')
    setRepo(FALLBACK_REPO)
    setTitle('')
    setBody('')
    setLabels([])
    setError('')
    setResult(null)
    setSubmitting(false)
  }

  function handleClose() {
    resetState()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setReposLoading(true)
    setReposWarning('')
    gitService.getRepos()
      .then(list => {
        if (cancelled) return
        setRepos(list)
        const preferred = list.find(r => r.name === FALLBACK_REPO)
        setRepo(preferred?.name ?? list[0]?.name ?? FALLBACK_REPO)
      })
      .catch(() => {
        if (cancelled) return
        setRepos([])
        setRepo(FALLBACK_REPO)
        setReposWarning('Repository-Liste konnte nicht geladen werden – Standardauswahl wird verwendet.')
      })
      .finally(() => {
        if (!cancelled) setReposLoading(false)
      })
    return () => { cancelled = true }
  }, [isOpen])

  if (!isOpen) return null

  function toggleLabel(value: string) {
    setLabels(prev => prev.includes(value) ? prev.filter(l => l !== value) : [...prev, value])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim() || !body.trim()) {
      setError('Titel und Beschreibung dürfen nicht leer sein.')
      return
    }
    setSubmitting(true)
    try {
      const res = await gitService.createIssue({
        repo,
        title: title.trim(),
        body: body.trim(),
        labels: labels.length ? labels : undefined,
      })
      setResult(res)
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
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
      onClick={handleClose}
    >
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
            <Bug size={18} className="text-discord-sidebar" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Fehler/Verbesserung melden</h1>
            <p className="text-discord-muted text-sm mt-0.5">Erstellt ein Issue im Repository.</p>
          </div>
        </div>

        {result ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 bg-discord-green/10 border border-discord-green/20 rounded-lg px-4 py-3">
              <CheckCircle2 size={18} className="text-discord-green flex-shrink-0 mt-0.5" />
              <p className="text-sm text-discord-text">
                Issue <span className="font-semibold">#{result.number}</span> wurde erstellt.
              </p>
            </div>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-discord-blurple hover:underline font-semibold"
            >
              Issue öffnen <ExternalLink size={14} />
            </a>
            <button type="button" className={btnPrimary} onClick={handleClose}>Schließen</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Repository</label>
              <select
                className={inputCls}
                value={repo}
                disabled={reposLoading}
                onChange={e => setRepo(e.target.value)}
              >
                {reposLoading && <option>Lädt …</option>}
                {!reposLoading && repos.length === 0 && <option value={FALLBACK_REPO}>{FALLBACK_REPO}</option>}
                {!reposLoading && repos.map(r => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
              {reposWarning && (
                <p className="text-discord-yellow text-xs mt-1.5">{reposWarning}</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Titel *</label>
              <input
                className={inputCls}
                placeholder="Kurze Zusammenfassung"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Beschreibung *</label>
              <textarea
                className={inputCls + ' min-h-[120px] resize-y'}
                placeholder="Was ist passiert? Was sollte passieren?"
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Labels (optional)</label>
              <div className="flex flex-wrap gap-2">
                {LABEL_OPTIONS.map(opt => {
                  const checked = labels.includes(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all duration-150 select-none ${
                        checked
                          ? 'bg-discord-blurple/20 border-discord-blurple/60 text-discord-text'
                          : 'bg-discord-input border-white/8 text-discord-muted hover:text-discord-text'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-discord-blurple"
                        checked={checked}
                        onChange={() => toggleLabel(opt.value)}
                      />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            </div>

            {error && (
              <p className="text-discord-red text-xs bg-discord-red/10 rounded-lg px-3 py-2 border border-discord-red/20">{error}</p>
            )}

            <button type="submit" className={btnPrimary} disabled={submitting}>
              {submitting ? 'Wird gesendet …' : 'Issue erstellen'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
