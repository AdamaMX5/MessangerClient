import { useState } from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'
import type { Channel } from '../../types'
import { useApp } from '../../store/AppContext'

export default function FaqView({ channel }: { channel: Channel }) {
  const { getUser } = useApp()
  const [open, setOpen] = useState<string | null>(null)
  const items = channel.faqItems ?? []

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="flex items-center gap-2.5 mb-6">
        <HelpCircle size={20} className="text-discord-blurple flex-shrink-0" />
        <h2 className="font-display font-bold text-xl text-white">{channel.name}</h2>
        {channel.description && <span className="text-discord-muted text-sm">— {channel.description}</span>}
      </div>

      {items.length === 0 && <p className="text-discord-muted text-sm">Noch keine FAQ-Einträge.</p>}

      <div className="space-y-2 max-w-2xl">
        {items.map(item => {
          const isOpen = open === item.id
          const author = getUser(item.authorId)
          return (
            <div
              key={item.id}
              className="rounded-xl border overflow-hidden transition-all duration-150"
              style={{
                background: '#0A0D1D',
                border: `1px solid ${isOpen ? 'rgba(245,168,37,0.2)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-discord-hover transition-colors"
                onClick={() => setOpen(isOpen ? null : item.id)}
              >
                <span className="text-sm font-semibold text-white">{item.question}</span>
                <ChevronDown
                  size={15}
                  className={`text-discord-muted flex-shrink-0 ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180 text-discord-blurple' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="h-px mb-3" style={{ background: 'rgba(245,168,37,0.1)' }} />
                  <p className="text-discord-text text-sm leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                  {author && (
                    <p className="text-xs text-discord-muted mt-2">— {author.displayName}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
