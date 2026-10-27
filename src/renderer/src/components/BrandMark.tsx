interface BrandMarkProps {
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
}

export function BrandMark({ size = 'medium', animated = false }: BrandMarkProps) {
  return (
    <span className={`brand-mark brand-mark-${size}${animated ? ' is-animated' : ''}`} aria-hidden="true">
      <span className="brand-orbit brand-orbit-a" />
      <span className="brand-orbit brand-orbit-b" />
      <span className="brand-core">序</span>
    </span>
  )
}
