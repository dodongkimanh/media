'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lightbox } from '@/components/ui/Lightbox'
import type { MediaItem, MediaType } from '@/lib/types'
import { mediaCatLabel } from '@/lib/types'

const PAGE_SIZE = 60

interface ProductRef {
  id: string
  name: string
  category_id: string | null
  images: string[]
  videos: string[]
  feedback_media: string[]
  related_media: string[]
  categories?: { name: string }
}

interface ProductMatch {
  productId: string
  productName: string
  categoryId: string
  categoryName: string
}

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [products, setProducts] = useState<ProductRef[]>([])
  const [filter, setFilter] = useState<MediaType | ''>('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const loadItems = useCallback(async (reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true)
    const supabase = createClient()
    const from = reset ? 0 : items.length
    let q = supabase.from('media_items').select('*, media_albums(title, category)').order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    if (filter) q = q.eq('type', filter)
    const { data } = await q
    setItems(prev => reset ? (data ?? []) : [...prev, ...(data ?? [])])
    setHasMore((data ?? []).length === PAGE_SIZE)
    if (reset) setLoading(false); else setLoadingMore(false)
  }, [filter, items.length])

  useEffect(() => { loadItems(true) }, [filter])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('products').select('id, name, category_id, images, videos, feedback_media, related_media, categories(name)').then(({ data }) => {
      setProducts((data ?? []) as unknown as ProductRef[])
    })
  }, [])

  const productByUrl = useMemo(() => {
    const map = new Map<string, ProductMatch>()
    for (const p of products) {
      if (!p.category_id) continue
      const urls = [...(p.images ?? []), ...(p.videos ?? []), ...(p.feedback_media ?? []), ...(p.related_media ?? [])]
      for (const url of urls) {
        if (!map.has(url)) {
          map.set(url, { productId: p.id, productName: p.name, categoryId: p.category_id, categoryName: p.categories?.name ?? '' })
        }
      }
    }
    return map
  }, [products])

  const filterBtns = [
    { label: 'Tất cả', val: '' as MediaType | '' },
    { label: 'Ảnh', val: 'image' as MediaType },
    { label: 'Video', val: 'video' as MediaType },
  ]

  const lbItems = items.map(item => {
    const match = productByUrl.get(item.url)
    const album = item.media_albums
    const info = match ? (
      <span>
        📦 Sản phẩm: <strong>{match.productName}</strong>
        {match.categoryName && <> · Danh mục: {match.categoryName}</>}
        {' '}
        <Link href={`/products/${match.categoryId}?pid=${match.productId}`} style={{ color: '#4ade80', textDecoration: 'underline' }}>
          Xem sản phẩm →
        </Link>
      </span>
    ) : album ? (
      <span>Album: <strong>{album.title}</strong> · {mediaCatLabel(album.category)}</span>
    ) : undefined
    return { url: item.url, type: item.type as 'image' | 'video', info }
  })

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
              {items.map((item, idx) => {
                const match = productByUrl.get(item.url)
                return (
                  <div key={item.id} className="mi-thumb" style={{ borderRadius: 'var(--r)', border: '1px solid var(--bd)', position: 'relative' }}
                    onClick={() => setLightboxIdx(idx)}
                  >
                    {item.type === 'video'
                      ? <video src={`${item.url}#t=0.001`} preload="metadata" muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={item.url} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                    }
                    {item.type === 'video' && <span className="mi-vid-badge">VIDEO</span>}
                    {match && (
                      <span style={{ position: 'absolute', bottom: 6, left: 6, right: 6, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10.5, fontWeight: 600, padding: '.2rem .4rem', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {match.productName}
                      </span>
                    )}
                  </div>
                )
              })}
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
