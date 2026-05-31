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
      <div className="flex items-center gap-2 mb-6">
        <HelpCircle size={22} className="text-discord-blurple" />
        <h2 className="text-xl font-bold text-white">{channel.name}</h2>
        {channel.description && <span className="text-discord-muted text-sm">— {channel.description}</span>}
      </div>

      {items.length === 0 && <p className="text-discord-muted text-sm">Noch keine FAQ-Einträge.</p>}

      <div className="space-y-2 max-w-2xl">
        {items.map(item => {
          const isOpen = open === item.id
          const author = getUser(item.authorId)
          return (
            <div key={item.id} className="bg-discord-channels rounded-lg border border-white/5 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-discord-hover transition-colors"
                onClick={() => setOpen(isOpen ? null : item.id)}
              >
                <span className="text-sm font-semibold text-white">{item.question}</span>
                <ChevronDown size={16} className={`text-discord-muted flex-shrink-0 ml-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
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
