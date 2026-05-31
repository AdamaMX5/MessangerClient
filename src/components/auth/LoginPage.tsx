import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { Eye, EyeOff, Mail, Lock, UserPlus } from 'lucide-react'

type Step = 'email' | 'login' | 'register'

export default function LoginPage() {
  const { checkEmail, login, register } = useApp()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('email')
  const [showClassic, setShowClassic] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repassword, setRepassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  // ─── Email-first flow ───────────────────────────────────────────────────────

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    const status = checkEmail(email.trim())
    setStep(status)
    setError('')
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const ok = login(email, password)
    if (!ok) { setError('E-Mail oder Passwort ist falsch.'); return }
    navigate('/')
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== repassword) { setError('Die Passwörter stimmen nicht überein.'); return }
    if (password.length < 4) { setError('Passwort muss mindestens 4 Zeichen haben.'); return }
    const name = displayName.trim() || email.split('@')[0]
    register(email, password, name)
    navigate('/')
  }

  // ─── Classic registration modal ─────────────────────────────────────────────

  function handleClassicRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== repassword) { setError('Die Passwörter stimmen nicht überein.'); return }
    const name = displayName.trim() || email.split('@')[0]
    register(email, password, name)
    navigate('/')
  }

  // ─── Shared input style ──────────────────────────────────────────────────────

  const inputCls = 'w-full bg-discord-chat border border-white/10 rounded px-3 py-2 text-discord-text placeholder-discord-muted text-sm focus:outline-none focus:border-discord-blurple'
  const btnPrimary = 'w-full bg-discord-blurple hover:bg-indigo-500 text-white font-semibold py-2 rounded transition-colors text-sm'

  // ─── Classic modal ───────────────────────────────────────────────────────────

  if (showClassic) {
    return (
      <div className="min-h-screen bg-discord-chat flex items-center justify-center p-4">
        <div className="bg-discord-channels rounded-lg p-8 w-full max-w-sm shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus size={24} className="text-discord-blurple" />
            <h1 className="text-2xl font-bold text-white">Konto erstellen</h1>
          </div>

          <form onSubmit={handleClassicRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">Anzeigename</label>
              <input className={inputCls} placeholder="Vorname Nachname" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">E-Mail *</label>
              <input className={inputCls} type="email" placeholder="name@beispiel.de" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">Passwort *</label>
              <div className="relative">
                <input className={inputCls + ' pr-10'} type={showPw ? 'text' : 'password'} placeholder="Mindestens 4 Zeichen" required value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">Passwort wiederholen *</label>
              <input className={inputCls} type="password" placeholder="Passwort bestätigen" required value={repassword} onChange={e => setRepassword(e.target.value)} />
            </div>
            {error && <p className="text-discord-red text-xs">{error}</p>}
            <button type="submit" className={btnPrimary}>Registrieren</button>
          </form>

          <p className="text-center text-discord-muted text-xs mt-4">
            Bereits registriert?{' '}
            <button className="text-discord-blurple hover:underline" onClick={() => { setShowClassic(false); setStep('email') }}>
              Anmelden
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ─── Email-first flow UI ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-discord-chat flex items-center justify-center p-4">
      <div className="bg-discord-channels rounded-lg p-8 w-full max-w-sm shadow-2xl">

        {/* Logo / Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-discord-blurple rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl font-black text-white">
            M
          </div>
          <h1 className="text-2xl font-bold text-white">
            {step === 'register' ? 'Konto erstellen' : 'Willkommen zurück'}
          </h1>
          <p className="text-discord-muted text-sm mt-1">
            {step === 'email' && 'Bitte E-Mail-Adresse eingeben'}
            {step === 'login' && `Anmelden als ${email}`}
            {step === 'register' && `Neue E-Mail: ${email}`}
          </p>
        </div>

        {/* Step: email only */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">E-Mail-Adresse</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
                <input
                  className={inputCls + ' pl-9'}
                  type="email" required autoFocus
                  placeholder="name@beispiel.de"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className={btnPrimary}>Weiter →</button>
          </form>
        )}

        {/* Step: login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-discord-chat rounded text-sm text-discord-muted mb-2">
              <Mail size={14} /> {email}
              <button type="button" className="ml-auto text-discord-blurple hover:underline text-xs" onClick={() => { setStep('email'); setPassword(''); setError('') }}>Ändern</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">Passwort</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
                <input
                  className={inputCls + ' pl-9 pr-10'}
                  type={showPw ? 'text' : 'password'} required autoFocus
                  placeholder="Passwort eingeben"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-discord-red text-xs">{error}</p>}
            <button type="submit" className={btnPrimary}>Anmelden</button>
          </form>
        )}

        {/* Step: register (after unknown email) */}
        {step === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-discord-chat rounded text-sm text-discord-muted mb-2">
              <Mail size={14} /> {email}
              <button type="button" className="ml-auto text-discord-blurple hover:underline text-xs" onClick={() => { setStep('email'); setPassword(''); setError('') }}>Ändern</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">Anzeigename</label>
              <input className={inputCls} placeholder="Vorname Nachname" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">Passwort *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
                <input
                  className={inputCls + ' pl-9 pr-10'}
                  type={showPw ? 'text' : 'password'} required autoFocus
                  value={password} onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase mb-1">Passwort wiederholen *</label>
              <input className={inputCls} type="password" required value={repassword} onChange={e => setRepassword(e.target.value)} />
            </div>
            {error && <p className="text-discord-red text-xs">{error}</p>}
            <button type="submit" className={btnPrimary}>Registrieren</button>
          </form>
        )}

        {/* Classic registration link — only on email step */}
        {step === 'email' && (
          <p className="text-center text-discord-muted text-xs mt-4">
            Neu hier?{' '}
            <button className="text-discord-blurple hover:underline" onClick={() => setShowClassic(true)}>
              Jetzt registrieren
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
