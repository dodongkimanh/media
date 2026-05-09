'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { uploadFile, deleteStorageFile } from '@/lib/upload'
import { Lightbox } from '@/components/ui/Lightbox'
import type { MediaAlbum, MediaItem, MediaCategory } from '@/lib/types'
import { mediaCatLabel, mediaCatClass, fmtDate } from '@/lib/types'

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
  const [shareOpenId, setShareOpenId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const { toast, show, clear } = useToast()

  async function downloadFile(url: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'file')
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(a.href), 100)
    } catch { window.open(url, '_blank') }
  }

  function shareToFacebook(url: string) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }

  async function shareToZalo(url: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const rawName = url.split('/').pop()?.split('?')[0] ?? 'image.jpg'
      const isVideo = /\.(mp4|mov|webm|avi)$/i.test(rawName)
      const title = isVideo ? 'Video' : 'Ảnh'
      const file = new File([blob], rawName, { type: blob.type || 'image/jpeg' })

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title })
        return
      }
      if (navigator.share) {
        await navigator.share({ url, title })
        return
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
    }
    navigator.clipboard.writeText(url).then(() => show('Đã sao chép link. Mở Zalo → Nhắn tin → Dán link để gửi'))
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => show('Đã sao chép link'))
  }

  async function loadAlbums() {
    const supabase = createClient()
    let q = supabase.from('media_albums').select('*, profiles(*), media_items(*)').neq('title', 'Ảnh & Video Sản Phẩm').order('created_at', { ascending: false })
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
    await deleteStorageFile(item.url)
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
    { label: 'Tất cả', val: '' as MediaCategory | '', bg: '#E1F5EE', color: '#085041', activeBg: 'var(--green)', activeColor: '#fff' },
    { label: 'Tư Liệu Xưởng', val: 'xuong' as MediaCategory, bg: '#EDE9FE', color: '#5B21B6', activeBg: '#7C3AED', activeColor: '#fff' },
    { label: 'Feedback KH', val: 'feedback' as MediaCategory, bg: '#E6F1FB', color: '#0C447C', activeBg: '#1D6FB5', activeColor: '#fff' },
    { label: 'Tổng Hợp', val: 'tonghop' as MediaCategory, bg: '#FEF9C3', color: '#713F12', activeBg: '#B45309', activeColor: '#fff' },
  ]

  if (viewAlbum) {
    const lbItems = albumItems.map(i => ({ url: i.url, type: i.type as 'image' | 'video' }))
    return (
      <div>
        <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--mu)', cursor: 'pointer', marginBottom: '.2rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              <span style={{ color: 'var(--green)' }} onClick={() => setViewAlbum(null)}>Ảnh Video Tư Liệu</span>
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2l4 3-4 3"/></svg>
              <span>{mediaCatLabel(viewAlbum.category)}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{viewAlbum.title}</div>
          </div>
          <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewAlbum(null)}>← Quay lại</button>
            {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => { setEditAlbum(viewAlbum); setShowAlbumModal(true) }}>Sửa thông tin</button>}
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => deleteAlbum(viewAlbum)}>Xóa album</button>}
          </div>
        </div>

        <div style={{ padding: '1rem 1.2rem' }}>
          {/* Album info row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <span className={`badge ${mediaCatClass(viewAlbum.category)}`} style={{ marginBottom: '.4rem' }}>{mediaCatLabel(viewAlbum.category)}</span>
              <div style={{ fontSize: 16, fontWeight: 700, margin: '.25rem 0 .15rem' }}>{viewAlbum.title}</div>
              {viewAlbum.description && <div style={{ fontSize: 13, color: 'var(--mu)' }}>{viewAlbum.description}</div>}
              <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: '.3rem' }}>{albumItems.length} file · {fmtDate(viewAlbum.created_at)}</div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                disabled={uploading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                  background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 'var(--r)',
                  padding: '.42rem .9rem', cursor: 'pointer', transition: 'all .2s',
                  fontSize: 13, fontWeight: 600, flexShrink: 0, opacity: uploading ? 0.7 : 1
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
                {uploading ? 'Đang tải lên...' : 'Thêm ảnh/video'}
              </button>
            )}
          </div>

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
                <div style={{ display: 'flex', gap: '.28rem', padding: '.42rem .55rem', borderTop: '1px solid var(--bd)', background: 'var(--bg)', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn-icon" style={{ width: 28, height: 28 }} title="Tải về" onClick={() => downloadFile(item.url)}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v8M5 8l3 3 3-3"/><path d="M2 13h12"/></svg>
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button className="btn-icon" style={{ width: 28, height: 28 }} title="Chia sẻ"
                      onClick={e => { e.stopPropagation(); setShareOpenId(shareOpenId === item.id ? null : item.id) }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="3" cy="8" r="1.5"/><path d="M10.5 3.9L4.5 7.1M4.5 8.9l6 3.2"/></svg>
                    </button>
                    {shareOpenId === item.id && (
                      <div style={{ position: 'absolute', bottom: '110%', right: 0, background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.3rem', display: 'flex', flexDirection: 'column', gap: '.15rem', zIndex: 200, minWidth: 155, boxShadow: '0 4px 14px rgba(0,0,0,.18)' }}
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => { shareToFacebook(item.url); setShareOpenId(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.32rem .55rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
                          Facebook
                        </button>
                        <button onClick={() => { shareToZalo(item.url); setShareOpenId(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.32rem .55rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#0068FF"><rect width="24" height="24" rx="5"/><text x="3.5" y="17" fontSize="11" fontWeight="bold" fill="#fff">Z</text></svg>
                          Zalo
                        </button>
                        <div style={{ borderTop: '1px solid var(--bd)', margin: '.15rem 0' }} />
                        <button onClick={() => { copyLink(item.url); setShareOpenId(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.32rem .55rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4"/><path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12"/></svg>
                          Sao chép link
                        </button>
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <button className="btn-icon danger" style={{ width: 28, height: 28 }} onClick={() => deleteItem(item)} title="Xóa">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9"/></svg>
                    </button>
                  )}
                </div>
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

        {shareOpenId && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShareOpenId(null)} />}
        {lightbox && <Lightbox items={lightbox.items} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />}
        {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
        {showAddModal && viewAlbum && (
          <AddMediaModal
            album={viewAlbum}
            existingItems={albumItems}
            onClose={() => setShowAddModal(false)}
            onSaved={async () => {
              setShowAddModal(false)
              await loadAlbumItems(viewAlbum.id)
              loadAlbums()
              show('Đã thêm ảnh/video thành công')
            }}
          />
        )}
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
            style={{ borderRadius: 20, padding: '.28rem .75rem', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: filter === b.val ? b.activeBg : b.bg, color: filter === b.val ? b.activeColor : b.color }}
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
                  <span className={`badge ${mediaCatClass(album.category)}`}>{mediaCatLabel(album.category)}</span>
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

function AddMediaModal({ album, existingItems, onClose, onSaved }: {
  album: MediaAlbum; existingItems: MediaItem[]
  onClose: () => void; onSaved: () => void
}) {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [libItems, setLibItems] = useState<MediaItem[]>([])
  const [libSelected, setLibSelected] = useState<Set<string>>(new Set())
  const [libLoading, setLibLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadLib() }, [])

  async function loadLib() {
    setLibLoading(true)
    const supabase = createClient()
    const existing = new Set(existingItems.map(i => i.url))
    const { data } = await supabase.from('media_items').select('*').order('created_at', { ascending: false }).limit(400)
    const seen = new Set<string>()
    const unique = (data ?? []).filter(it => {
      if (existing.has(it.url) || seen.has(it.url)) return false
      seen.add(it.url)
      return true
    })
    setLibItems(unique)
    setLibLoading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const arr = Array.from(files)
    setNewFiles(prev => [...prev, ...arr])
    arr.forEach(f => {
      if (f.type.startsWith('image/')) {
        const r = new FileReader()
        r.onload = ev => setNewPreviews(prev => [...prev, ev.target?.result as string])
        r.readAsDataURL(f)
      } else {
        setNewPreviews(prev => [...prev, ''])
      }
    })
    e.target.value = ''
  }

  function removeFile(i: number) {
    setNewFiles(prev => prev.filter((_, idx) => idx !== i))
    setNewPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  function toggleLib(id: string) {
    setLibSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const baseOrder = existingItems.length
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]
      const isVid = file.type.startsWith('video/')
      const url = await uploadFile(file, 'media', album.id)
      await supabase.from('media_items').insert({ album_id: album.id, url, type: isVid ? 'video' : 'image', sort_order: baseOrder + i })
    }
    const libArr = libItems.filter(it => libSelected.has(it.id))
    for (let i = 0; i < libArr.length; i++) {
      const it = libArr[i]
      await supabase.from('media_items').insert({ album_id: album.id, url: it.url, type: it.type, caption: it.caption, sort_order: baseOrder + newFiles.length + i })
    }
    setSaving(false)
    onSaved()
  }

  const totalSelected = newFiles.length + libSelected.size

  return (
    <Modal open onClose={onClose} title="Thêm ảnh/video vào album" maxWidth={520} scrollable
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || totalSelected === 0}>
            {saving ? 'Đang lưu...' : `Thêm${totalSelected ? ` (${totalSelected} file)` : ''}`}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '.2rem', background: 'var(--bg)', borderRadius: 'var(--r)', padding: '.12rem', marginBottom: '.85rem', alignSelf: 'flex-start' }}>
        {(['library', 'upload'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ border: 'none', borderRadius: 'calc(var(--r) - 2px)', padding: '.25rem .75rem', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: activeTab === t ? 'var(--sf)' : 'transparent', color: activeTab === t ? 'var(--tx)' : 'var(--mu)', boxShadow: activeTab === t ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}
          >{t === 'upload' ? '⬆ Tải lên từ máy' : '🖼 Chọn từ thư viện'}</button>
        ))}
      </div>

      {activeTab === 'library' && (
        <div>
          {libLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mu)', fontSize: 13 }}>Đang tải thư viện...</div>
          ) : libItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mu)', fontSize: 13 }}>Tất cả ảnh/video đã có trong album này</div>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: 'var(--mu)', marginBottom: '.5rem' }}>
                {libItems.length} ảnh/video chưa có trong album — đã chọn <strong>{libSelected.size}</strong>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.5rem', background: 'var(--bg)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: '.4rem' }}>
                  {libItems.map(it => (
                    <div key={it.id} onClick={() => toggleLib(it.id)}
                      style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden', border: libSelected.has(it.id) ? '2.5px solid var(--green)' : '2.5px solid transparent', cursor: 'pointer', background: 'var(--sf)' }}>
                      {it.type === 'video'
                        ? <video src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <img src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={it.caption} />
                      }
                      {it.type === 'video' && (
                        <span style={{ position: 'absolute', bottom: 2, left: 2, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3 }}>VIDEO</span>
                      )}
                      {libSelected.has(it.id) && (
                        <div style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M2 5l2.5 2.5L8 3"/></svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div>
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.4rem', border: '1.5px dashed var(--bd)', borderRadius: 'var(--r)', padding: '1.2rem', cursor: 'pointer', position: 'relative', textAlign: 'center', background: 'var(--bg)' }}>
            <input type="file" accept="image/*,video/*" multiple style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={handleFileChange} />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span style={{ fontSize: 12.5, color: 'var(--mu)' }}>Chọn ảnh/video từ thiết bị</span>
          </label>
          {newPreviews.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(75px,1fr))', gap: '.4rem', marginTop: '.55rem' }}>
              {newPreviews.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', background: 'var(--bg)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--bd)' }}>
                  {p ? <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div>
                  }
                  <button onClick={() => removeFile(i)} style={{ position: 'absolute', top: 2, right: 2, width: 17, height: 17, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
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
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>(album ? 'library' : 'upload')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [libItems, setLibItems] = useState<MediaItem[]>([])
  const [libSelected, setLibSelected] = useState<Set<string>>(new Set())
  const [libLoading, setLibLoading] = useState(false)
  const [existingUrls, setExistingUrls] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!album) return
    loadLib()
  }, [])

  async function loadLib(force = false) {
    if (libItems.length && !force) return
    setLibLoading(true)
    const supabase = createClient()
    let existing = existingUrls
    if (album && existing.size === 0) {
      const { data } = await supabase.from('media_items').select('url').eq('album_id', album.id)
      existing = new Set((data ?? []).map(i => i.url))
      setExistingUrls(existing)
    }
    const { data } = await supabase.from('media_items').select('*').order('created_at', { ascending: false }).limit(400)
    const seen = new Set<string>()
    const unique = (data ?? []).filter(it => {
      if (existing.has(it.url) || seen.has(it.url)) return false
      seen.add(it.url)
      return true
    })
    setLibItems(unique)
    setLibLoading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const arr = Array.from(files)
    setNewFiles(prev => [...prev, ...arr])
    arr.forEach(f => {
      if (f.type.startsWith('image/')) {
        const r = new FileReader()
        r.onload = ev => setNewPreviews(prev => [...prev, ev.target?.result as string])
        r.readAsDataURL(f)
      } else {
        setNewPreviews(prev => [...prev, ''])
      }
    })
    e.target.value = ''
    setActiveTab('library')
    loadLib(true)
  }

  function removeFile(i: number) {
    setNewFiles(prev => prev.filter((_, idx) => idx !== i))
    setNewPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  function toggleLib(id: string) {
    setLibSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const supabase = createClient()
    let albumId: string | undefined
    if (album) {
      await supabase.from('media_albums').update({ title, description: desc, category: cat }).eq('id', album.id)
      albumId = album.id
    } else {
      const { data } = await supabase.from('media_albums').insert({ title, description: desc, category: cat, created_by: profileId }).select().single()
      albumId = data?.id
    }
    if (albumId) {
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i]
        const isVid = file.type.startsWith('video/')
        const url = await uploadFile(file, 'media', albumId)
        await supabase.from('media_items').insert({ album_id: albumId, url, type: isVid ? 'video' : 'image', sort_order: i })
      }
      const libArr = libItems.filter(it => libSelected.has(it.id))
      for (let i = 0; i < libArr.length; i++) {
        const it = libArr[i]
        await supabase.from('media_items').insert({ album_id: albumId, url: it.url, type: it.type, caption: it.caption, sort_order: newFiles.length + i })
      }
    }
    setSaving(false)
    onSaved(albumId)
  }

  const totalSelected = newFiles.length + libSelected.size

  return (
    <Modal
      open
      onClose={onClose}
      title={album ? 'Sửa thông tin album' : 'Tạo album mới'}
      maxWidth={520}
      scrollable
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !title.trim()}>
            {saving ? 'Đang lưu...' : `Lưu${totalSelected ? ` (${totalSelected} ảnh/video)` : ''}`}
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
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn về album..." style={{ minHeight: 60 }} />
      </div>

      <div style={{ marginTop: '.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.55rem' }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Thêm ảnh/video</label>
          <div style={{ display: 'flex', gap: '.2rem', background: 'var(--bg)', borderRadius: 'var(--r)', padding: '.12rem' }}>
            {(['upload', 'library'] as const).map(t => (
              <button key={t}
                onClick={() => { setActiveTab(t); if (t === 'library') loadLib() }}
                style={{ border: 'none', borderRadius: 'calc(var(--r) - 2px)', padding: '.22rem .6rem', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: activeTab === t ? 'var(--sf)' : 'transparent', color: activeTab === t ? 'var(--tx)' : 'var(--mu)', boxShadow: activeTab === t ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}
              >{t === 'upload' ? 'Tải lên' : 'Thư viện'}</button>
            ))}
          </div>
        </div>

        {activeTab === 'upload' && (
          <div>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.4rem', border: '1.5px dashed var(--bd)', borderRadius: 'var(--r)', padding: '1.1rem', cursor: 'pointer', position: 'relative', textAlign: 'center', background: 'var(--bg)', transition: 'border-color .2s' }}>
              <input type="file" accept="image/*,video/*" multiple style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={handleFileChange} />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span style={{ fontSize: 12.5, color: 'var(--mu)' }}>Chọn ảnh/video từ thiết bị hoặc thư viện ảnh</span>
            </label>
            {newPreviews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(70px,1fr))', gap: '.4rem', marginTop: '.55rem' }}>
                {newPreviews.map((p, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', background: 'var(--bg)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--bd)' }}>
                    {p ? <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div>
                    }
                    <button onClick={() => removeFile(i)} style={{ position: 'absolute', top: 2, right: 2, width: 17, height: 17, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div>
            {newFiles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#E6F4EE', border: '1px solid #A3D9C3', borderRadius: 'var(--r)', padding: '.45rem .7rem', marginBottom: '.5rem', fontSize: 12 }}>
                <span style={{ color: '#085041', fontWeight: 600 }}>
                  {newFiles.length} file từ máy tính đã chọn
                </span>
                <button onClick={() => setActiveTab('upload')} style={{ border: 'none', background: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
                  Xem lại
                </button>
              </div>
            )}
          <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.5rem', background: 'var(--bg)' }}>
            {libLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--mu)', fontSize: 13 }}>Đang tải thư viện...</div>
            ) : libItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--mu)', fontSize: 13 }}>
                {album ? 'Tất cả ảnh/video trong thư viện đã có trong album này' : 'Thư viện chưa có ảnh/video'}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11.5, color: 'var(--mu)', marginBottom: '.45rem' }}>
                  {album ? `Ảnh/video chưa có trong album (${libItems.length} file) — đã chọn ${libSelected.size}` : `Chọn từ thư viện (${libSelected.size} đã chọn)`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(70px,1fr))', gap: '.4rem' }}>
                  {libItems.map(it => (
                    <div key={it.id} onClick={() => toggleLib(it.id)} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden', border: libSelected.has(it.id) ? '2.5px solid var(--green)' : '2.5px solid transparent', cursor: 'pointer', background: 'var(--sf)' }}>
                      {it.type === 'video'
                        ? <video src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <img src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={it.caption} />
                      }
                      {it.type === 'video' && (
                        <span style={{ position: 'absolute', bottom: 2, left: 2, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3 }}>VIDEO</span>
                      )}
                      {libSelected.has(it.id) && (
                        <div style={{ position: 'absolute', top: 3, right: 3, width: 17, height: 17, background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M2 5l2.5 2.5L8 3"/></svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
