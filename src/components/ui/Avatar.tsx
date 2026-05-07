import { getInitials } from '@/lib/types'

interface AvatarProps {
  name: string
  color?: string
  size?: 'xs' | 'sm' | 'md'
}

export function Avatar({ name, color = '#1D9E75', size = 'md' }: AvatarProps) {
  const cls = size === 'xs' ? 'av-xs' : size === 'sm' ? 'av av-sm' : 'av'
  return (
    <div className={cls} style={{ background: color }}>
      {getInitials(name)}
    </div>
  )
}
