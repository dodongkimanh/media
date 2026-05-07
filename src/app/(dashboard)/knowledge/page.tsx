'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { uploadFiles } from '@/lib/upload'
import type { Article, ArticleType } from '@/lib/types'
import { articleTypeLabel, articleTypeClass, fmtDate } from '@/lib/types'

export default function KnowledgePage() {
  const router = useRouter()
  const { profile, isAdmin } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [filter, setFilter] = useState<ArticleType | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [editArt, setEditArt] = useState<Article | null>(null)
  const [type, setType] = useState<ArticleType>('policy')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [existingImgs, setExistingImgs] = useState<string[]>([])
  const [newImgs, setNewImgs] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [viewArt, setViewArt] = useState<Article | null>(null)
  const { toast, show, clear } = useToast()

  async function load() {
    const supabase = createClient()
    let q = supabase.from('articles').select('*, profiles(*)').order('created_at', { ascending: false })
    if (filter) q = q.eq('type', filter)
    const { data } = await q
    setArticles(data ?? [])
  }

  useEffect(() => { load() }, [filter])

  function openAdd() { setEditArt(null); setType('policy'); setTitle(''); setContent(''); setExistingImgs([]); setNewImgs([]); setShowModal(true) }
  function openEdit(a: Article) { setEditArt(a); setType(a.type); setTitle(a.title); setContent(a.content); setExistingImgs(a.images); setNewImgs([]); setShowModal(true) }

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const uploadedImgs = newImgs.length ? await uploadFiles(newImgs, 'articles') : []
    const images = [...existingImgs, ...uploadedImgs]
    const supabase = createClient()
    if (editArt) {
      await supabase.from('articles').update({ type, title, content, images, updated_at: new Date().toISOString() }).eq('id', editArt.id)
    } else {
      await supabase.from('articles').insert({ type, title, content, images, created_by: profile?.id })
    }
    setSaving(false)
    setShowModal(false)
    show('Đã lưu bài viết')
    load()
  }

  async function remove(a: Article) {
    if (!confirm(`Xóa bài viết "${a.title}"?`)) return
    const supabase = createClient()
    await supabase.from('articles').delete().eq('id', a.id)
    show('Đã xóa bài viết')
    if (viewArt?.id === a.id) setViewArt(null)
    load()
  }

  const filterBtns: { label: string; val: ArticleType | '' }[] = [
    { label: 'Tất cả', val: '' },
    { label: 'Nội quy', val: 'policy' },
    { label: 'Kiến thức SP', val: 'product' },
    { label: 'Đào tạo', val: 'training' },
  ]

  if (viewArt) {
    return (
      <div>
        <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--mu)', display: 'flex', alignItems: 'center', gap: '.3rem', marginBottom: '.2rem' }}>
              <span style={{ color: 'var(--green)', cursor: 'pointer' }} onClick={() => setViewArt(null)}>Kiến thức</span>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2l4 3-4 3"/></svg>
              <span>{articleTypeLabel(viewArt.type)}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{viewArt.title}</div>
          </div>
          <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewArt(null)}>← Quay lại</button>
            {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => { openEdit(viewArt); setViewArt(null) }}>Sửa</button>}
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => remove(viewArt)}>Xóa</button>}
          </div>
        </div>
        <div style={{ padding: '1.5rem 2rem', maxWidth: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span className={`badge ${articleTypeClass(viewArt.type)}`}>{articleTypeLabel(viewArt.type)}</span>
            <span style={{ fontSize: 12, color: 'var(--mu)', marginLeft: '.75rem' }}>
              {fmtDate(viewArt.created_at)} · {viewArt.profiles?.full_name}
            </span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: 'var(--tx)' }}>{viewArt.content}</div>
          {viewArt.images.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '.75rem' }}>
              {viewArt.images.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: 10, border: '1px solid var(--bd)', objectFit: 'cover' }} />
              ))}
            </div>
          )}
        </div>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Kiến thức</div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
          Thêm
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '.6rem 1.2rem', display: 'flex', gap: '.45rem', flexWrap: 'wrap', background: 'var(--sf)', borderBottom: '1px solid var(--bd)' }}>
        {filterBtns.map(b => (
          <button key={b.val} onClick={() => setFilter(b.val)}
            style={{ background: filter === b.val ? 'var(--green)' : 'var(--gl)', color: filter === b.val ? '#fff' : 'var(--gd)', border: 'none', borderRadius: 20, padding: '.28rem .75rem', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gap: '.7rem', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', padding: '1rem 1.2rem' }}>
        {articles.map(a => (
          <div key={a.id} onClick={() => setViewArt(a)}
            style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '1rem 1.1rem', cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(29,158,117,.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.55rem' }}>
              <span className={`badge ${articleTypeClass(a.type)}`}>{articleTypeLabel(a.type)}</span>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '.3rem' }} onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => { openEdit(a) }} title="Sửa">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                  </button>
                  <button className="btn-icon danger" style={{ width: 26, height: 26 }} onClick={() => remove(a)} title="Xóa">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9"/></svg>
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '.35rem', color: 'var(--tx)' }}>{a.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--mu)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '.5rem' }}>
              {a.content}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>{fmtDate(a.created_at)} · {a.profiles?.full_name}</div>
          </div>
        ))}
        {articles.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7"/></svg>
            <p>Chưa có bài viết nào</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editArt ? 'Sửa bài viết' : 'Thêm bài viết'}
        maxWidth={480}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !title.trim()}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="fg">
          <label>Loại</label>
          <select value={type} onChange={e => setType(e.target.value as ArticleType)}>
            <option value="policy">Nội quy</option>
            <option value="product">Kiến thức SP</option>
            <option value="training">Đào tạo</option>
          </select>
        </div>
        <div className="fg">
          <label>Tiêu đề *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề bài viết" />
        </div>
        <div className="fg">
          <label>Nội dung</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Nội dung..." style={{ minHeight: 120 }} />
        </div>
        <div className="fg">
          <label>Hình ảnh minh họa</label>
          <div className="upload-zone">
            <input type="file" accept="image/*" multiple onChange={e => e.target.files && setNewImgs(v => [...v, ...Array.from(e.target.files!)])} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            <p>Click hoặc kéo thả ảnh minh họa</p>
          </div>
          <div className="preview-grid">
            {existingImgs.map((url, i) => (
              <div key={i} className="preview-item">
                <img src={url} alt="" />
                <button className="preview-remove" onClick={() => setExistingImgs(v => v.filter((_, idx) => idx !== i))}>×</button>
              </div>
            ))}
            {newImgs.map((f, i) => (
              <div key={`n${i}`} className="preview-item">
                <img src={URL.createObjectURL(f)} alt="" />
                <button className="preview-remove" onClick={() => setNewImgs(v => v.filter((_, idx) => idx !== i))}>×</button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}
