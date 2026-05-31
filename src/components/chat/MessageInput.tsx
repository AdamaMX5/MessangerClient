import { useState, type KeyboardEvent } from 'react'
import { Send, Smile, Paperclip } from 'lucide-react'

interface Props {
  placeholder?: string
  onSend: (body: string) => void
  disabled?: boolean
}

export default function MessageInput({ placeholder = 'Nachricht eingeben…', onSend, disabled }: Props) {
  const [value, setValue] = useState('')

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

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div className="bg-discord-input rounded-lg flex items-end gap-2 px-3 py-2">
        <button className="text-discord-muted hover:text-discord-text transition-colors mb-1" title="Anhang">
          <Paperclip size={20} />
        </button>
        <textarea
          className="flex-1 bg-transparent text-discord-text text-sm placeholder-discord-muted resize-none outline-none max-h-40 min-h-[24px]"
          placeholder={disabled ? 'Dieser Kanal ist schreibgeschützt.' : placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={disabled}
          style={{ height: 'auto' }}
          onInput={e => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = t.scrollHeight + 'px'
          }}
        />
        <button className="text-discord-muted hover:text-discord-text transition-colors mb-1" title="Emoji">
          <Smile size={20} />
        </button>
        <button
          className={`mb-1 transition-colors ${value.trim() ? 'text-discord-blurple hover:text-indigo-400' : 'text-discord-muted'}`}
          onClick={submit} title="Senden"
        >
          <Send size={20} />
        </button>
      </div>
      <p className="text-xs text-discord-muted mt-1 px-1">Enter zum Senden · Shift+Enter für neue Zeile</p>
    </div>
  )
}
