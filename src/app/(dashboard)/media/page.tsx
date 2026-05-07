'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { uploadFiles, uploadFile } from '@/lib/upload'
import { Lightbox } from '@/components/ui/Lightbox'
import type { MediaAlbum, MediaItem, MediaCategory } from '@/lib/types'
import { mediaCatLabel, fmtDate } from '@/lib/types'

export default function MediaPage() {
  const { profile, isAdmin } = useAuth()
  const [albums, setAlbums] = useState<MediaAlbum[]>([])
  const [filter, setFilter] = useState<MediaCategory | ''>('')
  const [viewAlbum, setViewAlbum] = useState<MediaAlbum | null>(null)
  const [albumItems, setAlbumItems] = useState<MediaItem[]>([])
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [editAlbum, setEditAlbum] = useState<MediaAlbum | null>(null)
  const [lightbox, setLightbox] = useState<{ items: { url: string; type?: 'image' | 'video' }[]; idx: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const { toast, show, clear } = useToast()

  async function loadAlbums() {
    const supabase = createClient()
    let q = supabase.from('media_albums').select('*, profiles(*), media_items(*)').order('created_at', { ascending: false })
    if (filter) q = q.eq('category', filter)
    const { data } = await q
    setAlbums(data ?? [])
  }

  async function loadAlbumItems(albumId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('media_items').select('*').eq('album_id', albumId).order('sort_order')
    setAlbumItems(data ?? [])
  }

  useEffect(() => { loadAlbums() }, [filter])

  async function openAlbum(album: MediaAlbum) {
    setViewAlbum(album)
    await loadAlbumItems(album.id)
  }

  async function uploadMediaToAlbum(files: File[]) {
    if (!viewAlbum || !files.length) return
    setUploading(true)
    const supabase = createClient()
    for (const file of files) {
      const isVid = file.type.startsWith('video/')
      const url = await uploadFile(file, 'media', viewAlbum.id)
      await supabase.from('media_items').insert({
        album_id: viewAlbum.id, url, type: isVid ? 'video' : 'image',
        sort_order: albumItems.length
      })
    }
    setUploading(false)
    show('Đã tải lên thành công')
    loadAlbumItems(viewAlbum.id)
    loadAlbums()
  }

  async function deleteItem(item: MediaItem) {
    if (!confirm('Xóa ảnh/video này?')) return
    const supabase = createClient()
    await supabase.from('media_items').delete().eq('id', item.id)
    setAlbumItems(v => v.filter(i => i.id !== item.id))
    show('Đã xóa')
  }

  async function updateCaption(item: MediaItem, caption: string) {
    const supabase = createClient()
    await supabase.from('media_items').update({ caption }).eq('id', item.id)
    setAlbumItems(v => v.map(i => i.id === item.id ? { ...i, caption } : i))
  }

  async function deleteAlbum(album: MediaAlbum) {
    if (!confirm(`Xóa album "${album.title}"? Tất cả ảnh/video sẽ bị xóa.`)) return
    const supabase = createClient()
    await supabase.from('media_albums').delete().eq('id', album.id)
    setViewAlbum(null)
    show('Đã xóa album')
    loadAlbums()
  }

  const filterBtns = [
    { label: 'Tất cả', val: '' as MediaCategory | '' },
    { label: 'Tư Liệu Xưởng', val: 'xuong' as MediaCategory },
    { label: 'Feedback KH', val: 'feedback' as MediaCategory },
    { label: 'Tổng Hợp', val: 'tonghop' as MediaCategory },
  ]

  if (viewAlbum) {
    const lbItems = albumItems.map(i => ({ url: i.url, type: i.type as 'image' | 'video' }))
    return (
      <div>
        <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--mu)', cursor: 'pointer', marginBottom: '.2rem' }} onClick={() => setViewAlbum(null)}>
              <span style={{ color: 'var(--green)' }}>← Ảnh Video Tư Liệu</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{viewAlbum.title}</div>
          </div>
          <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewAlbum(null)}>← Quay lại</button>
            {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => { setEditAlbum(viewAlbum); setShowAlbumModal(true) }}>Sửa thông tin</button>}
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => deleteAlbum(viewAlbum)}>Xóa album</button>}
          </div>
        </div>

        <div style={{ padding: '1.2rem' }}>
          {viewAlbum.description && <p style={{ fontSize: 13.5, color: 'var(--mu)', marginBottom: '1rem' }}>{viewAlbum.description}</p>}

          {isAdmin && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                border: `2px dashed ${uploading ? 'var(--green)' : 'var(--bd)'}`, borderRadius: 'var(--r)',
                padding: '.75rem 1.25rem', cursor: 'pointer', transition: 'all .2s',
                fontSize: 13, fontWeight: 600, color: 'var(--green)', position: 'relative'
              }}>
                <input type="file" accept="image/*,video/*" multiple style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  onChange={e => e.target.files && uploadMediaToAlbum(Array.from(e.target.files))}
                  disabled={uploading}
                />
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 11V3M5 6l3-3 3 3"/><path d="M2 13h12"/></svg>
                {uploading ? 'Đang tải lên...' : 'Thêm ảnh / video'}
              </label>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '.7rem' }}>
            {albumItems.map((item, idx) => (
              <div key={item.id} style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <div className="mi-thumb" style={{ borderTopLeftRadius: 'var(--r)', borderTopRightRadius: 'var(--r)' }}
                  onClick={() => setLightbox({ items: lbItems, idx })}
                >
                  {item.type === 'video'
                    ? <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={item.url} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                  }
                  {item.type === 'video' && <span className="mi-vid-badge">VIDEO</span>}
                </div>
                <div style={{ padding: '.45rem .55rem' }}>
                  <input
                    defaultValue={item.caption}
                    onBlur={e => updateCaption(item, e.target.value)}
                    placeholder="Chú thích..."
                    readOnly={!isAdmin}
                    style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 12, color: 'var(--tx)', outline: 'none', cursor: isAdmin ? 'text' : 'default' }}
                  />
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '.28rem', padding: '.42rem .55rem', borderTop: '1px solid var(--bd)', background: 'var(--bg)' }}>
                    <button className="btn-icon danger" style={{ width: 28, height: 28 }} onClick={() => deleteItem(item)} title="Xóa">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9"/></svg>
                    </button>
                    <a href={item.url} download className="btn-icon" style={{ width: 28, height: 28, textDecoration: 'none' }} title="Tải về">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v8M5 8l3 3 3-3"/><path d="M2 13h12"/></svg>
                    </a>
                  </div>
                )}
              </div>
            ))}
            {albumItems.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                <p>Album chưa có ảnh/video</p>
              </div>
            )}
          </div>
        </div>

        {lightbox && <Lightbox items={lightbox.items} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />}
        {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
        {showAlbumModal && (
          <AlbumModal
            album={editAlbum}
            profileId={profile?.id ?? ''}
            onClose={() => setShowAlbumModal(false)}
            onSaved={async (id) => {
              setShowAlbumModal(false)
              await loadAlbums()
              if (viewAlbum && id) {
                const supabase = createClient()
                const { data } = await supabase.from('media_albums').select('*, profiles(*), media_items(*)').eq('id', id).single()
                if (data) setViewAlbum(data)
              }
              show('Đã lưu album')
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Ảnh Video Tư Liệu</div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditAlbum(null); setShowAlbumModal(true) }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
            Tạo album
          </button>
        )}
      </div>

      <div style={{ padding: '.6rem 1.2rem', display: 'flex', gap: '.45rem', flexWrap: 'wrap', background: 'var(--sf)', borderBottom: '1px solid var(--bd)' }}>
        {filterBtns.map(b => (
          <button key={b.val} onClick={() => setFilter(b.val)}
            style={{ border: 'none', borderRadius: 20, padding: '.28rem .75rem', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === b.val ? 'var(--green)' : 'var(--gl)', color: filter === b.val ? '#fff' : 'var(--gd)' }}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '.85rem', padding: '1rem 1.2rem' }}>
        {albums.map(album => {
          const cover = album.media_items?.[0]?.url ?? album.cover_url
          const count = album.media_items?.length ?? 0
          return (
            <div key={album.id} onClick={() => openAlbum(album)}
              style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--rl)', overflow: 'hidden', cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(29,158,117,.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
            >
              <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cover
                  ? <img src={cover} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1" style={{ opacity: .35 }}>
                      <path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                  )
                }
                <span style={{ position: 'absolute', top: '.5rem', right: '.5rem', background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '.15rem .5rem' }}>
                  {count} ảnh/video
                </span>
              </div>
              <div style={{ padding: '.85rem' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '.3rem', lineHeight: 1.35 }}>{album.title}</div>
                {album.description && <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: '.5rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{album.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--mu)' }}>
                  <span className={`badge ${album.category === 'xuong' ? 'badge-green' : album.category === 'feedback' ? 'badge-blue' : 'badge-amber'}`}>{mediaCatLabel(album.category)}</span>
                  <span>{fmtDate(album.created_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
        {albums.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            <p>Chưa có album nào</p>
          </div>
        )}
      </div>

      {showAlbumModal && (
        <AlbumModal
          album={editAlbum}
          profileId={profile?.id ?? ''}
          onClose={() => setShowAlbumModal(false)}
          onSaved={() => { setShowAlbumModal(false); loadAlbums(); show('Đã lưu album') }}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}

function AlbumModal({ album, profileId, onClose, onSaved }: {
  album: MediaAlbum | null; profileId: string
  onClose: () => void; onSaved: (id?: string) => void
}) {
  const [title, setTitle] = useState(album?.title ?? '')
  const [desc, setDesc] = useState(album?.description ?? '')
  const [cat, setCat] = useState<MediaCategory>(album?.category ?? 'tonghop')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const supabase = createClient()
    if (album) {
      await supabase.from('media_albums').update({ title, description: desc, category: cat }).eq('id', album.id)
      setSaving(false)
      onSaved(album.id)
    } else {
      const { data } = await supabase.from('media_albums').insert({ title, description: desc, category: cat, created_by: profileId }).select().single()
      setSaving(false)
      onSaved(data?.id)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={album ? 'Sửa thông tin album' : 'Tạo album mới'}
      maxWidth={420}
      scrollable={false}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !title.trim()}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="fg">
        <label>Tiêu đề album *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên album..." />
      </div>
      <div className="fg">
        <label>Danh mục</label>
        <select value={cat} onChange={e => setCat(e.target.value as MediaCategory)}>
          <option value="xuong">Tư Liệu Xưởng</option>
          <option value="feedback">Feedback Khách Hàng</option>
          <option value="tonghop">Tổng Hợp</option>
        </select>
      </div>
      <div className="fg">
        <label>Mô tả</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn về album..." style={{ minHeight: 70 }} />
      </div>
    </Modal>
  )
}
