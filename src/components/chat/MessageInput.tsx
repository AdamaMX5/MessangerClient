import { useState, type KeyboardEvent } from 'react'
import { Send, Smile, Paperclip } from 'lucide-react'

interface Props {
  placeholder?: string
  onSend: (body: string) => void
  disabled?: boolean
}

export default function MessageInput({ placeholder = 'Nachricht eingeben…', onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const hasContent = value.trim().length > 0

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div
        className="flex items-end gap-2 px-3 py-2 rounded-xl transition-all duration-200"
        style={{
          background: '#111528',
          border: `1px solid ${focused ? 'rgba(245,168,37,0.35)' : 'rgba(255,255,255,0.06)'}`,
          boxShadow: focused ? '0 0 12px 2px rgba(245,168,37,0.10)' : 'none',
        }}
      >
        <button
          className="text-discord-muted hover:text-discord-text transition-colors mb-1 flex-shrink-0"
          title="Anhang"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          className="flex-1 bg-transparent text-discord-text text-sm placeholder-discord-muted resize-none outline-none max-h-40 min-h-[22px] leading-relaxed"
          placeholder={disabled ? 'Dieser Kanal ist schreibgeschützt.' : placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={1}
          disabled={disabled}
          style={{ height: 'auto' }}
          onInput={e => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = t.scrollHeight + 'px'
          }}
        />

        <button
          className="text-discord-muted hover:text-discord-text transition-colors mb-1 flex-shrink-0"
          title="Emoji"
        >
          <Smile size={18} />
        </button>

        <button
          className={`mb-1 flex-shrink-0 transition-all duration-150 ${
            hasContent
              ? 'text-discord-blurple hover:brightness-125 scale-110'
              : 'text-discord-muted'
          }`}
          onClick={submit}
          title="Senden"
        >
          <Send size={18} />
        </button>
      </div>

      <p className="text-[10px] text-discord-muted mt-1 px-1 opacity-60">
        Enter zum Senden · Shift+Enter für neue Zeile
      </p>
    </div>
  )
}
