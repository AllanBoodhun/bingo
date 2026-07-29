import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'primaryXL' | 'secondary' | 'close-game'
  color?: 'filledRed' | 'filledBlack' | 'outlinedWhite'
  icon?: string
}

const VARIANT_CLASS = {
  primary: 'cta-primary',
  primaryXL: 'cta-primary-xl',
  secondary: 'cta-secondary',
  'close-game': 'cta-close-game',
} as const

const COLOR_CLASS = {
  filledRed: 'cta-color-filled-red',
  filledBlack: 'cta-color-filled-black',
  outlinedWhite: 'cta-color-outlined-white',
} as const

export function Button({ variant = 'primary', color, icon, className, children, ...props }: ButtonProps) {
  const classes = [VARIANT_CLASS[variant], color && COLOR_CLASS[color], className].filter(Boolean).join(' ')

  return (
    <button className={classes} {...props}>
      {icon && <img className="cta-icon" src={icon} alt="" aria-hidden="true" />}
      {children}
    </button>
  )
}
