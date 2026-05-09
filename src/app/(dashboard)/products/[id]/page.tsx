'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Product } from '@/lib/types'
import { fmtPrice, statusLabel, statusClass } from '@/lib/types'
import { Lightbox } from '@/components/ui/Lightbox'
import { ProductModal } from '@/components/products/ProductModal'

export default function ProductsPage() {
  const params = useParams()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const catId = params.id as string

  const [products, setProducts] = useState<Product[]>([])
  const [catName, setCatName] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [lightbox, setLightbox] = useState<{ items: { url: string; type?: 'image' | 'video' }[]; idx: number } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  async function load() {
    const supabase = createClient()
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').eq('id', catId).single(),
      supabase.from('products').select('*, categories(*), product_specs(*)').eq('category_id', catId).order('created_at', { ascending: false })
    ])
    setCatName(catRes.data?.name ?? '')
    setProducts(prodRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [catId])

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  )

  function openProduct(p: Product) {
    setViewProduct(p)
    setSelectedProduct(p)
  }

  if (viewProduct) {
    return <ProductDetail
      product={viewProduct}
      catName={catName}
      isAdmin={isAdmin}
      onBack={() => setViewProduct(null)}
      onEdit={p => { setEditProduct(p); setShowModal(true); setViewProduct(null) }}
      onRefresh={() => { load(); setViewProduct(null) }}
    />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--mu)', display: 'flex', alignItems: 'center', gap: '.3rem', marginBottom: '.2rem' }}>
            <Link href="/" style={{ color: 'var(--green)', textDecoration: 'none' }}>Trang chủ</Link>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2l4 3-4 3"/></svg>
            <span>{catName}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{catName}</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditProduct(null); setShowModal(true) }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
            Thêm sản phẩm
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '.6rem 1.2rem', display: 'flex', gap: '.6rem', alignItems: 'center', background: 'var(--sf)', borderBottom: '1px solid var(--bd)' }}>
        <div className="search-wrap">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input placeholder="Tìm tên, mã sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '.85rem', padding: '1rem 1.2rem' }}>
        {loading && Array(6).fill(0).map((_, i) => (
          <div key={i} style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--rl)', height: 240, opacity: .4 }} />
        ))}
        {!loading && filtered.map(p => (
          <div key={p.id} className="pcard" onClick={() => openProduct(p)}>
            <div className="pthumb">
              {p.images?.[0]
                ? <img src={p.images[0]} alt={p.name} />
                : p.videos?.[0]
                  ? <video src={p.videos[0]} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--mu)', gap: '.3rem' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    </div>
                  )
              }
              <span className={`badge ${statusClass(p.status)}`} style={{ position: 'absolute', top: '.45rem', right: '.45rem' }}>
                {statusLabel(p.status)}
              </span>
            </div>
            <div style={{ padding: '.8rem' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: '.18rem', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.name}
              </div>
              {p.sku && <div style={{ fontSize: 10.5, color: 'var(--mu)', marginBottom: '.18rem' }}>Mã: {p.sku}</div>}
              {p.unit && <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: '.3rem' }}>ĐVT: {p.unit}</div>}
              {p.price_listed > 0 ? (
                <div style={{ marginTop: '.35rem' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{fmtPrice(p.price_listed)}</div>
                  {p.discount_pct > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.15rem' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF0F0', color: 'var(--red)', borderRadius: 4, padding: '.1rem .38rem' }}>-{p.discount_pct}%</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{fmtPrice(p.price_final)}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: '.1rem' }}>Chưa giảm giá</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            <p>Chưa có sản phẩm nào</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ProductModal
          product={editProduct}
          catId={catId}
          onClose={() => { setShowModal(false); setEditProduct(null) }}
          onSaved={() => { setShowModal(false); setEditProduct(null); load() }}
        />
      )}

      {lightbox && (
        <Lightbox items={lightbox.items} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

function ProductDetail({ product, catName, isAdmin, onBack, onEdit, onRefresh }: {
  product: Product; catName: string; isAdmin: boolean
  onBack: () => void; onEdit: (p: Product) => void; onRefresh: () => void
}) {
  const [mainIdx, setMainIdx] = useState(0)
  const [fbIdx, setFbIdx] = useState(0)
  const [relIdx, setRelIdx] = useState(0)
  const [lightbox, setLightbox] = useState<{ items: { url: string; type?: 'image' | 'video' }[]; idx: number } | null>(null)
  const [disc, setDisc] = useState(product.discount_pct)
  const [saving, setSaving] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

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
      const file = new File([blob], rawName, { type: blob.type || 'image/jpeg' })
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
      if (navigator.share) {
        await navigator.share({ url })
        return
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
    }
    navigator.clipboard.writeText(url)
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
  }

  type MediaItem = { url: string; type?: 'image' | 'video' }
  const allMedia: MediaItem[] = [
    ...(product.images ?? []).map(u => ({ url: u, type: 'image' as const })),
    ...(product.videos ?? []).map(u => ({ url: u, type: 'video' as const }))
  ]

  async function saveDiscount() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('products').update({ discount_pct: disc }).eq('id', product.id)
    setSaving(false)
    onRefresh()
  }

  async function deleteProduct() {
    if (!confirm(`Xóa sản phẩm "${product.name}"?`)) return
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', product.id)
    onBack()
  }

  const finalPrice = Math.round(product.price_listed * (1 - disc / 100))
  const listed = product.price_listed

  function isVideo(url: string) { return /\.(mp4|mov|webm)$/i.test(url) }

  function MediaSection({ title, urls, idx, setIdx }: { title: string; urls: string[]; idx: number; setIdx: (i: number) => void }) {
    if (!urls.length) return null
    const cur = urls[idx]
    const curIsVid = isVideo(cur)
    const mediaItems: MediaItem[] = urls.map(u => ({ url: u, type: isVideo(u) ? 'video' : 'image' }))
    const [secShareOpen, setSecShareOpen] = useState(false)
    return (
      <div className="ibox" style={{ marginTop: '.9rem' }}>
        <div className="section-hdr"><span className="section-title">{title}</span></div>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="gmain">
            {curIsVid
              ? <video src={cur} controls style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#111' }} />
              : <img src={cur} alt={title} onClick={() => setLightbox({ items: mediaItems, idx })} />
            }
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem', marginTop: '.5rem' }}>
            <button onClick={() => downloadFile(cur)} className="btn btn-primary btn-sm">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v8M5 8l3 3 3-3"/><path d="M2 13h12"/></svg>
              Tải xuống
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setSecShareOpen(v => !v)} className="btn btn-primary btn-sm">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="3" cy="8" r="1.5"/><path d="M10.5 3.9L4.5 7.1M4.5 8.9l6 3.2"/></svg>
                Chia sẻ
              </button>
              {secShareOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setSecShareOpen(false)} />
                  <div style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.3rem', display: 'flex', flexDirection: 'column', gap: '.15rem', zIndex: 200, minWidth: 160, boxShadow: '0 4px 14px rgba(0,0,0,.18)' }}>
                    <button onClick={() => { shareToFacebook(cur); setSecShareOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.32rem .55rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
                      Chia sẻ Facebook
                    </button>
                    <button onClick={() => { shareToZalo(cur); setSecShareOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.32rem .55rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#0068FF"><rect width="24" height="24" rx="5"/><text x="3.5" y="17" fontSize="11" fontWeight="bold" fill="#fff">Z</text></svg>
                      Gửi qua Zalo
                    </button>
                    <div style={{ borderTop: '1px solid var(--bd)', margin: '.1rem 0' }} />
                    <button onClick={() => { copyLink(cur); setSecShareOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.32rem .55rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4"/><path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12"/></svg>
                      Sao chép link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {urls.length > 1 && (
          <div className="gthumbs">
            {urls.map((u, i) => (
              <div key={i} className={`gth${isVideo(u) ? ' gth-v' : ''}${i === idx ? ' active' : ''}`} onClick={() => i === idx ? setLightbox({ items: mediaItems, idx: i }) : setIdx(i)}>
                {isVideo(u) ? <video src={u} preload="metadata" /> : <img src={u} alt="" />}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Sticky header */}
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--mu)', display: 'flex', alignItems: 'center', gap: '.3rem', marginBottom: '.2rem' }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2l-4 3 4 3"/></svg>
            <span style={{ color: 'var(--green)', cursor: 'pointer' }} onClick={onBack}>{catName}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{product.name}</div>
        </div>
        <div style={{ display: 'flex', gap: '.45rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Quay lại</button>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => onEdit(product)}>Chỉnh sửa</button>}
        </div>
      </div>

      <div className="dwrap">
        {/* Gallery - centered max 500px */}
        <div style={{ marginBottom: '.9rem' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="gmain">
              {allMedia.length ? (
                allMedia[mainIdx]?.type === 'video'
                  ? <video src={allMedia[mainIdx].url} controls style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#111' }} />
                  : <img src={allMedia[mainIdx]?.url} alt={product.name} onClick={() => setLightbox({ items: allMedia, idx: mainIdx })} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--mu)', gap: '.5rem' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity=".2"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  <span style={{ fontSize: 12 }}>Chưa có ảnh/video</span>
                </div>
              )}
            </div>
          </div>
          {allMedia.length > 1 && (
            <div className="gthumbs">
              {allMedia.map((m, i) => (
                <div key={i} className={`gth${m.type === 'video' ? ' gth-v' : ''}${i === mainIdx ? ' active' : ''}`}
                  onClick={() => i === mainIdx ? setLightbox({ items: allMedia, idx: i }) : setMainIdx(i)}
                >
                  {m.type === 'video' ? <video src={m.url} preload="metadata" /> : <img src={m.url} alt="" />}
                </div>
              ))}
            </div>
          )}
          {allMedia.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem', marginTop: '.6rem' }}>
              <button onClick={() => downloadFile(allMedia[mainIdx].url)} className="btn btn-primary btn-sm">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v8M5 8l3 3 3-3"/><path d="M2 13h12"/></svg>
                Tải xuống
              </button>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShareOpen(v => !v)} className="btn btn-primary btn-sm">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="3" cy="8" r="1.5"/><path d="M10.5 3.9L4.5 7.1M4.5 8.9l6 3.2"/></svg>
                  Chia sẻ
                </button>
                {shareOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShareOpen(false)} />
                    <div style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.3rem', display: 'flex', flexDirection: 'column', gap: '.15rem', zIndex: 200, minWidth: 160, boxShadow: '0 4px 14px rgba(0,0,0,.18)' }}>
                      <button onClick={() => { shareToFacebook(allMedia[mainIdx].url); setShareOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.35rem .6rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
                        Chia sẻ Facebook
                      </button>
                      <button onClick={() => { shareToZalo(allMedia[mainIdx].url); setShareOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.35rem .6rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#0068FF"><rect width="24" height="24" rx="5"/><text x="3.5" y="17" fontSize="11" fontWeight="bold" fill="#fff">Z</text></svg>
                        Gửi qua Zalo
                      </button>
                      <div style={{ borderTop: '1px solid var(--bd)', margin: '.1rem 0' }} />
                      <button onClick={() => { copyLink(allMedia[mainIdx].url); setShareOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.35rem .6rem', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'calc(var(--r) - 2px)', fontSize: 12.5, color: 'var(--tx)', width: '100%', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4"/><path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12"/></svg>
                        Sao chép link
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Name / SKU row */}
        <div style={{ marginBottom: '.9rem', display: 'flex', alignItems: 'start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.6rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Mã: <b>{product.sku || '—'}</b>&nbsp;·&nbsp;ĐVT: <b>{product.unit || 'Cái'}</b></div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx)', margin: '.25rem 0', lineHeight: 1.25 }}>{product.name}</div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.3rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(product)}>Chỉnh sửa</button>
                <button className="btn btn-danger btn-sm" onClick={deleteProduct}>Xóa</button>
              </div>
            )}
          </div>
        </div>

        {/* dcols grid */}
        <div className="dcols">
          {/* Price block - full width */}
          <div className="price-block">
            <h3>Giá sản phẩm</h3>
            <div className="price-row">
              <div>
                <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: '.2rem', fontWeight: 500 }}>Giá niêm yết</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', lineHeight: 1.1 }}>{listed > 0 ? fmtPrice(listed) : '—'}</div>
                {disc > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.45rem' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, background: '#FEF0F0', color: 'var(--red)', borderRadius: 6, padding: '.2rem .6rem' }}>-{disc}%</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--mu)" strokeWidth="1.5"><path d="M3 7h8M7 3l4 4-4 4"/></svg>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Giá sau giảm</div>
                      <div className="price-final-lg">{fmtPrice(finalPrice)}</div>
                    </div>
                  </div>
                )}
              </div>
              {isAdmin && listed > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: '.4rem', fontWeight: 600 }}>Điều chỉnh giảm giá</div>
                  <div className="disc-control">
                    <label>Giảm</label>
                    <input type="number" value={disc} min={0} max={100} onChange={e => setDisc(+e.target.value)} />
                    <label>%</label>
                  </div>
                  {disc !== product.discount_pct && (
                    <button className="btn btn-primary btn-sm" onClick={saveDiscount} disabled={saving} style={{ marginTop: '.55rem' }}>
                      {saving ? 'Đang lưu...' : 'Lưu giảm giá'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Specs */}
          <div className="ibox">
            <h3>Thông số kỹ thuật</h3>
            {product.product_specs && product.product_specs.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['Tên sản phẩm', 'Cao', 'Nặng', 'Giá tiền'].map(h => (
                        <th key={h} style={{ padding: '.35rem .5rem', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600, borderBottom: '1px solid var(--bd)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {product.product_specs.map((s, i) => (
                      <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg)' : undefined }}>
                        <td style={{ padding: '.38rem .5rem', borderBottom: '1px solid var(--bd)' }}>{s.spec_name || '—'}</td>
                        <td style={{ padding: '.38rem .5rem', borderBottom: '1px solid var(--bd)' }}>{s.height || '—'}</td>
                        <td style={{ padding: '.38rem .5rem', borderBottom: '1px solid var(--bd)' }}>{s.weight || '—'}</td>
                        <td style={{ padding: '.38rem .5rem', borderBottom: '1px solid var(--bd)' }}>{s.price || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '.35rem 0', fontSize: 13, color: 'var(--mu)' }}>Chưa có thông số</div>
            )}
          </div>

          {/* Thông tin bán hàng */}
          <div className="ibox">
            <h3>Thông tin bán hàng</h3>
            {[
              ['Mã SP', product.sku || '—'],
              ['Đơn vị', product.unit || 'Cái'],
              ['Giá niêm yết', listed > 0 ? fmtPrice(listed) : '—'],
              ['Giảm giá', disc > 0 ? <span className="badge badge-red">-{disc}%</span> : '—'],
              ['Giá bán', <span style={{ color: 'var(--green)' }}>{listed > 0 ? fmtPrice(finalPrice) : '—'}</span>],
              ['Trạng thái', <span className={`badge ${statusClass(product.status)}`}>{statusLabel(product.status)}</span>],
            ].map(([l, v], i, arr) => (
              <div key={i} className="dr" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                <span className="drl">{l as string}</span>
                <span className="drv">{v as React.ReactNode}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {product.description && (
            <div className="ddesc">
              <h3>Mô tả sản phẩm</h3>
              <p>{product.description}</p>
            </div>
          )}
        </div>

        {/* Feedback media */}
        <MediaSection title="Ảnh / Video Feedback khách hàng" urls={product.feedback_media ?? []} idx={fbIdx} setIdx={setFbIdx} />

        {/* Related media */}
        <MediaSection title="Ảnh sản phẩm cùng loại tham khảo" urls={product.related_media ?? []} idx={relIdx} setIdx={setRelIdx} />
      </div>

      {lightbox && (
        <Lightbox items={lightbox.items} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}
