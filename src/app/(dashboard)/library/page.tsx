'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lightbox } from '@/components/ui/Lightbox'
import type { MediaItem, MediaType } from '@/lib/types'

const PAGE_SIZE = 60

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [filter, setFilter] = useState<MediaType | ''>('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const loadItems = useCallback(async (reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true)
    const supabase = createClient()
    const from = reset ? 0 : items.length
    let q = supabase.from('media_items').select('*').order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    if (filter) q = q.eq('type', filter)
    const { data } = await q
    setItems(prev => reset ? (data ?? []) : [...prev, ...(data ?? [])])
    setHasMore((data ?? []).length === PAGE_SIZE)
    if (reset) setLoading(false); else setLoadingMore(false)
  }, [filter, items.length])

  useEffect(() => { loadItems(true) }, [filter])

  const filterBtns = [
    { label: 'Tất cả', val: '' as MediaType | '' },
    { label: 'Ảnh', val: 'image' as MediaType },
    { label: 'Video', val: 'video' as MediaType },
  ]

  const lbItems = items.map(i => ({ url: i.url, type: i.type as 'image' | 'video' }))

  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Thư Viện</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: '.1rem' }}>Toàn bộ ảnh và video — mọi người đều xem được</div>
        </div>
      </div>

      <div style={{ padding: '.6rem 1.2rem', display: 'flex', gap: '.45rem', flexWrap: 'wrap', background: 'var(--sf)', borderBottom: '1px solid var(--bd)' }}>
        {filterBtns.map(b => (
          <button key={b.val} onClick={() => setFilter(b.val)}
            style={{ borderRadius: 20, padding: '.28rem .75rem', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: filter === b.val ? 'var(--green)' : '#E1F5EE', color: filter === b.val ? '#fff' : '#085041' }}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '1rem 1.2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--mu)', fontSize: 13 }}>Đang tải thư viện...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            <p>Thư viện chưa có ảnh/video nào</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '.7rem' }}>
              {items.map((item, idx) => (
                <div key={item.id} className="mi-thumb" style={{ borderRadius: 'var(--r)', border: '1px solid var(--bd)' }}
                  onClick={() => setLightboxIdx(idx)}
                >
                  {item.type === 'video'
                    ? <video src={`${item.url}#t=0.001`} preload="metadata" muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={item.url} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                  }
                  {item.type === 'video' && <span className="mi-vid-badge">VIDEO</span>}
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '1.1rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => loadItems(false)} disabled={loadingMore}>
                  {loadingMore ? 'Đang tải...' : 'Tải thêm'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {lightboxIdx !== null && (
        <Lightbox items={lbItems} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  )
}
