'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'

interface TopbarProps {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter()
  const { profile } = useAuth()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{
      background: 'var(--sf)', borderBottom: '1px solid var(--bd)',
      padding: '.6rem 1rem .6rem 1.2rem', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexShrink: 0, zIndex: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        <button
          onClick={onMenuToggle}
          style={{ display: 'none', background: 'transparent', border: 'none', cursor: 'pointer', padding: '.4rem', color: 'var(--tx)' }}
          id="mob-toggle"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M3 5h14M3 10h14M3 15h14"/>
          </svg>
        </button>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: 'var(--gd)' }}>
          KIMANH
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        {profile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            fontSize: 12, color: 'var(--mu)', background: 'var(--bg)',
            border: '1px solid var(--bd)', borderRadius: 20, padding: '.25rem .8rem'
          }}>
            <Avatar name={profile.full_name} color={profile.avatar_color} size="xs" />
            <strong style={{ color: 'var(--tx)' }}>{profile.full_name}</strong>
            {profile.role === 'admin' && <span style={{ color: 'var(--green)', fontSize: 10, fontWeight: 700 }}>Admin</span>}
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>

      <style>{`
        @media (max-width: 680px) {
          #mob-toggle { display: block !important; }
        }
      `}</style>
    </div>
  )
}
