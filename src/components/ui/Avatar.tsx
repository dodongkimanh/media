import { getInitials, getAvatarColor, AVATAR_COLOR_DEFAULT } from '@/lib/types'

interface AvatarProps {
  name: string
  color?: string
  size?: 'xs' | 'sm' | 'md'
}

export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  const cls = size === 'xs' ? 'av-xs' : size === 'sm' ? 'av av-sm' : 'av'
  const bg = color && color !== AVATAR_COLOR_DEFAULT ? color : getAvatarColor(name)
  return (
    <div className={cls} style={{ background: bg }}>
      {getInitials(name)}
    </div>
  )
}
