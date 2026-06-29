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

function roleLabel(r: string) {
  return r === 'admin' ? 'Admin' : r === 'lead' ? 'Lead' : 'Nhân viên'
}

function roleBadge(r: string) {
  return r === 'admin' ? 'badge-blue' : r === 'lead' ? 'badge-purple' : 'badge-gray'
}

export default function StaffPage() {
  const { profile: me, isAdmin, canManage } = useAuth()
  const [staff, setStaff] = useState<Profile[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editStaff, setEditStaff] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'lead' | 'staff'>('staff')
  const [color, setColor] = useState('')
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

  if (!canManage) {
    return (
      <div className="empty-state" style={{ paddingTop: '4rem' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <p>Bạn không có quyền truy cập trang này.</p>
      </div>
    )
  }

  function openAdd() {
    setEditStaff(null); setName(''); setEmail(''); setRole('staff'); setColor(''); setPassword(''); setError(''); setShowModal(true)
  }

  function openEdit(s: Profile) {
    setEditStaff(s); setName(s.full_name); setEmail(s.email)
    setRole(s.role as typeof role); setColor(s.avatar_color ?? ''); setPassword(''); setError(''); setShowModal(true)
  }

  function canEditTarget(s: Profile) {
    if (isAdmin) return true
    // lead chỉ sửa được nhân viên
    return s.role === 'staff'
  }

  function canDeleteTarget(s: Profile) {
    if (s.id === me?.id) return false
    if (isAdmin) return true
    return s.role === 'staff'
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    if (editStaff) {
      const update: Record<string, string> = { full_name: name.trim(), avatar_color: color }
      // lead không đổi được role
      if (isAdmin) update.role = role
      const { error: err } = await supabase.from('profiles').update(update).eq('id', editStaff.id)
      if (err) { setError(err.message); setSaving(false); return }
      show('Đã cập nhật thông tin nhân viên')
    } else {
      if (!email.trim() || !password.trim()) {
        setError('Email và mật khẩu là bắt buộc khi tạo mới.')
        setSaving(false)
        return
      }
      try {
        const res = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, full_name: name.trim(), role, avatar_color: color })
        })
        let json: { error?: string } = {}
        try { json = await res.json() } catch { /* response không phải JSON */ }
        if (!res.ok) { setError(json.error ?? `Lỗi ${res.status}: Không thể tạo tài khoản`); setSaving(false); return }
      } catch {
        setError('Không kết nối được tới server')
        setSaving(false)
        return
      }
      show('Đã thêm nhân viên')
    }

    setSaving(false)
    setShowModal(false)
    load()
  }

  async function toggleLock(s: Profile) {
    const lock = !s.is_locked
    const action = lock ? 'Khóa' : 'Mở khóa'
    if (!confirm(`${action} tài khoản "${s.full_name}"?`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('profiles').update({ is_locked: lock }).eq('id', s.id)
    if (err) { show('Lỗi: ' + err.message, 'error'); return }
    show(`Đã ${action.toLowerCase()} tài khoản!`)
    load()
  }

  async function remove(s: Profile) {
    if (s.id === me?.id) { show('Không thể xóa tài khoản đang đăng nhập', 'error'); return }
    if (!confirm(`Xóa nhân viên "${s.full_name}"?`)) return
    let res: Response
    try {
      res = await fetch('/api/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, role: s.role })
      })
    } catch {
      show('Không kết nối được tới server', 'error'); return
    }
    let json: { error?: string } = {}
    try { json = await res.json() } catch { /* ignore */ }
    if (!res.ok) { show(json.error ?? 'Không thể xóa', 'error'); return }
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
            <tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} style={{ opacity: s.is_locked ? .55 : 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <Avatar name={s.full_name} color={s.avatar_color} size="sm" />
                    <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                    {s.id === me?.id && <span className="badge badge-green" style={{ fontSize: 10 }}>Bạn</span>}
                  </div>
                </td>
                <td style={{ color: 'var(--mu)' }}>{s.email}</td>
                <td>
                  <span className={`badge ${roleBadge(s.role)}`}>{roleLabel(s.role)}</span>
                </td>
                <td>
                  {s.is_locked
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 1 1 6 0v2"/></svg>
                        Đã khóa
                      </span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="3"/><path d="M8 5V2M8 14v-3M5 8H2M14 8h-3"/></svg>
                        Hoạt động
                      </span>}
                </td>
                <td style={{ color: 'var(--mu)' }}>{fmtDate(s.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '.35rem' }}>
                    {canEditTarget(s) && (
                      <button className="btn-icon" onClick={() => openEdit(s)} title="Sửa">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                      </button>
                    )}
                    {isAdmin && s.id !== me?.id && (
                      <button className="btn-icon" onClick={() => toggleLock(s)} title={s.is_locked ? 'Mở khóa' : 'Khóa tài khoản'}>
                        {s.is_locked
                          ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="1.5"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 5.5-1.5"/></svg>
                          : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#BA7517" strokeWidth="1.5"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 1 1 6 0v2"/></svg>}
                      </button>
                    )}
                    {canDeleteTarget(s) && (
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
        {/* Chỉ admin mới đổi được role */}
        {isAdmin && (
          <div className="fg">
            <label>Vai trò</label>
            <select value={role} onChange={e => setRole(e.target.value as typeof role)}>
              <option value="staff">Nhân viên</option>
              <option value="lead">Lead</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        <div className="fg">
          <label>Màu avatar</label>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setColor('')}
              style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bd)', border: `3px solid ${color === '' ? 'var(--tx)' : 'transparent'}`, cursor: 'pointer', flexShrink: 0, fontSize: 11, color: 'var(--mu)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Tự động theo tên"
            >A</button>
            {AVATAR_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${color === c ? 'var(--tx)' : 'transparent'}`, cursor: 'pointer', flexShrink: 0 }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: '.3rem' }}>
            {color === '' ? 'Tự động chọn màu theo tên' : 'Màu cố định đã chọn'}
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}
