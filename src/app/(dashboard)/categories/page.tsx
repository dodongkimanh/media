'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/ui/Toast'
import type { Category } from '@/lib/types'

export default function CategoriesPage() {
  const { isAdmin } = useAuth()
  const [cats, setCats] = useState<Category[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast, show, clear } = useToast()

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    setCats(data ?? [])
  }

  useEffect(() => { load() }, [])

  function openAdd() { setEditCat(null); setName(''); setDesc(''); setShowModal(true) }
  function openEdit(c: Category) { setEditCat(c); setName(c.name); setDesc(c.description); setShowModal(true) }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const supabase = createClient()
    if (editCat) {
      await supabase.from('categories').update({ name: name.trim(), description: desc }).eq('id', editCat.id)
    } else {
      await supabase.from('categories').insert({ name: name.trim(), description: desc })
    }
    setSaving(false)
    setShowModal(false)
    show(editCat ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục')
    load()
  }

  async function remove(c: Category) {
    if (!confirm(`Xóa danh mục "${c.name}"? Các sản phẩm trong danh mục sẽ không bị xóa.`)) return
    const supabase = createClient()
    await supabase.from('categories').delete().eq('id', c.id)
    show('Đã xóa danh mục')
    load()
  }

  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Quản lý danh mục</div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
            Thêm
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Tên danh mục</th><th>Mô tả</th><th>Ngày tạo</th>{isAdmin && <th></th>}</tr>
          </thead>
          <tbody>
            {cats.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td style={{ color: 'var(--mu)' }}>{c.description || '—'}</td>
                <td style={{ color: 'var(--mu)' }}>{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                {isAdmin && (
                  <td>
                    <div style={{ display: 'flex', gap: '.35rem' }}>
                      <button className="btn-icon" onClick={() => openEdit(c)} title="Sửa">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                      </button>
                      <button className="btn-icon danger" onClick={() => remove(c)} title="Xóa">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9"/></svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {cats.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--mu)' }}>Chưa có danh mục</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editCat ? 'Sửa danh mục' : 'Thêm danh mục'}
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
        <div className="fg">
          <label>Tên danh mục *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Phụ Kiện Ấm Thờ" />
        </div>
        <div className="fg">
          <label>Mô tả</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn..." style={{ minHeight: 65 }} />
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}
