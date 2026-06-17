import { Rocket, CheckCircle2, Circle } from 'lucide-react'
import type { Channel } from '../../types'

export default function OnBoardingView({ channel }: { channel: Channel }) {
  const steps = channel.onboardingSteps ?? []
  const done = steps.filter(s => s.completed).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="flex items-center gap-2.5 mb-2">
        <Rocket size={20} className="text-discord-blurple flex-shrink-0" />
        <h2 className="font-display font-bold text-xl text-white">{channel.name}</h2>
      </div>
      {channel.description && <p className="text-discord-muted text-sm mb-6">{channel.description}</p>}

      {/* Progress */}
      <div className="mb-7 max-w-md">
        <div className="flex justify-between text-xs text-discord-muted mb-2">
          <span>{done} von {steps.length} abgeschlossen</span>
          <span className="font-bold text-discord-blurple">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(to right, #F5A825, #F5C842)' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2.5 max-w-lg">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className="flex items-start gap-3 p-4 rounded-xl border transition-all duration-150"
            style={{
              background: step.completed ? 'rgba(52,212,155,0.04)' : '#0A0D1D',
              border: step.completed ? '1px solid rgba(52,212,155,0.15)' : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed
                ? <CheckCircle2 size={19} className="text-discord-green" />
                : <Circle size={19} className="text-discord-muted" />
              }
            </div>
            <div>
              <div className="mb-0.5">
                <span className="text-[10px] font-bold text-discord-muted uppercase tracking-widest">Schritt {i + 1}</span>
              </div>
              <h3 className={`text-sm font-semibold ${step.completed ? 'line-through text-discord-muted' : 'text-white'}`}>
                {step.title}
              </h3>
              <p className="text-xs text-discord-muted mt-0.5 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
