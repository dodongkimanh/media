'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { Avatar } from '@/components/ui/Avatar'
import type { Profile } from '@/lib/types'
import { AVATAR_COLORS, fmtDate } from '@/lib/types'

export default function StaffPage() {
  const { profile: me, isAdmin } = useAuth()
  const [staff, setStaff] = useState<Profile[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editStaff, setEditStaff] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'staff'>('staff')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { toast, show, clear } = useToast()

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setStaff(data ?? [])
  }

  useEffect(() => { load() }, [])

  if (!isAdmin) {
    return (
      <div className="empty-state" style={{ paddingTop: '4rem' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <p>Chỉ admin mới có quyền truy cập trang này.</p>
      </div>
    )
  }

  function openAdd() { setEditStaff(null); setName(''); setEmail(''); setRole('staff'); setColor(AVATAR_COLORS[0]); setPassword(''); setError(''); setShowModal(true) }
  function openEdit(s: Profile) { setEditStaff(s); setName(s.full_name); setEmail(s.email); setRole(s.role); setColor(s.avatar_color); setPassword(''); setError(''); setShowModal(true) }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    if (editStaff) {
      await supabase.from('profiles').update({ full_name: name.trim(), role, avatar_color: color }).eq('id', editStaff.id)
      show('Đã cập nhật thông tin nhân viên')
    } else {
      if (!email.trim() || !password.trim()) {
        setError('Email và mật khẩu là bắt buộc khi tạo mới.')
        setSaving(false)
        return
      }
      const { data, error: authErr } = await supabase.auth.admin.createUser({
        email: email.trim(), password, email_confirm: true,
        user_metadata: { full_name: name.trim(), role }
      })
      if (authErr || !data?.user) {
        setError(authErr?.message ?? 'Không thể tạo tài khoản. Hãy dùng Supabase Admin.')
        setSaving(false)
        return
      }
      await supabase.from('profiles').update({ full_name: name.trim(), role, avatar_color: color }).eq('id', data.user.id)
      show('Đã thêm nhân viên')
    }

    setSaving(false)
    setShowModal(false)
    load()
  }

  async function remove(s: Profile) {
    if (s.id === me?.id) { show('Không thể xóa tài khoản đang đăng nhập', 'error'); return }
    if (!confirm(`Xóa nhân viên "${s.full_name}"?`)) return
    const supabase = createClient()
    await supabase.from('profiles').delete().eq('id', s.id)
    show('Đã xóa nhân viên')
    load()
  }

  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Nhân viên</div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
          Thêm
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Ngày tạo</th><th></th></tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <Avatar name={s.full_name} color={s.avatar_color} size="sm" />
                    <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                    {s.id === me?.id && <span className="badge badge-green" style={{ fontSize: 10 }}>Bạn</span>}
                  </div>
                </td>
                <td style={{ color: 'var(--mu)' }}>{s.email}</td>
                <td>
                  <span className={`badge ${s.role === 'admin' ? 'badge-blue' : 'badge-gray'}`}>
                    {s.role === 'admin' ? 'Admin' : 'Nhân viên'}
                  </span>
                </td>
                <td style={{ color: 'var(--mu)' }}>{fmtDate(s.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button className="btn-icon" onClick={() => openEdit(s)} title="Sửa">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                    </button>
                    {s.id !== me?.id && (
                      <button className="btn-icon danger" onClick={() => remove(s)} title="Xóa">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--mu)' }}>Chưa có nhân viên</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editStaff ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên'}
        maxWidth={420}
        scrollable={false}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        {error && (
          <div style={{ background: '#FEF0F0', color: 'var(--red)', borderRadius: 8, padding: '.55rem .85rem', fontSize: 12.5, marginBottom: '.9rem' }}>
            {error}
          </div>
        )}
        <div className="fg"><label>Họ tên *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" /></div>
        {!editStaff && (
          <>
            <div className="fg"><label>Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@kimanh.vn" /></div>
            <div className="fg"><label>Mật khẩu *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" /></div>
          </>
        )}
        <div className="fg">
          <label>Vai trò</label>
          <select value={role} onChange={e => setRole(e.target.value as typeof role)}>
            <option value="staff">Nhân viên</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="fg">
          <label>Màu avatar</label>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.35rem' }}>
            {AVATAR_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${color === c ? 'var(--tx)' : 'transparent'}`, cursor: 'pointer', flexShrink: 0 }}
              />
            ))}
          </div>
        </div>
        {!editStaff && (
          <p style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: '.5rem', lineHeight: 1.5 }}>
            Lưu ý: Việc tạo tài khoản yêu cầu Supabase service_role. Nếu không có quyền, hãy tạo tài khoản trực tiếp trong Supabase Dashboard → Authentication → Users.
          </p>
        )}
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}
