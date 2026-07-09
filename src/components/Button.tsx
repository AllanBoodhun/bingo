import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'close-game'
}

const VARIANT_CLASS = {
  primary: 'cta-primary',
  secondary: 'cta-secondary',
  'close-game': 'cta-close-game',
} as const

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={[VARIANT_CLASS[variant], className].filter(Boolean).join(' ')} {...props} />
}
