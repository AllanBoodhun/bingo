type BrandMarkProps = {
  variant?: 'default' | 'compact'
}

export function BrandMark({ variant = 'default' }: BrandMarkProps) {
  const className = ['brand-mark', variant === 'compact' ? 'brand-mark--compact' : ''].filter(Boolean).join(' ')

  return (
    <img className={className} src="/Logo.svg" alt="Super Bingo" />
  )
}
