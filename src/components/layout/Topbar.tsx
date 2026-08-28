'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

interface TopbarProps {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { profile } = useAuth()
  const { toast, show, clear } = useToast()
  const [showPass, setShowPass] = useState(false)
  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [passError, setPassError] = useState('')

  async function handleLogout() {
    const supabase = createClient()
    await Promise.race([
      supabase.auth.signOut(),
      new Promise(r => setTimeout(r, 1500))
    ]).catch(() => {})
    window.location.href = '/login?logout=1'
  }

  function openPassModal() {
    setCurPass(''); setNewPass(''); setConfirmPass(''); setPassError(''); setShowPass(true)
  }

  async function handleChangePass() {
    if (!curPass || !newPass || !confirmPass) { setPassError('Điền đầy đủ thông tin'); return }
    if (newPass.length < 6) { setPassError('Mật khẩu mới tối thiểu 6 ký tự'); return }
    if (newPass !== confirmPass) { setPassError('Mật khẩu xác nhận không khớp'); return }
    setPassSaving(true); setPassError('')
    try {
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: profile!.email, password: curPass })
      if (signInErr) throw new Error('Mật khẩu hiện tại không đúng')
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPass })
      if (updateErr) throw updateErr
      setShowPass(false)
      show('Đã đổi mật khẩu thành công!')
    } catch (e: unknown) {
      setPassError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally { setPassSaving(false) }
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
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--gd)' }}>
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
        <button
          className="btn btn-ghost btn-sm"
          onClick={openPassModal}
          title="Đổi mật khẩu"
          style={{ padding: '.35rem .5rem' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 1 1 6 0v2"/>
            <circle cx="8" cy="11" r=".8" fill="currentColor" stroke="none"/>
          </svg>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>

      {showPass && (
        <Modal
          open={showPass}
          onClose={() => setShowPass(false)}
          title="Đổi mật khẩu"
          maxWidth={400}
          scrollable={false}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowPass(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleChangePass} disabled={passSaving}>
                {passSaving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </>
          }
        >
          {passError && (
            <div style={{ background: '#FEF0F0', color: 'var(--red)', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12.5, marginBottom: '.9rem' }}>
              {passError}
            </div>
          )}
          <div className="fg"><label>Mật khẩu hiện tại *</label><input type="password" value={curPass} onChange={e => setCurPass(e.target.value)} autoFocus /></div>
          <div className="fg"><label>Mật khẩu mới *</label><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
          <div className="fg"><label>Xác nhận mật khẩu mới *</label><input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} /></div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}

      <style>{`
        @media (max-width: 680px) {
          #mob-toggle { display: block !important; }
        }
      `}</style>
    </div>
  )
}
