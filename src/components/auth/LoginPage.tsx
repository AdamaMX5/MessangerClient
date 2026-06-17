import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Zap, Users } from 'lucide-react'

type Step = 'email' | 'login' | 'register'

const FEATURES = [
  { icon: ShieldCheck, label: 'Ende-zu-Ende verschlüsselt' },
  { icon: Zap,         label: 'Voice & Video Rooms' },
  { icon: Users,       label: 'Forum & FAQ Channels' },
]

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
  const [busy, setBusy] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setBusy(true)
    try {
      const status = await checkEmail(email.trim())
      setStep(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-Mail oder Passwort ist falsch.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== repassword) { setError('Die Passwörter stimmen nicht überein.'); return }
    if (password.length < 4) { setError('Passwort muss mindestens 4 Zeichen haben.'); return }
    setBusy(true)
    try {
      await register(email, password, repassword)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  async function handleClassicRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== repassword) { setError('Die Passwörter stimmen nicht überein.'); return }
    setBusy(true)
    try {
      await register(email, password, repassword)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full bg-discord-input border border-white/8 rounded-lg px-4 py-2.5 text-discord-text placeholder-discord-muted text-sm outline-none transition-all duration-150 focus:border-discord-blurple/60 focus:shadow-[0_0_10px_2px_rgba(245,168,37,0.12)]'
  const btnPrimary = 'w-full bg-discord-blurple text-discord-sidebar font-bold py-2.5 rounded-lg transition-all duration-150 text-sm hover:brightness-110 active:brightness-90 active:scale-[0.99] flex items-center justify-center gap-2'

  // ─── Classic modal ───────────────────────────────────────────────────────────

  if (showClassic) {
    return (
      <div className="min-h-screen bg-discord-chat flex items-center justify-center p-4">
        <div className="bg-discord-channels rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-white/5 animate-slide-up">
          <div className="mb-6">
            <div className="w-10 h-10 rounded-xl bg-discord-blurple flex items-center justify-center mb-4">
              <span className="font-display font-bold text-discord-sidebar text-lg">M</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Konto erstellen</h1>
            <p className="text-discord-muted text-sm mt-1">Wähle einen Anzeigenamen und ein Passwort.</p>
          </div>

          <form onSubmit={handleClassicRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">Anzeigename</label>
              <input className={inputCls} placeholder="Vorname Nachname" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">E-Mail *</label>
              <input className={inputCls} type="email" placeholder="name@beispiel.de" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">Passwort *</label>
              <div className="relative">
                <input className={inputCls + ' pr-10'} type={showPw ? 'text' : 'password'} placeholder="Mindestens 4 Zeichen" required value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text transition-colors" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">Passwort wiederholen *</label>
              <input className={inputCls} type="password" placeholder="Passwort bestätigen" required value={repassword} onChange={e => setRepassword(e.target.value)} />
            </div>
            {error && (
              <p className="text-discord-red text-xs bg-discord-red/10 rounded-lg px-3 py-2 border border-discord-red/20">{error}</p>
            )}
            <button type="submit" className={btnPrimary} disabled={busy}>
              Registrieren <ArrowRight size={15} />
            </button>
          </form>

          <p className="text-center text-discord-muted text-xs mt-5">
            Bereits registriert?{' '}
            <button className="text-discord-blurple hover:underline font-semibold" onClick={() => { setShowClassic(false); setStep('email') }}>
              Anmelden
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ─── Email-first flow — two-panel layout ─────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-discord-sidebar overflow-hidden">

      {/* ── Left brand panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[42%] flex-col items-center justify-center relative overflow-hidden"
           style={{ background: 'linear-gradient(145deg, #06081A 0%, #0C1030 50%, #080E24 100%)' }}>

        {/* Ambient glow orbs */}
        <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(245,168,37,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(245,168,37,0.07) 0%, transparent 70%)' }} />
        <div className="absolute top-3/4 left-1/3 w-40 h-40 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(52,212,155,0.06) 0%, transparent 70%)' }} />

        {/* Decorative ring behind logo */}
        <div className="absolute" style={{
          width: 220, height: 220,
          border: '1px solid rgba(245,168,37,0.12)',
          borderRadius: '50%',
          top: '50%', left: '50%',
          transform: 'translate(-50%, calc(-50% - 40px))',
        }} />
        <div className="absolute" style={{
          width: 310, height: 310,
          border: '1px solid rgba(245,168,37,0.06)',
          borderRadius: '50%',
          top: '50%', left: '50%',
          transform: 'translate(-50%, calc(-50% - 40px))',
        }} />

        {/* Brand content */}
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
               style={{ background: '#F5A825', boxShadow: '0 0 40px 8px rgba(245,168,37,0.3)' }}>
            <span className="font-display font-black text-4xl" style={{ color: '#05060E' }}>M</span>
          </div>

          <h1 className="font-display font-bold text-3xl text-white mb-2 tracking-tight">
            MessengerClient
          </h1>
          <p className="text-discord-muted text-base leading-relaxed max-w-xs mx-auto">
            Sicher kommunizieren.<br />Gemeinsam wachsen.
          </p>

          <div className="mt-10 flex flex-col gap-3 items-start">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(245,168,37,0.15)' }}>
                  <Icon size={13} className="text-discord-blurple" />
                </div>
                <span className="text-sm text-discord-text/70">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom corner decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
             style={{ background: 'linear-gradient(to right, transparent, rgba(245,168,37,0.15), transparent)' }} />
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex-1 bg-discord-chat flex items-center justify-center p-8">
        <div className="w-full max-w-[340px] animate-slide-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-discord-blurple flex items-center justify-center">
              <span className="font-display font-black text-xl" style={{ color: '#05060E' }}>M</span>
            </div>
            <span className="font-display font-bold text-xl text-white">MessengerClient</span>
          </div>

          {/* Title area */}
          <div className="mb-7">
            <h2 className="font-display font-bold text-2xl text-white">
              {step === 'register' ? 'Konto erstellen' : 'Willkommen zurück'}
            </h2>
            <p className="text-discord-muted text-sm mt-1.5">
              {step === 'email'    && 'Bitte E-Mail-Adresse eingeben'}
              {step === 'login'    && `Anmelden als ${email}`}
              {step === 'register' && `Neue E-Mail: ${email}`}
            </p>
          </div>

          {/* ── Step: email ── */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">E-Mail-Adresse</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-discord-muted" />
                  <input
                    className={inputCls + ' pl-9'}
                    type="email" required autoFocus
                    placeholder="name@beispiel.de"
                    value={email} onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className={btnPrimary} disabled={busy}>Weiter <ArrowRight size={15} /></button>
            </form>
          )}

          {/* ── Step: login ── */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-discord-muted border border-white/5 hover:border-white/10 transition-colors"
                onClick={() => { setStep('email'); setPassword(''); setError('') }}
              >
                <Mail size={13} />
                <span className="flex-1 text-left truncate">{email}</span>
                <span className="text-discord-blurple text-xs font-semibold">Ändern</span>
              </button>
              <div>
                <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">Passwort</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-discord-muted" />
                  <input
                    className={inputCls + ' pl-9 pr-10'}
                    type={showPw ? 'text' : 'password'} required autoFocus
                    placeholder="Passwort eingeben"
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text transition-colors" onClick={() => setShowPw(v => !v)}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-discord-red text-xs bg-discord-red/10 rounded-lg px-3 py-2 border border-discord-red/20">{error}</p>
              )}
              <button type="submit" className={btnPrimary} disabled={busy}>Anmelden <ArrowRight size={15} /></button>
            </form>
          )}

          {/* ── Step: register ── */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-discord-muted border border-white/5 hover:border-white/10 transition-colors"
                onClick={() => { setStep('email'); setPassword(''); setError('') }}
              >
                <Mail size={13} />
                <span className="flex-1 text-left truncate">{email}</span>
                <span className="text-discord-blurple text-xs font-semibold">Ändern</span>
              </button>
              <div>
                <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">Anzeigename</label>
                <input className={inputCls} placeholder="Vorname Nachname" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">Passwort *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-discord-muted" />
                  <input
                    className={inputCls + ' pl-9 pr-10'}
                    type={showPw ? 'text' : 'password'} required autoFocus
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text transition-colors" onClick={() => setShowPw(v => !v)}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1.5">Passwort wiederholen *</label>
                <input className={inputCls} type="password" required value={repassword} onChange={e => setRepassword(e.target.value)} />
              </div>
              {error && (
                <p className="text-discord-red text-xs bg-discord-red/10 rounded-lg px-3 py-2 border border-discord-red/20">{error}</p>
              )}
              <button type="submit" className={btnPrimary} disabled={busy}>Registrieren <ArrowRight size={15} /></button>
            </form>
          )}

          {step === 'email' && (
            <p className="text-center text-discord-muted text-xs mt-6">
              Neu hier?{' '}
              <button className="text-discord-blurple hover:underline font-semibold" onClick={() => setShowClassic(true)}>
                Jetzt registrieren
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
