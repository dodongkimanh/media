'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { uploadFile, saveUrlsToMediaLibrary } from '@/lib/upload'
import type { Article, ArticleBlock, ArticleType } from '@/lib/types'
import { articleTypeLabel, articleTypeClass, fmtDate } from '@/lib/types'

function articleBlocks(a: Article): ArticleBlock[] {
  if (a.blocks && a.blocks.length > 0) return a.blocks
  const blocks: ArticleBlock[] = []
  if (a.content) blocks.push({ type: 'text', text: a.content })
  for (const url of a.images ?? []) blocks.push({ type: 'image', url, caption: '' })
  return blocks
}

function MediaLibraryPicker({ onConfirm, onClose }: {
  onConfirm: (item: { url: string; type: 'image' | 'video' }) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<{ id: string; url: string; type: 'image' | 'video'; caption: string | null }[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('media_items')
      .select('id, url, type, caption')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [])

  const selectedItem = items.find(it => it.url === selected)

  return (
    <Modal
      open
      onClose={onClose}
      title="Chọn ảnh / video từ Thư Viện"
      maxWidth={620}
      scrollable
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={() => selectedItem && onConfirm({ url: selectedItem.url, type: selectedItem.type })} disabled={!selectedItem}>
            Chèn vào bài viết
          </button>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--mu)', fontSize: 13 }}>Đang tải thư viện...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--mu)', fontSize: 13 }}>
          Thư viện chưa có ảnh/video nào. Hãy tải lên trong mục Ảnh Video Tư Liệu trước.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: '.65rem' }}>
            Click để chọn ảnh hoặc video. Mục đã chọn có viền xanh.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: '.45rem' }}>
            {items.map(it => (
              <div key={it.id} onClick={() => setSelected(it.url)}
                style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden', cursor: 'pointer', border: selected === it.url ? '2.5px solid var(--green)' : '2.5px solid transparent', background: 'var(--bg)', transition: 'border-color .12s' }}>
                {it.type === 'video' ? (
                  <video src={it.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <img src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={it.caption ?? ''} />
                )}
                {it.type === 'video' && (
                  <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>VIDEO</div>
                )}
                {selected === it.url && (
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
  const [blocks, setBlocks] = useState<ArticleBlock[]>([])
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [libPickerIndex, setLibPickerIndex] = useState<number | null>(null)
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

  function openAdd() { setEditArt(null); setType('policy'); setTitle(''); setBlocks([{ type: 'text', text: '' }]); setShowModal(true) }
  function openEdit(a: Article) { setEditArt(a); setType(a.type); setTitle(a.title); setBlocks(articleBlocks(a)); setShowModal(true) }

  function addTextBlock() { setBlocks(v => [...v, { type: 'text', text: '' }]) }
  function addMediaBlock() { setBlocks(v => [...v, { type: 'image', url: '', caption: '' }]) }
  function updateBlock(i: number, patch: Partial<ArticleBlock>) { setBlocks(v => v.map((b, idx) => idx === i ? { ...b, ...patch } : b)) }
  function removeBlock(i: number) { setBlocks(v => v.filter((_, idx) => idx !== i)) }
  function moveBlock(i: number, dir: -1 | 1) {
    setBlocks(v => {
      const j = i + dir
      if (j < 0 || j >= v.length) return v
      const copy = [...v]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  async function handleBlockFile(i: number, file: File) {
    setUploadingIdx(i)
    setUploadStatus('Đang tải lên...')
    try {
      let f = file
      const isVid = file.type.startsWith('video/')
      if (isVid) {
        const { convertVideoToH264 } = await import('@/lib/videoConvert')
        f = await convertVideoToH264(file, pct => setUploadStatus(`Đang chuyển đổi video... ${pct}%`))
        setUploadStatus('Đang tải lên...')
      }
      const url = await uploadFile(f, 'articles')
      saveUrlsToMediaLibrary([{ url, type: isVid ? 'video' : 'image' }])
      updateBlock(i, { type: isVid ? 'video' : 'image', url })
    } catch {
      show('Lỗi khi tải lên tệp', 'error')
    } finally {
      setUploadingIdx(null)
      setUploadStatus('')
    }
  }

  const [saveError, setSaveError] = useState('')

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const cleanBlocks = blocks.filter(b => b.type === 'text' ? !!b.text?.trim() : !!b.url)
      const content = cleanBlocks.filter(b => b.type === 'text').map(b => b.text).join('\n\n')
      const images = cleanBlocks.filter(b => b.type === 'image').map(b => b.url!)
      const supabase = createClient()
      if (editArt) {
        const { error } = await supabase.from('articles').update({ type, title, content, images, blocks: cleanBlocks, updated_at: new Date().toISOString() }).eq('id', editArt.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('articles').insert({ type, title, content, images, blocks: cleanBlocks, created_by: profile?.id })
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {articleBlocks(viewArt).map((b, i) => {
              if (b.type === 'text') {
                return b.text ? (
                  <div key={i} style={{ fontSize: 18, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: 'var(--tx)' }}>{b.text}</div>
                ) : null
              }
              if (!b.url) return null
              return (
                <figure key={i} style={{ margin: 0, width: '85%', marginLeft: 'auto', marginRight: 'auto' }}>
                  {b.type === 'video' ? (
                    <video src={b.url} controls style={{ width: '100%', borderRadius: 10, border: '1px solid var(--bd)', display: 'block', background: '#000' }} />
                  ) : (
                    <img src={b.url} alt={b.caption ?? ''} style={{ width: '100%', borderRadius: 10, border: '1px solid var(--bd)', display: 'block' }} />
                  )}
                  {b.caption && (
                    <figcaption style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--mu)', marginTop: '.4rem' }}>{b.caption}</figcaption>
                  )}
                </figure>
              )
            })}
          </div>
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
        maxWidth={600}
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
          <label>Nội dung bài viết</label>
          <div style={{ fontSize: 11.5, color: 'var(--mu)', marginBottom: '.55rem' }}>
            Ghép xen kẽ các đoạn văn bản với ảnh/video theo thứ tự bạn muốn hiển thị. Mỗi ảnh/video có thể đặt tiêu đề riêng.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {blocks.map((b, i) => (
              <div key={i} style={{ border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.65rem .75rem', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    {b.type === 'text' ? 'Văn bản' : b.type === 'video' ? 'Video' : 'Ảnh'}
                  </span>
                  <div style={{ display: 'flex', gap: '.3rem' }}>
                    <button type="button" className="btn-icon" style={{ width: 26, height: 26 }} disabled={i === 0} onClick={() => moveBlock(i, -1)} title="Di chuyển lên">↑</button>
                    <button type="button" className="btn-icon" style={{ width: 26, height: 26 }} disabled={i === blocks.length - 1} onClick={() => moveBlock(i, 1)} title="Di chuyển xuống">↓</button>
                    <button type="button" className="btn-icon danger" style={{ width: 26, height: 26 }} onClick={() => removeBlock(i)} title="Xóa">×</button>
                  </div>
                </div>

                {b.type === 'text' ? (
                  <textarea value={b.text ?? ''} onChange={e => updateBlock(i, { text: e.target.value })} placeholder="Nội dung văn bản..." style={{ minHeight: 90 }} />
                ) : b.url ? (
                  <div>
                    {b.type === 'video' ? (
                      <video src={b.url} controls style={{ width: '100%', maxHeight: 180, borderRadius: 8, display: 'block', background: '#000' }} />
                    ) : (
                      <img src={b.url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, display: 'block' }} />
                    )}
                    <input value={b.caption ?? ''} onChange={e => updateBlock(i, { caption: e.target.value })} placeholder="Tiêu đề ảnh/video (hiển thị bên dưới)"
                      style={{ marginTop: '.5rem', width: '100%', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.5rem .7rem', fontSize: 13, fontFamily: 'inherit', color: 'var(--tx)', background: 'var(--sf)' }} />
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '.4rem' }} onClick={() => updateBlock(i, { url: '' })}>Thay ảnh/video khác</button>
                  </div>
                ) : uploadingIdx === i ? (
                  <div style={{ textAlign: 'center', padding: '1rem', fontSize: 12, color: 'var(--mu)' }}>{uploadStatus || 'Đang tải lên...'}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    <div className="upload-zone" style={{ padding: '.75rem' }}>
                      <input type="file" accept="image/*,video/*" onChange={e => e.target.files?.[0] && handleBlockFile(i, e.target.files[0])} />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      <p>Click hoặc kéo thả ảnh/video</p>
                    </div>
                    <button type="button" onClick={() => setLibPickerIndex(i)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', alignSelf: 'flex-start', border: '1px solid var(--green)', borderRadius: 6, padding: '.22rem .6rem', fontSize: 11.5, fontWeight: 600, color: 'var(--green)', background: 'var(--gl)', cursor: 'pointer' }}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
                      Chọn từ Thư Viện
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.65rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addTextBlock}>+ Đoạn văn bản</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addMediaBlock}>+ Ảnh / Video</button>
          </div>
        </div>
      </Modal>

      {libPickerIndex !== null && (
        <MediaLibraryPicker
          onConfirm={item => { updateBlock(libPickerIndex, { type: item.type, url: item.url }); setLibPickerIndex(null) }}
          onClose={() => setLibPickerIndex(null)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}
