import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { useUIStore } from '../state/uiStore'
export function IconButton({
  children,
  label,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
export function Panel({
  title,
  children,
  className = ''
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      {title && <div className="panel-title">{title}</div>}
      {children}
    </section>
  )
}
export function Section({
  id,
  title,
  children
}: {
  id: string
  title: string
  children: ReactNode
}) {
  const expanded = useUIStore((s) => s.expanded[id])
  const toggle = useUIStore((s) => s.toggleExpanded)
  return (
    <div className="section">
      <button
        className="section-head"
        onClick={() => toggle(id)}
        aria-expanded={expanded}
      >
        <ChevronDown size={14} className={expanded ? '' : '-rotate-90'} />
        {title}
      </button>
      {expanded && <div className="section-body">{children}</div>}
    </div>
  )
}
export function Property({
  label,
  value = '0',
  keyId,
  onChange
}: {
  label: string
  value?: string | number
  keyId?: string
  onChange?: (value: string) => void
}) {
  const keys = useUIStore((s) => s.keyframes)
  const toggle = useUIStore((s) => s.toggleKey)
  const [draft, setDraft] = useState(String(value))
  return (
    <label className="property">
      <span>{label}</span>
      <input
        aria-label={label}
        value={onChange ? draft : value}
        readOnly={!onChange}
        onChange={(event) => {
          setDraft(event.target.value)
          onChange?.(event.target.value)
        }}
        onBlur={() => {
          if (onChange && draft.trim() === '') setDraft(String(value))
        }}
      />
      {keyId && (
        <button
          className={keys.includes(keyId) ? 'key active' : 'key'}
          onClick={(event) => {
            event.preventDefault()
            toggle(keyId)
          }}
          aria-label={`Toggle keyframe for ${label}`}
        >
          ◆
        </button>
      )}
    </label>
  )
}
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <HelpCircle size={22} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}
