'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadToMediaLibrary, deleteStorageFile } from '@/lib/upload'
import { Modal } from '@/components/ui/Modal'
import type { Product, ProductSpec, Category, MediaItem } from '@/lib/types'

interface ProductModalProps {
  product: Product | null
  catId?: string
  onClose: () => void
  onSaved: () => void
}

const emptySpec = (): ProductSpec => ({ spec_name: '', height: '', weight: '', price: '' })

export function ProductModal({ product, catId, onClose, onSaved }: ProductModalProps) {
  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? catId ?? '')
  const [unit, setUnit] = useState(product?.unit ?? '')
  const [priceListed, setPriceListed] = useState(product?.price_listed ?? 0)
  const [disc, setDisc] = useState(product?.discount_pct ?? 0)
  const [status, setStatus] = useState<'active' | 'draft' | 'out'>(product?.status ?? 'active')
  const [desc, setDesc] = useState(product?.description ?? '')
  const [specs, setSpecs] = useState<ProductSpec[]>(product?.product_specs?.length ? product.product_specs : [])
  const [existingImgs, setExistingImgs] = useState<string[]>(product?.images ?? [])
  const [existingVids, setExistingVids] = useState<string[]>(product?.videos ?? [])
  const [existingFb, setExistingFb] = useState<string[]>(product?.feedback_media ?? [])
  const [existingRel, setExistingRel] = useState<string[]>(product?.related_media ?? [])
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [libPickerField, setLibPickerField] = useState<'images' | 'videos' | 'feedback' | 'related' | null>(null)

  useEffect(() => {
    createClient().from('categories').select('*').order('sort_order').then(({ data }) => setCategories(data ?? []))
  }, [])

  const finalPrice = Math.round(priceListed * (1 - disc / 100))

  function addSpecRow() { setSpecs(s => [...s, emptySpec()]) }
  function removeSpec(i: number) { setSpecs(s => s.filter((_, idx) => idx !== i)) }
  function updateSpec(i: number, field: keyof ProductSpec, val: string) {
    setSpecs(s => s.map((sp, idx) => idx === i ? { ...sp, [field]: val } : sp))
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    setSaveError('')

    try {
      const supabase = createClient()
      const payload = {
        name: name.trim(), sku, category_id: categoryId || null, unit,
        price_listed: priceListed, discount_pct: disc, status, description: desc,
        images: existingImgs, videos: existingVids,
        feedback_media: existingFb, related_media: existingRel,
        updated_at: new Date().toISOString()
      }

      if (product) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id)
        if (error) throw error
        await supabase.from('product_specs').delete().eq('product_id', product.id)
        const filteredSpecs = specs.filter(s => s.spec_name)
        if (filteredSpecs.length) {
          await supabase.from('product_specs').insert(
            filteredSpecs.map((s, i) => ({ ...s, product_id: product.id, sort_order: i }))
          )
        }
      } else {
        const { data: newProd, error } = await supabase.from('products').insert(payload).select().single()
        if (error) throw error
        const filteredSpecs = specs.filter(s => s.spec_name)
        if (newProd && filteredSpecs.length) {
          await supabase.from('product_specs').insert(
            filteredSpecs.map((s, i) => ({ ...s, product_id: newProd.id, sort_order: i }))
          )
        }
      }

      setSaving(false)
      onSaved()
    } catch (err: unknown) {
      setSaving(false)
      const raw = err as Record<string, unknown>
      const msg = raw?.message as string
        || raw?.error_description as string
        || (err instanceof Error ? err.message : null)
        || 'Lỗi khi lưu. Vui lòng thử lại.'
      if (msg.includes('fetch') || msg.includes('URL') || msg.includes('supabase')) {
        setSaveError('Chưa kết nối Supabase. Vui lòng cấu hình .env.local trước khi lưu dữ liệu thật.')
      } else if (msg.includes('row-level security') || msg.includes('permission')) {
        setSaveError('Không có quyền thực hiện thao tác này. Vui lòng liên hệ admin.')
      } else {
        setSaveError(msg)
      }
    }
  }

  function onLibraryPick(urls: string[]) {
    if (libPickerField === 'images') setExistingImgs(v => [...v, ...urls.filter(u => !v.includes(u))])
    else if (libPickerField === 'videos') setExistingVids(v => [...v, ...urls.filter(u => !v.includes(u))])
    else if (libPickerField === 'feedback') setExistingFb(v => [...v, ...urls.filter(u => !v.includes(u))])
    else if (libPickerField === 'related') setExistingRel(v => [...v, ...urls.filter(u => !v.includes(u))])
    setLibPickerField(null)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
        confirmClose={!saving}
        footer={
          <>
            {saveError && (
              <div style={{ flex: 1, fontSize: 12, color: 'var(--red)', background: '#FEF0F0', border: '1px solid #F7C1C1', borderRadius: 8, padding: '.45rem .8rem', marginRight: '.5rem' }}>
                {saveError}
              </div>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
              {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
          <div className="fg" style={{ gridColumn: '1/-1' }}>
            <label>Tên sản phẩm *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên sản phẩm" />
          </div>
          <div className="fg">
            <label>Mã (SKU)</label>
            <input value={sku} onChange={e => setSku(e.target.value)} placeholder="AT-001" />
          </div>
          <div className="fg">
            <label>Danh mục</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">— Chọn danh mục —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Đơn vị tính</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Cái, Bộ..." />
          </div>
          <div className="fg">
            <label>Trạng thái</label>
            <select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
              <option value="active">Đang bán</option>
              <option value="draft">Nháp</option>
              <option value="out">Hết hàng</option>
            </select>
          </div>
          <div className="fg">
            <label>Giá niêm yết (đ)</label>
            <input type="number" value={priceListed || ''} onChange={e => setPriceListed(+e.target.value)} placeholder="350000" />
          </div>
          <div className="fg">
            <label>Giảm giá (%)</label>
            <input type="number" value={disc || ''} min={0} max={100} onChange={e => setDisc(+e.target.value)} placeholder="0" />
          </div>
          {priceListed > 0 && (
            <div className="fg" style={{ gridColumn: '1/-1' }}>
              <label>Giá bán sau giảm</label>
              <div style={{ background: 'var(--gl)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.55rem .85rem', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                {new Intl.NumberFormat('vi-VN').format(finalPrice)}đ
              </div>
            </div>
          )}
          <div className="fg" style={{ gridColumn: '1/-1' }}>
            <label>Mô tả</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả chi tiết..." />
          </div>
        </div>

        {/* Specs */}
        <div className="fg">
          <label>Thông số kỹ thuật</label>
          {specs.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 32px', gap: '.4rem', marginBottom: '.3rem' }}>
              {['Tên sản phẩm', 'Cao', 'Nặng', 'Giá tiền', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, color: 'var(--mu)', padding: '0 .2rem' }}>{h}</span>
              ))}
            </div>
          )}
          {specs.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 32px', gap: '.4rem', marginBottom: '.4rem' }}>
              {(['spec_name', 'height', 'weight', 'price'] as (keyof ProductSpec)[]).map(f => (
                <input key={f} value={s[f] as string} onChange={e => updateSpec(i, f, e.target.value)}
                  style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: '.5rem .65rem', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
                />
              ))}
              <button className="btn-icon danger" onClick={() => removeSpec(i)} style={{ fontSize: 14, height: 'auto' }}>×</button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm btn-full" onClick={addSpecRow} style={{ marginTop: '.25rem' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
            Thêm thông số
          </button>
        </div>

        <MediaField
          label="Ảnh sản phẩm"
          existing={existingImgs}
          onRemove={i => setExistingImgs(v => v.filter((_, idx) => idx !== i))}
          onLibrary={() => setLibPickerField('images')}
        />

        <MediaField
          label="Video sản phẩm"
          existing={existingVids}
          onRemove={i => setExistingVids(v => v.filter((_, idx) => idx !== i))}
          onLibrary={() => setLibPickerField('videos')}
        />

        <MediaField
          label="Ảnh / Video Feedback khách hàng"
          existing={existingFb}
          onRemove={i => setExistingFb(v => v.filter((_, idx) => idx !== i))}
          onLibrary={() => setLibPickerField('feedback')}
        />

        <MediaField
          label="Ảnh sản phẩm cùng loại tham khảo"
          existing={existingRel}
          onRemove={i => setExistingRel(v => v.filter((_, idx) => idx !== i))}
          onLibrary={() => setLibPickerField('related')}
        />
      </Modal>

      {libPickerField && (
        <MediaLibraryPicker
          onConfirm={onLibraryPick}
          onClose={() => setLibPickerField(null)}
        />
      )}
    </>
  )
}

function MediaField({ label, existing, onRemove, onLibrary }: {
  label: string
  existing: string[]
  onRemove: (i: number) => void
  onLibrary: () => void
}) {
  return (
    <div className="fg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.35rem' }}>
        <label style={{ margin: 0 }}>{label}</label>
        <button type="button" onClick={onLibrary}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', border: '1px solid var(--green)', borderRadius: 6, padding: '.18rem .55rem', fontSize: 11.5, fontWeight: 600, color: 'var(--green)', background: 'var(--gl)', cursor: 'pointer' }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
          Chọn từ Thư Viện
        </button>
      </div>
      {existing.length > 0 ? (
        <div className="preview-grid">
          {existing.map((url, i) => {
            const isVid = /\.(mp4|mov|webm)$/i.test(url)
            return (
              <div key={i} className="preview-item">
                {isVid ? <video src={url} /> : <img src={url} alt="" />}
                <button className="preview-remove" onClick={() => onRemove(i)}>×</button>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ border: '1.5px dashed var(--bd)', borderRadius: 'var(--r)', padding: '.9rem', textAlign: 'center', color: 'var(--mu)', fontSize: 12, background: 'var(--bg)' }}>
          Chưa có ảnh/video — nhấn &quot;Chọn từ Thư Viện&quot; để thêm
        </div>
      )}
    </div>
  )
}

function MediaLibraryPicker({ onConfirm, onClose }: {
  onConfirm: (urls: string[]) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    const { data } = await createClient()
      .from('media_items')
      .select('id, url, type, caption, album_id, sort_order, created_at')
      .order('created_at', { ascending: false })
      .limit(300)
    setItems(data ?? [])
    setLoading(false)
  }

  async function handleUpload(files: FileList) {
    if (!files.length) return
    setUploading(true)
    try {
      const { convertVideoToH264 } = await import('@/lib/videoConvert')
      const arr = Array.from(files)
      const processed: File[] = []
      for (let i = 0; i < arr.length; i++) {
        const file = arr[i]
        if (file.type.startsWith('video/')) {
          setUploadStatus(`Đang chuyển đổi video ${i + 1}/${arr.length}... 0%`)
          const converted = await convertVideoToH264(file, pct => {
            setUploadStatus(`Đang chuyển đổi video ${i + 1}/${arr.length}... ${pct}%`)
          })
          processed.push(converted)
        } else {
          processed.push(file)
        }
      }
      setUploadStatus(`Đang tải lên thư viện...`)
      await uploadToMediaLibrary(processed)
      await loadItems()
    } finally {
      setUploading(false)
      setUploadStatus('')
    }
  }

  async function deleteItem(item: MediaItem) {
    if (!confirm('Xóa ảnh/video này khỏi thư viện? Thao tác không thể hoàn tác.')) return
    const supabase = createClient()
    await supabase.from('media_items').delete().eq('url', item.url)
    await deleteStorageFile(item.url)
    setItems(v => v.filter(i => i.url !== item.url))
    setSelected(prev => { const s = new Set(prev); s.delete(item.url); return s })
  }

  function toggle(url: string) {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(url)) s.delete(url); else s.add(url)
      return s
    })
  }

  const UploadZone = ({ compact }: { compact?: boolean }) => (
    <label style={{
      display: 'flex', flexDirection: compact ? 'row' : 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '.4rem',
      borderRadius: 'var(--r)', padding: compact ? '.28rem .65rem' : '1.5rem',
      cursor: uploading ? 'not-allowed' : 'pointer',
      background: compact ? 'var(--gl)' : 'var(--bg)',
      color: compact ? 'var(--green)' : 'var(--mu)',
      fontSize: compact ? 11.5 : 13, fontWeight: compact ? 600 : 400,
      opacity: uploading ? 0.7 : 1,
      border: compact ? '1px solid var(--green)' : '1.5px dashed var(--bd)',
    } as React.CSSProperties}>
      <input type="file" accept="image/*,video/*" multiple
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
        disabled={uploading}
        onChange={e => e.target.files && handleUpload(e.target.files)} />
      {!compact && (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      )}
      {compact && (
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
      )}
      {uploading
        ? (uploadStatus || (compact ? 'Đang xử lý...' : 'Đang xử lý...'))
        : compact ? 'Tải ảnh/video lên thư viện' : 'Click hoặc kéo thả ảnh/video để tải lên thư viện'
      }
    </label>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={`Chọn ảnh/video từ Thư Viện${selected.size ? ` (${selected.size} đã chọn)` : ''}`}
      maxWidth={660}
      scrollable
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={() => onConfirm(Array.from(selected))} disabled={selected.size === 0}>
            Thêm {selected.size || ''} file vào đây
          </button>
        </>
      }
    >
      {uploading && uploadStatus && (
        <div style={{ marginBottom: '.6rem', background: '#E6F4EE', border: '1px solid #A3D9C3', borderRadius: 'var(--r)', padding: '.45rem .7rem', fontSize: 12, color: '#085041', fontWeight: 600 }}>
          ⏳ {uploadStatus}
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--mu)', fontSize: 13 }}>Đang tải thư viện...</div>
      ) : items.length === 0 && !uploading ? (
        <div>
          <div style={{ textAlign: 'center', padding: '1rem 0 .75rem', color: 'var(--mu)', fontSize: 13 }}>
            Thư viện chưa có ảnh/video nào. Hãy tải lên để tiếp tục.
          </div>
          <div style={{ position: 'relative' }}>
            <UploadZone />
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.65rem', gap: '.5rem' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>
              Click để chọn/bỏ chọn. Đã chọn <strong>{selected.size}</strong> / {items.length} file.
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <UploadZone compact />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: '.45rem' }}>
            {items.map(it => {
              const isVid = it.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(it.url)
              const isSel = selected.has(it.url)
              return (
                <div key={it.id}
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--bg)', border: isSel ? '2.5px solid var(--green)' : '2.5px solid transparent', transition: 'border-color .12s' }}>
                  <div onClick={() => toggle(it.url)} style={{ width: '100%', height: '100%', cursor: 'pointer' }}>
                    {isVid
                      ? <video src={it.url} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <img src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={it.caption ?? ''} />
                    }
                  </div>
                  {isVid && (
                    <span style={{ position: 'absolute', bottom: 3, left: 3, background: 'rgba(0,0,0,.62)', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '2px 4px', pointerEvents: 'none' }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><polygon points="4,2 14,8 4,14"/></svg>
                    </span>
                  )}
                  {isSel && (
                    <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.3)', pointerEvents: 'none' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M2 5l2.5 2.5L8 3"/></svg>
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); deleteItem(it) }}
                    title="Xóa khỏi thư viện"
                    style={{ position: 'absolute', bottom: 3, right: 3, width: 20, height: 20, background: 'rgba(200,30,30,.85)', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 3h8M5 3V2h2v1M4 3l.6 7h2.8L8 3"/></svg>
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Modal>
  )
}
