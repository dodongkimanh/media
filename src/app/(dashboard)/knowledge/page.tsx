'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { uploadFiles, saveUrlsToMediaLibrary } from '@/lib/upload'
import type { Article, ArticleType } from '@/lib/types'
import { articleTypeLabel, articleTypeClass, fmtDate } from '@/lib/types'

function MediaLibraryPicker({ onConfirm, onClose }: {
  onConfirm: (urls: string[]) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<{ id: string; url: string; caption: string | null }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('media_items')
      .select('id, url, caption')
      .eq('type', 'image')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [])

  function toggle(url: string) {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(url)) s.delete(url); else s.add(url)
      return s
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Chọn ảnh từ Thư Viện${selected.size ? ` (${selected.size} đã chọn)` : ''}`}
      maxWidth={620}
      scrollable
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={() => onConfirm(Array.from(selected))} disabled={selected.size === 0}>
            Thêm {selected.size || ''} ảnh vào bài viết
          </button>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--mu)', fontSize: 13 }}>Đang tải thư viện...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--mu)', fontSize: 13 }}>
          Thư viện chưa có ảnh nào. Hãy tải ảnh lên trong mục Ảnh Video Tư Liệu trước.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: '.65rem' }}>
            Click để chọn/bỏ chọn ảnh. Ảnh đã chọn có viền xanh.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: '.45rem' }}>
            {items.map(it => (
              <div key={it.id} onClick={() => toggle(it.url)}
                style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden', cursor: 'pointer', border: selected.has(it.url) ? '2.5px solid var(--green)' : '2.5px solid transparent', background: 'var(--bg)', transition: 'border-color .12s' }}>
                <img src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={it.caption ?? ''} />
                {selected.has(it.url) && (
                  <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M2 5l2.5 2.5L8 3"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}

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
  const [showLibPicker, setShowLibPicker] = useState(false)
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

  const [saveError, setSaveError] = useState('')

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const uploadedImgs = newImgs.length ? await uploadFiles(newImgs, 'articles').catch(() => []) : []
      saveUrlsToMediaLibrary(uploadedImgs.map(url => ({ url, type: 'image' as const })))
      const images = [...existingImgs, ...uploadedImgs]
      const supabase = createClient()
      if (editArt) {
        const { error } = await supabase.from('articles').update({ type, title, content, images, updated_at: new Date().toISOString() }).eq('id', editArt.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('articles').insert({ type, title, content, images, created_by: profile?.id })
        if (error) throw error
      }
      setSaving(false)
      setShowModal(false)
      show('Đã lưu bài viết')
      load()
    } catch (err: unknown) {
      setSaving(false)
      const raw = err as Record<string, unknown>
      const msg = (raw?.message as string)
        || (raw?.error_description as string)
        || (err instanceof Error ? err.message : null)
        || 'Lỗi khi lưu. Vui lòng thử lại.'
      if (msg.includes('fetch') || msg.includes('URL') || msg.includes('supabase')) {
        setSaveError('Chưa kết nối Supabase. Cần cấu hình .env.local.')
      } else if (msg.includes('row-level security') || msg.includes('permission')) {
        setSaveError('Không có quyền thực hiện thao tác này. Vui lòng liên hệ admin.')
      } else {
        setSaveError(msg)
      }
    }
  }

  async function remove(a: Article) {
    if (!confirm(`Xóa bài viết "${a.title}"?`)) return
    try {
      const supabase = createClient()
      await supabase.from('articles').delete().eq('id', a.id)
      show('Đã xóa bài viết')
      if (viewArt?.id === a.id) setViewArt(null)
      load()
    } catch { show('Lỗi khi xóa', 'error') }
  }

  const filterBtns: { label: string; val: ArticleType | ''; bg: string; color: string; activeBg: string }[] = [
    { label: 'Tất cả',      val: '',         bg: 'var(--gl)',  color: 'var(--gd)', activeBg: 'var(--green)' },
    { label: 'Nội quy',     val: 'policy',   bg: '#FCEBEB',   color: '#A32D2D',   activeBg: '#E24B4A' },
    { label: 'Kiến thức SP',val: 'product',  bg: '#E1F5EE',   color: '#085041',   activeBg: 'var(--green)' },
    { label: 'Đào tạo',     val: 'training', bg: '#E6F1FB',   color: '#0C447C',   activeBg: '#378ADD' },
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
          <div style={{ fontSize: 18, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: 'var(--tx)' }}>{viewArt.content}</div>
          {viewArt.images.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {viewArt.images.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: '85%', borderRadius: 10, border: '1px solid var(--bd)', display: 'block', margin: '0 auto' }} />
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
          <button key={b.val} onClick={() => setFilter(b.val as ArticleType | '')}
            style={{
              background: filter === b.val ? b.activeBg : b.bg,
              color: filter === b.val ? '#fff' : b.color,
              border: 'none', borderRadius: 20, padding: '.28rem .75rem',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s'
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gap: '.7rem', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', padding: '1rem 1.2rem' }}>
        {articles.map(a => (
          <div key={a.id}
            style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', cursor: 'pointer', transition: 'all .15s', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(29,158,117,.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            {a.images.length > 0 && (
              <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', flexShrink: 0 }} onClick={() => setViewArt(a)}>
                <img src={a.images[0]} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ padding: '1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column' }} onClick={() => setViewArt(a)}>
              <span className={`badge ${articleTypeClass(a.type)}`} style={{ alignSelf: 'flex-start', marginBottom: '.5rem' }}>{articleTypeLabel(a.type)}</span>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '.35rem', color: 'var(--tx)' }}>{a.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--mu)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '.5rem', flex: 1 }}>
                {a.content}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>{fmtDate(a.created_at)}</div>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: '.5rem', padding: '.65rem 1.1rem', borderTop: '1px solid var(--bd)' }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(a)}>Sửa</button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(a)}>Xóa</button>
              </div>
            )}
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
        confirmClose={!saving}
        maxWidth={480}
        footer={
          <>
            {saveError && <div style={{ flex: 1, fontSize: 12, color: 'var(--red)', background: '#FEF0F0', border: '1px solid #F7C1C1', borderRadius: 8, padding: '.4rem .75rem', marginRight: '.5rem' }}>{saveError}</div>}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.35rem' }}>
            <label style={{ margin: 0 }}>Hình ảnh minh họa</label>
            <button type="button" onClick={() => setShowLibPicker(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', border: '1px solid var(--green)', borderRadius: 6, padding: '.18rem .55rem', fontSize: 11.5, fontWeight: 600, color: 'var(--green)', background: 'var(--gl)', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
              Chọn từ Thư Viện
            </button>
          </div>
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

      {showLibPicker && (
        <MediaLibraryPicker
          onConfirm={urls => { setExistingImgs(v => [...v, ...urls.filter(u => !v.includes(u))]); setShowLibPicker(false) }}
          onClose={() => setShowLibPicker(false)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}
