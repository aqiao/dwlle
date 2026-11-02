import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Status } from '../types'
import { Icon, type IconName } from './Icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: IconName
  size?: 'small' | 'medium'
}

export function Button({ variant = 'secondary', icon, size = 'medium', children, className = '', ...props }: ButtonProps) {
  return (
    <button className={`button button-${variant} button-${size} ${className}`} {...props}>
      {icon && <Icon name={icon} size={size === 'small' ? 16 : 18} />}
      {children}
    </button>
  )
}

const statusLabels: Record<Status, string> = {
  success: '成功',
  running: '运行中',
  failed: '失败',
  paused: '已暂停',
  draft: '草稿',
  warning: '警告',
}

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {label ?? statusLabels[status]}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Tag({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'blue' | 'purple' }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

export function Avatar({ name, size = 'medium' }: { name: string; size?: 'small' | 'medium' }) {
  return <span className={`avatar avatar-${size}`}>{name.slice(0, 1)}</span>
}

export function ProgressBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'green' | 'orange' }) {
  return (
    <div className="progress-track" aria-label={`${value}%`}>
      <span className={`progress-value progress-${tone}`} style={{ width: `${value}%` }} />
    </div>
  )
}
