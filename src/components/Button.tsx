import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const variantClass = variant === 'primary' ? 'cta-primary' : 'cta-secondary'
  return <button className={[variantClass, className].filter(Boolean).join(' ')} {...props} />
}
