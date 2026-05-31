import { Rocket, CheckCircle2, Circle } from 'lucide-react'
import type { Channel } from '../../types'

export default function OnBoardingView({ channel }: { channel: Channel }) {
  const steps = channel.onboardingSteps ?? []
  const done = steps.filter(s => s.completed).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="flex items-center gap-2 mb-2">
        <Rocket size={22} className="text-discord-blurple" />
        <h2 className="text-xl font-bold text-white">{channel.name}</h2>
      </div>
      {channel.description && <p className="text-discord-muted text-sm mb-6">{channel.description}</p>}

      {/* Progress bar */}
      <div className="mb-6 max-w-md">
        <div className="flex justify-between text-xs text-discord-muted mb-1">
          <span>{done} von {steps.length} abgeschlossen</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-discord-input rounded-full overflow-hidden">
          <div className="h-full bg-discord-blurple transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 max-w-lg">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={`flex items-start gap-3 p-4 rounded-lg border transition-colors
              ${step.completed ? 'bg-discord-green/5 border-discord-green/20' : 'bg-discord-channels border-white/5'}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed
                ? <CheckCircle2 size={20} className="text-discord-green" />
                : <Circle size={20} className="text-discord-muted" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-discord-muted">Schritt {i + 1}</span>
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
