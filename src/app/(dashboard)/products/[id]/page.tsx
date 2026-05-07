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
              {p.images[0]
                ? <img src={p.images[0]} alt={p.name} />
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
              {p.sku && <div style={{ fontSize: 10.5, color: 'var(--mu)', marginBottom: '.18rem' }}>#{p.sku}</div>}
              {p.unit && <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: '.3rem' }}>{p.unit}</div>}
              {p.price_listed > 0 && (
                <div>
                  {p.discount_pct > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginBottom: '.1rem' }}>
                      <span style={{ fontSize: 11, color: 'var(--mu)', textDecoration: 'line-through' }}>{fmtPrice(p.price_listed)}</span>
                      <span className="badge badge-red" style={{ fontSize: 10 }}>-{p.discount_pct}%</span>
                    </div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>{fmtPrice(p.price_final)}</div>
                </div>
              )}
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
  const [lightbox, setLightbox] = useState<{ items: { url: string; type?: 'image' | 'video' }[]; idx: number } | null>(null)
  const [disc, setDisc] = useState(product.discount_pct)
  const [saving, setSaving] = useState(false)

  type MediaItem = { url: string; type?: 'image' | 'video' }
  const allMedia: MediaItem[] = [
    ...product.images.map(u => ({ url: u, type: 'image' as const })),
    ...product.videos.map(u => ({ url: u, type: 'video' as const }))
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

  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--mu)', display: 'flex', alignItems: 'center', gap: '.3rem', marginBottom: '.2rem', cursor: 'pointer' }} onClick={onBack}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2l-4 3 4 3"/></svg>
            <span style={{ color: 'var(--green)' }}>{catName}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{product.name}</div>
        </div>
        <div style={{ display: 'flex', gap: '.45rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Quay lại</button>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => onEdit(product)}>Chỉnh sửa</button>}
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={deleteProduct}>Xóa</button>}
        </div>
      </div>

      <div style={{ padding: '1.25rem 1.75rem', maxWidth: '100%' }}>
        {/* Gallery */}
        <div style={{ width: '100%', height: 400, borderRadius: 'var(--rl)', overflow: 'hidden', background: 'var(--bg)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: allMedia.length ? 'zoom-in' : 'default' }}
          onClick={() => allMedia.length && setLightbox({ items: allMedia, idx: mainIdx })}
        >
          {allMedia.length ? (
            allMedia[mainIdx]?.type === 'video'
              ? <video src={allMedia[mainIdx].url} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#111' }} controls />
              : <img src={allMedia[mainIdx]?.url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--mu)', gap: '.5rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              <span style={{ fontSize: 13 }}>Chưa có ảnh</span>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {allMedia.length > 1 && (
          <div style={{ display: 'flex', gap: '.45rem', marginTop: '.55rem', flexWrap: 'wrap' }}>
            {allMedia.map((m, i) => (
              <div key={i} onClick={() => setMainIdx(i)}
                style={{ width: 68, height: 68, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${i === mainIdx ? 'var(--green)' : 'transparent'}`, flexShrink: 0, background: 'var(--bg)', position: 'relative' }}
              >
                {m.type === 'video'
                  ? <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
              </div>
            ))}
          </div>
        )}

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.9rem', marginTop: '.9rem' }}>
          <div className="card" style={{ padding: '1rem 1.1rem' }}>
            <h3 style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '.8rem' }}>Thông tin cơ bản</h3>
            {[
              ['Tên sản phẩm', product.name],
              ['Mã SKU', product.sku || '—'],
              ['Danh mục', catName],
              ['Đơn vị', product.unit || '—'],
              ['Trạng thái', <span className={`badge ${statusClass(product.status)}`}>{statusLabel(product.status)}</span>]
            ].map(([l, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.45rem 0', borderBottom: i < 4 ? '1px solid var(--bd)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--mu)', fontWeight: 500 }}>{l as string}</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{v as React.ReactNode}</span>
              </div>
            ))}
          </div>

          {/* Price block */}
          <div className="card" style={{ padding: '1rem 1.1rem' }}>
            <h3 style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '.8rem' }}>Giá bán</h3>
            {product.price_listed > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem', marginBottom: '.75rem' }}>
                  <span style={{ fontSize: 14, color: 'var(--mu)', textDecoration: 'line-through' }}>{fmtPrice(product.price_listed)}</span>
                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 8, padding: '.4rem .65rem' }}>
                      <input type="number" value={disc} min={0} max={100} onChange={e => setDisc(+e.target.value)}
                        style={{ width: 48, border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--red)', outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--mu)' }}>% giảm</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginBottom: '.15rem' }}>{fmtPrice(finalPrice)}</div>
                {disc > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--mu)' }}>Tiết kiệm {fmtPrice(product.price_listed - finalPrice)}</div>
                )}
                {isAdmin && disc !== product.discount_pct && (
                  <button className="btn btn-primary btn-sm" onClick={saveDiscount} disabled={saving} style={{ marginTop: '.65rem' }}>
                    {saving ? 'Đang lưu...' : 'Lưu giảm giá'}
                  </button>
                )}
              </div>
            ) : <p style={{ color: 'var(--mu)', fontSize: 13 }}>Chưa có giá</p>}
          </div>
        </div>

        {/* Specs */}
        {product.product_specs && product.product_specs.length > 0 && (
          <div className="card" style={{ padding: '1rem 1.1rem', marginTop: '.9rem' }}>
            <h3 style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '.8rem' }}>Thông số kỹ thuật</h3>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tên SP</th><th>Cao</th><th>Nặng</th><th>Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {product.product_specs.map((s, i) => (
                    <tr key={i}>
                      <td>{s.spec_name}</td>
                      <td>{s.height || '—'}</td>
                      <td>{s.weight || '—'}</td>
                      <td>{s.price || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="card" style={{ padding: '1rem 1.1rem', marginTop: '.9rem' }}>
            <h3 style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '.6rem' }}>Mô tả</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.75 }}>{product.description}</p>
          </div>
        )}

        {/* Feedback media */}
        {product.feedback_media.length > 0 && (
          <div style={{ marginTop: '.9rem' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '.65rem' }}>Feedback khách hàng</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '.6rem' }}>
              {product.feedback_media.map((url, i) => {
                const isVid = /\.(mp4|mov|webm)$/i.test(url)
                return (
                  <div key={i} style={{ borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--bd)', aspectRatio: '1', position: 'relative', background: 'var(--bg)' }}
                    onClick={() => setLightbox({ items: product.feedback_media.map(u => ({ url: u })), idx: i })}
                  >
                    {isVid
                      ? <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    }
                    {isVid && <span className="mi-vid-badge">VIDEO</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Related media */}
        {product.related_media.length > 0 && (
          <div style={{ marginTop: '.9rem' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '.65rem' }}>Sản phẩm cùng loại tham khảo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '.75rem' }}>
              {product.related_media.map((url, i) => {
                const isVid = /\.(mp4|mov|webm)$/i.test(url)
                return (
                  <div key={i} style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => setLightbox({ items: product.related_media.map(u => ({ url: u })), idx: i })}
                  >
                    <div style={{ aspectRatio: '1', overflow: 'hidden' }}>
                      {isVid
                        ? <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox items={lightbox.items} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}
